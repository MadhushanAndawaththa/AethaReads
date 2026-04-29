package handlers

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"net/url"
	"strings"
	"time"

	"aetha-backend/internal/config"
	"aetha-backend/internal/email"
	"aetha-backend/internal/middleware"
	"aetha-backend/internal/models"
	"aetha-backend/internal/repository"

	"github.com/gofiber/fiber/v2"
	"github.com/redis/go-redis/v9"
)

const pwResetTTL = 15 * time.Minute
const emailVerificationTTL = 24 * time.Hour

type AuthHandler struct {
	userRepo *repository.UserRepository
	cfg      *config.AuthConfig
	rdb      *redis.Client
	emailSvc *email.Service
	auditRepo *repository.AuditRepository
}

func NewAuthHandler(ur *repository.UserRepository, cfg *config.AuthConfig, rdb *redis.Client, emailSvc *email.Service, auditRepo *repository.AuditRepository) *AuthHandler {
	return &AuthHandler{userRepo: ur, cfg: cfg, rdb: rdb, emailSvc: emailSvc, auditRepo: auditRepo}
}

// POST /api/auth/register
func (h *AuthHandler) Register(c *fiber.Ctx) error {
	var req models.RegisterRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(models.ErrorResponse{Error: "Invalid request body"})
	}

	req.Email = strings.TrimSpace(strings.ToLower(req.Email))
	req.Username = strings.TrimSpace(req.Username)

	// Validate
	if req.Email == "" || req.Username == "" || req.Password == "" {
		return c.Status(400).JSON(models.ErrorResponse{Error: "Email, username, and password are required"})
	}
	if len(req.Password) < 8 {
		return c.Status(400).JSON(models.ErrorResponse{Error: "Password must be at least 8 characters"})
	}
	if len(req.Username) < 3 || len(req.Username) > 30 {
		return c.Status(400).JSON(models.ErrorResponse{Error: "Username must be 3-30 characters"})
	}

	// Check uniqueness
	if _, err := h.userRepo.GetByEmail(c.Context(), req.Email); err == nil {
		return c.Status(409).JSON(models.ErrorResponse{Error: "Email already registered"})
	}
	if _, err := h.userRepo.GetByUsername(c.Context(), req.Username); err == nil {
		return c.Status(409).JSON(models.ErrorResponse{Error: "Username already taken"})
	}

	user, err := h.userRepo.Create(c.Context(), &req)
	if err != nil {
		log.Printf("register error: %v", err)
		return c.Status(500).JSON(models.ErrorResponse{Error: "Failed to create account"})
	}

	if token, err := h.userRepo.CreateEmailVerificationToken(c.Context(), user.ID, emailVerificationTTL); err == nil {
		go h.sendVerificationEmail(user.Email, user.DisplayName, token)
	} else {
		log.Printf("register verification token error: %v", err)
	}
	h.audit(user.ID, "auth.register", "user", user.ID, map[string]any{"email": user.Email})

	return h.issueTokens(c, user)
}

// POST /api/auth/login
func (h *AuthHandler) Login(c *fiber.Ctx) error {
	var req models.LoginRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(models.ErrorResponse{Error: "Invalid request body"})
	}

	req.Email = strings.TrimSpace(strings.ToLower(req.Email))
	ip := c.IP()

	if !middleware.CheckLoginAllowed(c.Context(), h.rdb, req.Email, ip) {
		return c.Status(429).JSON(models.ErrorResponse{Error: "Too many failed login attempts. Please try again in 15 minutes."})
	}

	user, err := h.userRepo.GetByEmail(c.Context(), req.Email)
	if err != nil {
		middleware.RecordFailedLogin(c.Context(), h.rdb, req.Email, ip)
		h.audit("", "auth.login_failed", "user", "", map[string]any{"email": req.Email, "ip": ip})
		return c.Status(401).JSON(models.ErrorResponse{Error: "Invalid email or password"})
	}

	if !h.userRepo.CheckPassword(user, req.Password) {
		middleware.RecordFailedLogin(c.Context(), h.rdb, req.Email, ip)
		h.audit(user.ID, "auth.login_failed", "user", user.ID, map[string]any{"ip": ip})
		return c.Status(401).JSON(models.ErrorResponse{Error: "Invalid email or password"})
	}
	if err := h.userRepo.EnsureCanAuthenticate(user); err != nil {
		return c.Status(403).JSON(models.ErrorResponse{Error: err.Error()})
	}

	middleware.ClearLoginAttempts(c.Context(), h.rdb, req.Email, ip)
	h.audit(user.ID, "auth.login", "user", user.ID, map[string]any{"ip": ip})
	return h.issueTokens(c, user)
}

