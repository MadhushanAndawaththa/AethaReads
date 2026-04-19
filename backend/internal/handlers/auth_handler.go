package handlers

import (
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"net/url"
	"strings"
	"time"

	"aetha-backend/internal/config"
	"aetha-backend/internal/middleware"
	"aetha-backend/internal/models"
	"aetha-backend/internal/repository"

	"github.com/gofiber/fiber/v2"
)

type AuthHandler struct {
	userRepo *repository.UserRepository
	cfg      *config.AuthConfig
}

func NewAuthHandler(ur *repository.UserRepository, cfg *config.AuthConfig) *AuthHandler {
	return &AuthHandler{userRepo: ur, cfg: cfg}
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

	return h.issueTokens(c, user)
}

// POST /api/auth/login
func (h *AuthHandler) Login(c *fiber.Ctx) error {
	var req models.LoginRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(models.ErrorResponse{Error: "Invalid request body"})
	}

	req.Email = strings.TrimSpace(strings.ToLower(req.Email))

	user, err := h.userRepo.GetByEmail(c.Context(), req.Email)
	if err != nil {
		return c.Status(401).JSON(models.ErrorResponse{Error: "Invalid email or password"})
	}

	if !h.userRepo.CheckPassword(user, req.Password) {
		return c.Status(401).JSON(models.ErrorResponse{Error: "Invalid email or password"})
	}

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

	// After OAuth, redirect to frontend with user logged in
	if err := h.setTokenCookies(c, user); err != nil {
		return c.Status(500).JSON(models.ErrorResponse{Error: "Failed to issue tokens"})
	}
	return c.Redirect(fmt.Sprintf("%s/auth/callback", c.Query("redirect", "http://localhost:3000")))
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

	return h.issueTokens(c, user)
}

// POST /api/auth/logout
func (h *AuthHandler) Logout(c *fiber.Ctx) error {
	userID := middleware.GetUserID(c)
	if userID != "" {
		_ = h.userRepo.RevokeAllRefreshTokens(c.Context(), userID)
	}

	// Clear cookies
	c.Cookie(&fiber.Cookie{
		Name:     "access_token",
		Value:    "",
		Expires:  time.Now().Add(-1 * time.Hour),
		HTTPOnly: true,
		Secure:   h.cfg.CookieSecure,
		SameSite: "Lax",
		Domain:   h.cfg.CookieDomain,
		Path:     "/",
	})
	c.Cookie(&fiber.Cookie{
		Name:     "refresh_token",
		Value:    "",
		Expires:  time.Now().Add(-1 * time.Hour),
		HTTPOnly: true,
		Secure:   h.cfg.CookieSecure,
		SameSite: "Lax",
		Domain:   h.cfg.CookieDomain,
		Path:     "/",
	})

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
		User: toPublicUser(user),
	})
}

// ===================== Internal helpers =====================

func (h *AuthHandler) issueTokens(c *fiber.Ctx, user *models.User) error {
	if err := h.setTokenCookies(c, user); err != nil {
		return c.Status(500).JSON(models.ErrorResponse{Error: "Failed to generate tokens"})
	}

	accessToken, _ := middleware.GenerateAccessToken(user, h.cfg)

	return c.JSON(models.AuthResponse{
		User:        toPublicUser(user),
		AccessToken: accessToken,
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

	c.Cookie(&fiber.Cookie{
		Name:     "access_token",
		Value:    accessToken,
		Expires:  time.Now().Add(h.cfg.AccessTokenExpiry),
		HTTPOnly: true,
		Secure:   h.cfg.CookieSecure,
		SameSite: "Lax",
		Domain:   h.cfg.CookieDomain,
		Path:     "/",
	})
	c.Cookie(&fiber.Cookie{
		Name:     "refresh_token",
		Value:    refreshToken,
		Expires:  time.Now().Add(h.cfg.RefreshTokenExpiry),
		HTTPOnly: true,
		Secure:   h.cfg.CookieSecure,
		SameSite: "Lax",
		Domain:   h.cfg.CookieDomain,
		Path:     "/",
	})

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
		CreatedAt:   u.CreatedAt,
	}
}
