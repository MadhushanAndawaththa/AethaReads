package repository

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"strconv"
	"strings"
	"time"

	"aetha-backend/internal/models"

	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
	"golang.org/x/crypto/bcrypt"
)

type UserRepository struct {
	db *sqlx.DB
}

func NewUserRepository(db *sqlx.DB) *UserRepository {
	return &UserRepository{db: db}
}

// ===================== User CRUD =====================

func (r *UserRepository) Create(ctx context.Context, req *models.RegisterRequest) (*models.User, error) {
	id := uuid.New().String()
	hash, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		return nil, err
	}
	hashStr := string(hash)

	user := &models.User{}
	err = r.db.GetContext(ctx, user, `
		INSERT INTO users (id, email, username, display_name, password_hash, role)
		VALUES ($1, $2, $3, $4, $5, 'reader')
		RETURNING *`, id, req.Email, req.Username, req.Username, hashStr)
	return user, err
}

func (r *UserRepository) GetByID(ctx context.Context, id string) (*models.User, error) {
	user := &models.User{}
	err := r.db.GetContext(ctx, user, "SELECT * FROM users WHERE id = $1 AND deleted_at IS NULL", id)
	return user, err
}

func (r *UserRepository) GetByEmail(ctx context.Context, email string) (*models.User, error) {
	user := &models.User{}
	err := r.db.GetContext(ctx, user, "SELECT * FROM users WHERE email = $1 AND deleted_at IS NULL", email)
	return user, err
}

func (r *UserRepository) GetByUsername(ctx context.Context, username string) (*models.User, error) {
	user := &models.User{}
	err := r.db.GetContext(ctx, user, "SELECT * FROM users WHERE username = $1 AND deleted_at IS NULL", username)
	return user, err
}

func (r *UserRepository) UpdateRole(ctx context.Context, userID, role string) error {
	_, err := r.db.ExecContext(ctx, "UPDATE users SET role = $1, updated_at = NOW() WHERE id = $2", role, userID)
	return err
}

func (r *UserRepository) UpdatePassword(ctx context.Context, userID, newPassword string) error {
	hash, err := bcrypt.GenerateFromPassword([]byte(newPassword), bcrypt.DefaultCost)
	if err != nil {
		return err
	}
	_, err = r.db.ExecContext(ctx,
		"UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2",
		string(hash), userID)
	return err
}

func (r *UserRepository) UpdateProfile(ctx context.Context, userID string, req *models.UpdateUserProfileRequest) (*models.User, error) {
	sets := []string{}
	args := []any{}
	idx := 1

	if req.DisplayName != nil {
		sets = append(sets, "display_name = $"+strconv.Itoa(idx))
		args = append(args, strings.TrimSpace(*req.DisplayName))
		idx++
	}
	if req.AvatarURL != nil {
		sets = append(sets, "avatar_url = $"+strconv.Itoa(idx))
		args = append(args, strings.TrimSpace(*req.AvatarURL))
		idx++
	}
	if req.Bio != nil {
		sets = append(sets, "bio = $"+strconv.Itoa(idx))
		args = append(args, strings.TrimSpace(*req.Bio))
		idx++
	}

	if len(sets) > 0 {
		sets = append(sets, "updated_at = NOW()")
		query := "UPDATE users SET " + strings.Join(sets, ", ") + " WHERE id = $" + strconv.Itoa(idx)
		args = append(args, userID)
		if _, err := r.db.ExecContext(ctx, query, args...); err != nil {
			return nil, err
		}
	}

	if req.BrandColor != nil || req.WebsiteURL != nil || req.SocialLinks != nil {
		if _, err := r.CreateAuthorProfile(ctx, userID); err != nil {
			return nil, err
		}

		authorSets := []string{}
		authorArgs := []any{}
		authorIdx := 1

		if req.BrandColor != nil {
			authorSets = append(authorSets, "brand_color = $"+strconv.Itoa(authorIdx))
			authorArgs = append(authorArgs, strings.TrimSpace(*req.BrandColor))
			authorIdx++
		}
		if req.WebsiteURL != nil {
			authorSets = append(authorSets, "website_url = $"+strconv.Itoa(authorIdx))
			authorArgs = append(authorArgs, strings.TrimSpace(*req.WebsiteURL))
			authorIdx++
		}
		if req.SocialLinks != nil {
			authorSets = append(authorSets, "social_links = $"+strconv.Itoa(authorIdx))
			authorArgs = append(authorArgs, strings.TrimSpace(*req.SocialLinks))
			authorIdx++
		}

		if len(authorSets) > 0 {
			authorSets = append(authorSets, "updated_at = NOW()")
			query := "UPDATE author_profiles SET " + strings.Join(authorSets, ", ") + " WHERE user_id = $" + strconv.Itoa(authorIdx)
			authorArgs = append(authorArgs, userID)
			if _, err := r.db.ExecContext(ctx, query, authorArgs...); err != nil {
				return nil, err
			}
		}
	}

	return r.GetByID(ctx, userID)
}

