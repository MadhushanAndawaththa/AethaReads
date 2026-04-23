package middleware

import (
	"context"
	"fmt"
	"time"

	"github.com/redis/go-redis/v9"
)

const (
	// Per email+IP: 5 failures before lockout
	bruteForceEmailIPMax = 5
	// Per IP: 20 failures before lockout (catches distributed single-email attacks)
	bruteForceIPMax = 20
	// Lockout window
	bruteForceWindow = 15 * time.Minute
)

func bfEmailIPKey(email, ip string) string {
	return fmt.Sprintf("bf:email:%s:ip:%s", email, ip)
}

func bfIPKey(ip string) string {
	return fmt.Sprintf("bf:ip:%s", ip)
}

// CheckLoginAllowed returns false if the caller has exceeded login attempt limits.
// Fails open on Redis errors to preserve availability.
func CheckLoginAllowed(ctx context.Context, rdb *redis.Client, email, ip string) bool {
	emailIPCount, err := rdb.Get(ctx, bfEmailIPKey(email, ip)).Int()
	if err == nil && emailIPCount >= bruteForceEmailIPMax {
		return false
	}

	ipCount, err := rdb.Get(ctx, bfIPKey(ip)).Int()
	if err == nil && ipCount >= bruteForceIPMax {
		return false
	}

	return true
}

// RecordFailedLogin increments the failure counters for an email+IP and the IP alone.
func RecordFailedLogin(ctx context.Context, rdb *redis.Client, email, ip string) {
	pipe := rdb.Pipeline()
	emailIPKey := bfEmailIPKey(email, ip)
	ipKey := bfIPKey(ip)
	pipe.Incr(ctx, emailIPKey)
	pipe.Expire(ctx, emailIPKey, bruteForceWindow)
	pipe.Incr(ctx, ipKey)
	pipe.Expire(ctx, ipKey, bruteForceWindow)
	pipe.Exec(ctx) //nolint:errcheck
}

// ClearLoginAttempts removes the failure counters after a successful login.
func ClearLoginAttempts(ctx context.Context, rdb *redis.Client, email, ip string) {
	rdb.Del(ctx, bfEmailIPKey(email, ip)) //nolint:errcheck
}