// GET /api/auth/google — redirect to Google OAuth consent screen
func (h *AuthHandler) GoogleRedirect(c *fiber.Ctx) error {
	if h.cfg.GoogleClientID == "" {
		return c.Status(501).JSON(models.ErrorResponse{Error: "Google OAuth not configured"})
	}
	params := url.Values{
		"client_id":     {h.cfg.GoogleClientID},
		"redirect_uri":  {h.cfg.GoogleRedirectURL},
		"response_type": {"code"},
		"scope":         {"openid email profile"},
		"access_type":   {"offline"},
	}
	return c.Redirect("https://accounts.google.com/o/oauth2/v2/auth?" + params.Encode())
}

// GET /api/auth/google/callback — exchange code for tokens
func (h *AuthHandler) GoogleCallback(c *fiber.Ctx) error {
	code := c.Query("code")
	if code == "" {
		return c.Status(400).JSON(models.ErrorResponse{Error: "Missing authorization code"})
	}

	// Exchange code for token
	tokenResp, err := http.PostForm("https://oauth2.googleapis.com/token", url.Values{
		"code":          {code},
		"client_id":     {h.cfg.GoogleClientID},
		"client_secret": {h.cfg.GoogleClientSecret},
		"redirect_uri":  {h.cfg.GoogleRedirectURL},
		"grant_type":    {"authorization_code"},
	})
	if err != nil {
		log.Printf("google token exchange error: %v", err)
		return c.Status(500).JSON(models.ErrorResponse{Error: "Failed to authenticate with Google"})
	}
	defer tokenResp.Body.Close()

	body, _ := io.ReadAll(tokenResp.Body)
	var tokenData struct {
		AccessToken string `json:"access_token"`
		IDToken     string `json:"id_token"`
	}
	if err := json.Unmarshal(body, &tokenData); err != nil || tokenData.AccessToken == "" {
		return c.Status(500).JSON(models.ErrorResponse{Error: "Failed to parse Google response"})
	}

	// Fetch user info
	req, _ := http.NewRequest("GET", "https://www.googleapis.com/oauth2/v2/userinfo", nil)
	req.Header.Set("Authorization", "Bearer "+tokenData.AccessToken)
	client := &http.Client{Timeout: 10 * time.Second}
	infoResp, err := client.Do(req)
	if err != nil {
		return c.Status(500).JSON(models.ErrorResponse{Error: "Failed to fetch Google user info"})
	}
	defer infoResp.Body.Close()

	var googleUser struct {
		ID      string `json:"id"`
		Email   string `json:"email"`
		Name    string `json:"name"`
		Picture string `json:"picture"`
	}
	if err := json.NewDecoder(infoResp.Body).Decode(&googleUser); err != nil {
		return c.Status(500).JSON(models.ErrorResponse{Error: "Failed to parse user info"})
	}

	user, err := h.userRepo.FindOrCreateOAuth(c.Context(), "google", googleUser.ID, googleUser.Email, googleUser.Name, googleUser.Picture)
	if err != nil {
		log.Printf("google oauth user error: %v", err)
		return c.Status(500).JSON(models.ErrorResponse{Error: "Failed to create account"})
	}
	if err := h.userRepo.EnsureCanAuthenticate(user); err != nil {
		return c.Status(403).JSON(models.ErrorResponse{Error: err.Error()})
	}
	h.audit(user.ID, "auth.oauth_login", "user", user.ID, map[string]any{"provider": "google"})

	// After OAuth, redirect to frontend with user logged in
	if err := h.setTokenCookies(c, user); err != nil {
		return c.Status(500).JSON(models.ErrorResponse{Error: "Failed to issue tokens"})
	}
	return c.Redirect(fmt.Sprintf("%s/auth/callback", h.cfg.FrontendURL))
}

// POST /api/auth/refresh — rotate refresh token
func (h *AuthHandler) Refresh(c *fiber.Ctx) error {
	refreshToken := c.Cookies("refresh_token")
	if refreshToken == "" {
		return c.Status(401).JSON(models.ErrorResponse{Error: "No refresh token"})
	}

	user, err := h.userRepo.ValidateRefreshToken(c.Context(), refreshToken)
	if err != nil {
		return c.Status(401).JSON(models.ErrorResponse{Error: "Invalid or expired refresh token"})
	}
	if err := h.userRepo.EnsureCanAuthenticate(user); err != nil {
		return c.Status(403).JSON(models.ErrorResponse{Error: err.Error()})
	}

	return h.issueTokens(c, user)
}

