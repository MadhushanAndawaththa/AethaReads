package repository

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
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
		INSERT INTO users (id, email, username, display_name, avatar_url, role)
		VALUES ($1, $2, $3, $4, $5, 'reader')
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
