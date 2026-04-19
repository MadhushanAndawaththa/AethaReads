package middleware

import (
	"strings"
	"time"

	"aetha-backend/internal/config"
	"aetha-backend/internal/models"

	"github.com/gofiber/fiber/v2"
	"github.com/golang-jwt/jwt/v5"
)

type Claims struct {
	UserID string `json:"uid"`
	Role   string `json:"role"`
	jwt.RegisteredClaims
}

// GenerateAccessToken creates a short-lived JWT access token.
func GenerateAccessToken(user *models.User, cfg *config.AuthConfig) (string, error) {
	claims := Claims{
		UserID: user.ID,
		Role:   user.Role,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(cfg.AccessTokenExpiry)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
			Subject:   user.ID,
		},
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(cfg.JWTSecret))
}

// ParseToken validates a JWT and returns the claims.
func ParseToken(tokenStr string, secret string) (*Claims, error) {
	token, err := jwt.ParseWithClaims(tokenStr, &Claims{}, func(t *jwt.Token) (any, error) {
		if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fiber.ErrUnauthorized
		}
		return []byte(secret), nil
	})
	if err != nil {
		return nil, err
	}
	claims, ok := token.Claims.(*Claims)
	if !ok || !token.Valid {
		return nil, fiber.ErrUnauthorized
	}
	return claims, nil
}

// RequireAuth is Fiber middleware that validates the JWT from the cookie or header.
func RequireAuth(secret string) fiber.Handler {
	return func(c *fiber.Ctx) error {
		tokenStr := c.Cookies("access_token")
		if tokenStr == "" {
			// Fallback: Authorization: Bearer <token>
			auth := c.Get("Authorization")
			if strings.HasPrefix(auth, "Bearer ") {
				tokenStr = auth[7:]
			}
		}
		if tokenStr == "" {
			return c.Status(401).JSON(models.ErrorResponse{Error: "Authentication required"})
		}

		claims, err := ParseToken(tokenStr, secret)
		if err != nil {
			return c.Status(401).JSON(models.ErrorResponse{Error: "Invalid or expired token"})
		}

		c.Locals("userID", claims.UserID)
		c.Locals("userRole", claims.Role)
		return c.Next()
	}
}

// OptionalAuth extracts user info if present but doesn't block.
func OptionalAuth(secret string) fiber.Handler {
	return func(c *fiber.Ctx) error {
		tokenStr := c.Cookies("access_token")
		if tokenStr == "" {
			auth := c.Get("Authorization")
			if strings.HasPrefix(auth, "Bearer ") {
				tokenStr = auth[7:]
			}
		}
		if tokenStr != "" {
			claims, err := ParseToken(tokenStr, secret)
			if err == nil {
				c.Locals("userID", claims.UserID)
				c.Locals("userRole", claims.Role)
			}
		}
		return c.Next()
	}
}

// RequireRole restricts access to users with a specific role.
func RequireRole(roles ...string) fiber.Handler {
	return func(c *fiber.Ctx) error {
		userRole, _ := c.Locals("userRole").(string)
		for _, r := range roles {
			if userRole == r {
				return c.Next()
			}
		}
		return c.Status(403).JSON(models.ErrorResponse{Error: "Insufficient permissions"})
	}
}

// GetUserID extracts the authenticated user ID from locals.
func GetUserID(c *fiber.Ctx) string {
	id, _ := c.Locals("userID").(string)
	return id
}