// POST /api/auth/logout
func (h *AuthHandler) Logout(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	if userID != "" {
		_ = h.userRepo.RevokeAllRefreshTokens(c.Context(), userID)
		h.audit(userID, "auth.logout", "user", userID, nil)
	}

	// Clear cookies
	accessCookie := &fiber.Cookie{
		Name:     "access_token",
		Value:    "",
		Expires:  time.Now().Add(-1 * time.Hour),
		HTTPOnly: true,
		Secure:   h.cfg.CookieSecure,
		SameSite: "Lax",
		Path:     "/",
	}
	refreshCookie := &fiber.Cookie{
		Name:     "refresh_token",
		Value:    "",
		Expires:  time.Now().Add(-1 * time.Hour),
		HTTPOnly: true,
		Secure:   h.cfg.CookieSecure,
		SameSite: "Lax",
		Path:     "/",
	}
	if h.cfg.CookieDomain != "" {
		accessCookie.Domain = h.cfg.CookieDomain
		refreshCookie.Domain = h.cfg.CookieDomain
	}
	c.Cookie(accessCookie)
	c.Cookie(refreshCookie)

	return c.JSON(fiber.Map{"message": "Logged out"})
}

// GET /api/auth/me — return current user
func (h *AuthHandler) GetMe(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	user, err := h.userRepo.GetByID(c.Context(), userID)
	if err != nil {
		return c.Status(401).JSON(models.ErrorResponse{Error: "User not found"})
	}

	return c.JSON(models.AuthResponse{
		User:      toPublicUser(user),
		CSRFToken: middleware.GenerateCSRFToken(user.ID, h.cfg.JWTSecret),
	})
}

// POST /api/auth/forgot-password
func (h *AuthHandler) ForgotPassword(c *fiber.Ctx) error {
	var req models.ForgotPasswordRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(models.ErrorResponse{Error: "Invalid request body"})
	}
	req.Email = strings.TrimSpace(strings.ToLower(req.Email))
	if req.Email == "" {
		return c.Status(400).JSON(models.ErrorResponse{Error: "Email is required"})
	}

	// Always respond with the same message to prevent email enumeration
	user, err := h.userRepo.GetByEmail(c.Context(), req.Email)
	if err == nil && user.PasswordHash != nil {
		token, err := h.createPasswordResetToken(c.Context(), user.ID)
		if err == nil {
			go h.sendPasswordResetEmail(user.Email, user.DisplayName, token)
			h.audit(user.ID, "auth.password_reset_requested", "user", user.ID, nil)
		}
	}

	return c.JSON(fiber.Map{"message": "If this email is registered, a password reset link has been sent."})
}

// POST /api/auth/reset-password
func (h *AuthHandler) ResetPassword(c *fiber.Ctx) error {
	var req models.ResetPasswordRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(models.ErrorResponse{Error: "Invalid request body"})
	}
	if req.Token == "" || req.Password == "" {
		return c.Status(400).JSON(models.ErrorResponse{Error: "Token and password are required"})
	}
	if len(req.Password) < 8 {
		return c.Status(400).JSON(models.ErrorResponse{Error: "Password must be at least 8 characters"})
	}

	userID, err := h.consumePasswordResetToken(c.Context(), req.Token)
	if err != nil {
		return c.Status(400).JSON(models.ErrorResponse{Error: "Invalid or expired reset token"})
	}

	if err := h.userRepo.UpdatePassword(c.Context(), userID, req.Password); err != nil {
		log.Printf("reset password error: %v", err)
		return c.Status(500).JSON(models.ErrorResponse{Error: "Failed to update password"})
	}

	// Revoke all sessions for security
	_ = h.userRepo.RevokeAllRefreshTokens(c.Context(), userID)
	h.audit(userID, "auth.password_reset_completed", "user", userID, nil)

	return c.JSON(fiber.Map{"message": "Password updated successfully. Please log in with your new password."})
}

// POST /api/auth/verify-email
func (h *AuthHandler) VerifyEmail(c *fiber.Ctx) error {
	var req models.VerifyEmailRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(models.ErrorResponse{Error: "Invalid request body"})
	}
	if strings.TrimSpace(req.Token) == "" {
		return c.Status(400).JSON(models.ErrorResponse{Error: "Token is required"})
	}

	userID, err := h.userRepo.ConsumeEmailVerificationToken(c.Context(), req.Token)
	if err != nil {
		return c.Status(400).JSON(models.ErrorResponse{Error: "Invalid or expired verification token"})
	}
	if err := h.userRepo.MarkEmailVerified(c.Context(), userID); err != nil {
		return c.Status(500).JSON(models.ErrorResponse{Error: "Failed to verify email"})
	}
	h.audit(userID, "auth.email_verified", "user", userID, nil)

	return c.JSON(fiber.Map{"message": "Email verified successfully."})
}