// ===================== OAuth Accounts =====================

func (r *UserRepository) FindOrCreateOAuth(ctx context.Context, provider, providerID, email, displayName, avatarURL string) (*models.User, error) {
	// Check if OAuth account exists
	var userID string
	err := r.db.GetContext(ctx, &userID,
		"SELECT user_id FROM oauth_accounts WHERE provider = $1 AND provider_id = $2",
		provider, providerID)

	if err == nil {
		// Existing OAuth account, fetch user
		return r.GetByID(ctx, userID)
	}

	// Check if a user with this email already exists (link accounts)
	existing, err := r.GetByEmail(ctx, email)
	if err == nil {
		// Link the OAuth account to existing user
		oauthID := uuid.New().String()
		_, err = r.db.ExecContext(ctx,
			"INSERT INTO oauth_accounts (id, user_id, provider, provider_id, email) VALUES ($1, $2, $3, $4, $5)",
			oauthID, existing.ID, provider, providerID, email)
		return existing, err
	}

	// New user + OAuth account in transaction
	tx, err := r.db.BeginTxx(ctx, nil)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()

	id := uuid.New().String()
	username := "user_" + id[:8]
	user := &models.User{}
	err = tx.GetContext(ctx, user, `
		INSERT INTO users (id, email, username, display_name, avatar_url, role, email_verified, email_verified_at)
		VALUES ($1, $2, $3, $4, $5, 'reader', TRUE, NOW())
		RETURNING *`, id, email, username, displayName, avatarURL)
	if err != nil {
		return nil, err
	}

	oauthID := uuid.New().String()
	_, err = tx.ExecContext(ctx,
		"INSERT INTO oauth_accounts (id, user_id, provider, provider_id, email) VALUES ($1, $2, $3, $4, $5)",
		oauthID, user.ID, provider, providerID, email)
	if err != nil {
		return nil, err
	}

	return user, tx.Commit()
}

// ===================== Refresh Tokens =====================

func (r *UserRepository) CreateRefreshToken(ctx context.Context, userID string, expiry time.Duration) (string, error) {
	// Generate a random token
	rawBytes := make([]byte, 32)
	if _, err := rand.Read(rawBytes); err != nil {
		return "", err
	}
	rawToken := hex.EncodeToString(rawBytes)

	// Store hash of the token
	hash := sha256.Sum256([]byte(rawToken))
	tokenHash := hex.EncodeToString(hash[:])

	id := uuid.New().String()
	_, err := r.db.ExecContext(ctx, `
		INSERT INTO refresh_tokens (id, user_id, token_hash, expires_at)
		VALUES ($1, $2, $3, $4)`,
		id, userID, tokenHash, time.Now().Add(expiry))
	if err != nil {
		return "", err
	}
	return rawToken, nil
}

func (r *UserRepository) ValidateRefreshToken(ctx context.Context, rawToken string) (*models.User, error) {
	hash := sha256.Sum256([]byte(rawToken))
	tokenHash := hex.EncodeToString(hash[:])

	var rt models.RefreshToken
	err := r.db.GetContext(ctx, &rt, `
		SELECT * FROM refresh_tokens 
		WHERE token_hash = $1 AND revoked_at IS NULL AND expires_at > NOW()`,
		tokenHash)
	if err != nil {
		return nil, err
	}

	// Rotate: revoke the old token
	_, _ = r.db.ExecContext(ctx, "UPDATE refresh_tokens SET revoked_at = NOW() WHERE id = $1", rt.ID)

	return r.GetByID(ctx, rt.UserID)
}

func (r *UserRepository) RevokeAllRefreshTokens(ctx context.Context, userID string) error {
	_, err := r.db.ExecContext(ctx,
		"UPDATE refresh_tokens SET revoked_at = NOW() WHERE user_id = $1 AND revoked_at IS NULL",
		userID)
	return err
}

