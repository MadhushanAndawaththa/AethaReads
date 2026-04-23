package middleware

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"strconv"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
)

const csrfTokenValidity = 24 * time.Hour

// GenerateCSRFToken creates a stateless HMAC-signed token bound to the given user ID.
// Format: base64url(userID + ":" + unixTimestamp + ":" + hmac_hex)
func GenerateCSRFToken(userID, jwtSecret string) string {
	ts := strconv.FormatInt(time.Now().Unix(), 10)
	msg := userID + ":" + ts
	mac := hmac.New(sha256.New, []byte(jwtSecret))
	mac.Write([]byte(msg))
	sig := hex.EncodeToString(mac.Sum(nil))
	return base64.RawURLEncoding.EncodeToString([]byte(msg + ":" + sig))
}

func validateCSRFToken(token, userID, jwtSecret string) bool {
	decoded, err := base64.RawURLEncoding.DecodeString(token)
	if err != nil {
		return false
	}

	// Split into exactly 3 parts: userID, timestamp, sig
	parts := strings.SplitN(string(decoded), ":", 3)
	if len(parts) != 3 {
		return false
	}
	tokenUserID, tsStr, sig := parts[0], parts[1], parts[2]

	if tokenUserID != userID {
		return false
	}

	ts, err := strconv.ParseInt(tsStr, 10, 64)
	if err != nil {
		return false
	}

	if time.Now().Unix()-ts > int64(csrfTokenValidity.Seconds()) {
		return false
	}

	msg := tokenUserID + ":" + tsStr
	mac := hmac.New(sha256.New, []byte(jwtSecret))
	mac.Write([]byte(msg))
	expected := hex.EncodeToString(mac.Sum(nil))
	return hmac.Equal([]byte(sig), []byte(expected))
}

// RequireCSRF validates the X-CSRF-Token header for state-changing methods.
// Automatically skips GET, HEAD, and OPTIONS. Must be placed after RequireAuth.
func RequireCSRF(jwtSecret string) fiber.Handler {
	return func(c *fiber.Ctx) error {
		method := c.Method()
		if method == "GET" || method == "HEAD" || method == "OPTIONS" {
			return c.Next()
		}

		userID := GetUserID(c)
		if userID == "" {
			// Public (unauthenticated) mutation — no CSRF check needed
			return c.Next()
		}

		token := c.Get("X-CSRF-Token")
		if token == "" {
			return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "CSRF token required"})
		}

		if !validateCSRFToken(token, userID, jwtSecret) {
			return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "Invalid CSRF token"})
		}

		return c.Next()
	}
}