// POST /api/auth/resend-verification
func (h *AuthHandler) ResendVerification(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	user, err := h.userRepo.GetByID(c.Context(), userID)
	if err != nil {
		return c.Status(404).JSON(models.ErrorResponse{Error: "User not found"})
	}
	if user.EmailVerified || user.PasswordHash == nil {
		return c.JSON(fiber.Map{"message": "Email verification is already complete."})
	}

	token, err := h.userRepo.CreateEmailVerificationToken(c.Context(), user.ID, emailVerificationTTL)
	if err != nil {
		log.Printf("resend verification token error: %v", err)
		return c.Status(500).JSON(models.ErrorResponse{Error: "Failed to send verification email"})
	}
	go h.sendVerificationEmail(user.Email, user.DisplayName, token)
	h.audit(user.ID, "auth.email_verification_resent", "user", user.ID, nil)

	return c.JSON(fiber.Map{"message": "Verification email sent."})
}

// POST /api/user/password
func (h *AuthHandler) ChangePassword(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	var req models.ChangePasswordRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(models.ErrorResponse{Error: "Invalid request body"})
	}
	if strings.TrimSpace(req.CurrentPassword) == "" || strings.TrimSpace(req.NewPassword) == "" {
		return c.Status(400).JSON(models.ErrorResponse{Error: "Current and new password are required"})
	}
	if len(req.NewPassword) < 8 {
		return c.Status(400).JSON(models.ErrorResponse{Error: "Password must be at least 8 characters"})
	}

	user, err := h.userRepo.GetByID(c.Context(), userID)
	if err != nil {
		return c.Status(404).JSON(models.ErrorResponse{Error: "User not found"})
	}
	if user.PasswordHash == nil {
		return c.Status(400).JSON(models.ErrorResponse{Error: "Password changes are unavailable for this account"})
	}
	if !h.userRepo.CheckPassword(user, req.CurrentPassword) {
		return c.Status(401).JSON(models.ErrorResponse{Error: "Current password is incorrect"})
	}
	if err := h.userRepo.UpdatePassword(c.Context(), userID, req.NewPassword); err != nil {
		return c.Status(500).JSON(models.ErrorResponse{Error: "Failed to update password"})
	}
	_ = h.userRepo.RevokeAllRefreshTokens(c.Context(), userID)
	h.audit(userID, "auth.password_changed", "user", userID, nil)

	return c.JSON(fiber.Map{"message": "Password changed successfully."})
}

// ===================== Internal helpers =====================

func (h *AuthHandler) issueTokens(c *fiber.Ctx, user *models.User) error {
	if err := h.setTokenCookies(c, user); err != nil {
		return c.Status(500).JSON(models.ErrorResponse{Error: "Failed to generate tokens"})
	}

	accessToken, _ := middleware.GenerateAccessToken(user, h.cfg)
	csrfToken := middleware.GenerateCSRFToken(user.ID, h.cfg.JWTSecret)

	return c.JSON(models.AuthResponse{
		User:        toPublicUser(user),
		AccessToken: accessToken,
		CSRFToken:   csrfToken,
	})
}

func (h *AuthHandler) setTokenCookies(c *fiber.Ctx, user *models.User) error {
	accessToken, err := middleware.GenerateAccessToken(user, h.cfg)
	if err != nil {
		return err
	}

	refreshToken, err := h.userRepo.CreateRefreshToken(c.Context(), user.ID, h.cfg.RefreshTokenExpiry)
	if err != nil {
		return err
	}

	accessCookie := &fiber.Cookie{
		Name:     "access_token",
		Value:    accessToken,
		Expires:  time.Now().Add(h.cfg.AccessTokenExpiry),
		HTTPOnly: true,
		Secure:   h.cfg.CookieSecure,
		SameSite: "Lax",
		Path:     "/",
	}
	refreshCookie := &fiber.Cookie{
		Name:     "refresh_token",
		Value:    refreshToken,
		Expires:  time.Now().Add(h.cfg.RefreshTokenExpiry),
		HTTPOnly: true,
		Secure:   h.cfg.CookieSecure,
		SameSite: "Lax",
		Path:     "/",
	}
	if h.cfg.CookieDomain != "" {
		accessCookie.Domain = h.cfg.CookieDomain
		refreshCookie.Domain = h.cfg.CookieDomain
	}

	c.Cookie(accessCookie)
	c.Cookie(refreshCookie)

	return nil
}