func (r *UserRepository) CreateEmailVerificationToken(ctx context.Context, userID string, expiry time.Duration) (string, error) {
	rawBytes := make([]byte, 32)
	if _, err := rand.Read(rawBytes); err != nil {
		return "", err
	}
	rawToken := hex.EncodeToString(rawBytes)
	hash := sha256.Sum256([]byte(rawToken))
	tokenHash := hex.EncodeToString(hash[:])

	_, err := r.db.ExecContext(ctx, "DELETE FROM email_verification_tokens WHERE user_id = $1", userID)
	if err != nil {
		return "", err
	}

	id := uuid.New().String()
	_, err = r.db.ExecContext(ctx, `
		INSERT INTO email_verification_tokens (id, user_id, token_hash, expires_at)
		VALUES ($1, $2, $3, $4)`,
		id, userID, tokenHash, time.Now().Add(expiry))
	if err != nil {
		return "", err
	}

	return rawToken, nil
}

func (r *UserRepository) ConsumeEmailVerificationToken(ctx context.Context, rawToken string) (string, error) {
	hash := sha256.Sum256([]byte(rawToken))
	tokenHash := hex.EncodeToString(hash[:])

	tx, err := r.db.BeginTxx(ctx, nil)
	if err != nil {
		return "", err
	}
	defer tx.Rollback()

	var token models.EmailVerificationToken
	err = tx.GetContext(ctx, &token, `
		SELECT * FROM email_verification_tokens
		WHERE token_hash = $1 AND expires_at > NOW()`, tokenHash)
	if err != nil {
		return "", err
	}

	if _, err := tx.ExecContext(ctx, "DELETE FROM email_verification_tokens WHERE id = $1", token.ID); err != nil {
		return "", err
	}

	if err := tx.Commit(); err != nil {
		return "", err
	}

	return token.UserID, nil
}

func (r *UserRepository) MarkEmailVerified(ctx context.Context, userID string) error {
	_, err := r.db.ExecContext(ctx, `
		UPDATE users
		SET email_verified = TRUE,
			email_verified_at = COALESCE(email_verified_at, NOW()),
			updated_at = NOW()
		WHERE id = $1`, userID)
	return err
}

func (r *UserRepository) SuspendUser(ctx context.Context, userID, reason string) error {
	_, err := r.db.ExecContext(ctx, `
		UPDATE users
		SET suspended_at = NOW(), suspension_reason = $2, updated_at = NOW()
		WHERE id = $1`, userID, strings.TrimSpace(reason))
	return err
}

func (r *UserRepository) UnsuspendUser(ctx context.Context, userID string) error {
	_, err := r.db.ExecContext(ctx, `
		UPDATE users
		SET suspended_at = NULL, suspension_reason = '', updated_at = NOW()
		WHERE id = $1`, userID)
	return err
}

func (r *UserRepository) EnsureCanAuthenticate(user *models.User) error {
	if user.SuspendedAt != nil {
		reason := strings.TrimSpace(user.SuspensionReason)
		if reason == "" {
			reason = "your account is suspended"
		}
		return fmt.Errorf("%s", reason)
	}
	return nil
}

// ===================== Password Verification =====================

func (r *UserRepository) CheckPassword(user *models.User, password string) bool {
	if user.PasswordHash == nil {
		return false
	}
	return bcrypt.CompareHashAndPassword([]byte(*user.PasswordHash), []byte(password)) == nil
}

// ===================== Author Profile =====================

func (r *UserRepository) GetAuthorProfile(ctx context.Context, userID string) (*models.AuthorProfile, error) {
	profile := &models.AuthorProfile{}
	err := r.db.GetContext(ctx, profile, "SELECT * FROM author_profiles WHERE user_id = $1", userID)
	return profile, err
}

func (r *UserRepository) CreateAuthorProfile(ctx context.Context, userID string) (*models.AuthorProfile, error) {
	profile := &models.AuthorProfile{}
	err := r.db.GetContext(ctx, profile, `
		INSERT INTO author_profiles (user_id) 
		VALUES ($1) 
		ON CONFLICT (user_id) DO NOTHING
		RETURNING *`, userID)
	if err != nil {
		// If ON CONFLICT fired, just fetch it
		return r.GetAuthorProfile(ctx, userID)
	}
	return profile, nil
}