func toPublicUser(u *models.User) models.UserPublic {
	return models.UserPublic{
		ID:          u.ID,
		Username:    u.Username,
		DisplayName: u.DisplayName,
		AvatarURL:   u.AvatarURL,
		Role:        u.Role,
		Bio:         u.Bio,
		EmailVerified: u.EmailVerified,
		CreatedAt:   u.CreatedAt,
	}
}

// ===================== Password reset helpers =====================

func pwResetHashKey(rawToken string) string {
	h := sha256.Sum256([]byte(rawToken))
	return "pwreset:" + hex.EncodeToString(h[:])
}

func pwResetUserKey(userID string) string {
	return "pwreset:user:" + userID
}

func (h *AuthHandler) createPasswordResetToken(ctx context.Context, userID string) (string, error) {
	// Invalidate any previous token for this user
	if oldHash, err := h.rdb.Get(ctx, pwResetUserKey(userID)).Result(); err == nil {
		h.rdb.Del(ctx, "pwreset:"+oldHash) //nolint:errcheck
	}

	rawBytes := make([]byte, 32)
	if _, err := rand.Read(rawBytes); err != nil {
		return "", err
	}
	rawToken := hex.EncodeToString(rawBytes)

	pipe := h.rdb.Pipeline()
	pipe.Set(ctx, pwResetHashKey(rawToken), userID, pwResetTTL)
	hashHex := hex.EncodeToString(func() []byte { s := sha256.Sum256([]byte(rawToken)); return s[:] }())
	pipe.Set(ctx, pwResetUserKey(userID), hashHex, pwResetTTL)
	if _, err := pipe.Exec(ctx); err != nil {
		return "", err
	}

	return rawToken, nil
}

func (h *AuthHandler) consumePasswordResetToken(ctx context.Context, rawToken string) (string, error) {
	key := pwResetHashKey(rawToken)
	userID, err := h.rdb.Get(ctx, key).Result()
	if err != nil {
		return "", fmt.Errorf("invalid or expired token")
	}

	// One-time use: delete both keys atomically
	pipe := h.rdb.Pipeline()
	pipe.Del(ctx, key)
	pipe.Del(ctx, pwResetUserKey(userID))
	pipe.Exec(ctx) //nolint:errcheck

	return userID, nil
}

func (h *AuthHandler) sendPasswordResetEmail(to, name, rawToken string) {
	resetURL := fmt.Sprintf("%s/auth/reset-password?token=%s", h.cfg.FrontendURL, url.QueryEscape(rawToken))
	subject := "Reset your AethaReads password"
	body := fmt.Sprintf(`Hi %s,

We received a request to reset the password for your AethaReads account.

Click the link below to set a new password (valid for 15 minutes):
%s

If you did not request a password reset, you can safely ignore this email.

— The AethaReads Team`, name, resetURL)

	if err := h.emailSvc.Send(to, subject, body); err != nil {
		log.Printf("failed to send password reset email to %s: %v", to, err)
	}
}

func (h *AuthHandler) sendVerificationEmail(to, name, rawToken string) {
	verifyURL := fmt.Sprintf("%s/auth/verify-email?token=%s", h.cfg.FrontendURL, url.QueryEscape(rawToken))
	subject := "Verify your AethaReads email"
	body := fmt.Sprintf(`Hi %s,

Welcome to AethaReads.

Verify your email address by opening the link below:
%s

This link is valid for 24 hours.

You can still browse and read without verification, but community actions require a verified email.

— The AethaReads Team`, name, verifyURL)

	if err := h.emailSvc.Send(to, subject, body); err != nil {
		log.Printf("failed to send verification email to %s: %v", to, err)
	}
}

func (h *AuthHandler) audit(actorID, action, resourceType, resourceID string, details map[string]any) {
	if h.auditRepo == nil {
		return
	}
	var actorPtr *string
	var resourcePtr *string
	if strings.TrimSpace(actorID) != "" {
		actorPtr = &actorID
	}
	if strings.TrimSpace(resourceID) != "" {
		resourcePtr = &resourceID
	}
	if err := h.auditRepo.LogAction(context.Background(), actorPtr, action, resourceType, resourcePtr, details); err != nil {
		log.Printf("audit log error: %v", err)
	}
}
