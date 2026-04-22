package router

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gofiber/fiber/v2"
)

func TestAuthWriteLimiterBlocksBurstRequests(t *testing.T) {
	app := fiber.New()
	app.Post("/api/auth/register", authWriteLimiter(), func(c *fiber.Ctx) error {
		return c.SendStatus(http.StatusNoContent)
	})

	for i := 0; i < 10; i++ {
		req := httptest.NewRequest(http.MethodPost, "/api/auth/register", nil)
		resp, err := app.Test(req, -1)
		if err != nil {
			t.Fatalf("request %d failed: %v", i+1, err)
		}
		if resp.StatusCode != http.StatusNoContent {
			t.Fatalf("request %d returned %d, want %d", i+1, resp.StatusCode, http.StatusNoContent)
		}
	}

	req := httptest.NewRequest(http.MethodPost, "/api/auth/register", nil)
	resp, err := app.Test(req, -1)
	if err != nil {
		t.Fatalf("limit request failed: %v", err)
	}
	if resp.StatusCode != http.StatusTooManyRequests {
		t.Fatalf("limit request returned %d, want %d", resp.StatusCode, http.StatusTooManyRequests)
	}
}

func TestCommunityWriteLimiterScopesByUserAndRoute(t *testing.T) {
	app := fiber.New()
	setUser := func(c *fiber.Ctx) error {
		c.Locals("userID", c.Get("X-User-ID"))
		return c.Next()
	}

	app.Post("/api/chapters/:id/comments", setUser, communityWriteLimiter(), func(c *fiber.Ctx) error {
		return c.SendStatus(http.StatusNoContent)
	})
	app.Post("/api/novels/:slug/follow", setUser, communityWriteLimiter(), func(c *fiber.Ctx) error {
		return c.SendStatus(http.StatusNoContent)
	})

	for i := 0; i < 20; i++ {
		req := httptest.NewRequest(http.MethodPost, "/api/chapters/123/comments", nil)
		req.Header.Set("X-User-ID", "user-1")
		resp, err := app.Test(req, -1)
		if err != nil {
			t.Fatalf("comment request %d failed: %v", i+1, err)
		}
		if resp.StatusCode != http.StatusNoContent {
			t.Fatalf("comment request %d returned %d, want %d", i+1, resp.StatusCode, http.StatusNoContent)
		}
	}

	blockedReq := httptest.NewRequest(http.MethodPost, "/api/chapters/123/comments", nil)
	blockedReq.Header.Set("X-User-ID", "user-1")
	blockedResp, err := app.Test(blockedReq, -1)
	if err != nil {
		t.Fatalf("blocked comment request failed: %v", err)
	}
	if blockedResp.StatusCode != http.StatusTooManyRequests {
		t.Fatalf("blocked comment request returned %d, want %d", blockedResp.StatusCode, http.StatusTooManyRequests)
	}

	otherRouteReq := httptest.NewRequest(http.MethodPost, "/api/novels/test-slug/follow", nil)
	otherRouteReq.Header.Set("X-User-ID", "user-1")
	otherRouteResp, err := app.Test(otherRouteReq, -1)
	if err != nil {
		t.Fatalf("follow request failed: %v", err)
	}
	if otherRouteResp.StatusCode != http.StatusNoContent {
		t.Fatalf("follow request returned %d, want %d", otherRouteResp.StatusCode, http.StatusNoContent)
	}

	otherUserReq := httptest.NewRequest(http.MethodPost, "/api/chapters/123/comments", nil)
	otherUserReq.Header.Set("X-User-ID", "user-2")
	otherUserResp, err := app.Test(otherUserReq, -1)
	if err != nil {
		t.Fatalf("other user request failed: %v", err)
	}
	if otherUserResp.StatusCode != http.StatusNoContent {
		t.Fatalf("other user request returned %d, want %d", otherUserResp.StatusCode, http.StatusNoContent)
	}
}

func TestSecurityHeadersAddsProductionDefaults(t *testing.T) {
	app := fiber.New()
	app.Use(securityHeaders())
	app.Get("/api/health", func(c *fiber.Ctx) error {
		return c.SendStatus(http.StatusNoContent)
	})

	req := httptest.NewRequest(http.MethodGet, "/api/health", nil)
	resp, err := app.Test(req, -1)
	if err != nil {
		t.Fatalf("health request failed: %v", err)
	}

	if got := resp.Header.Get("Content-Security-Policy"); got == "" {
		t.Fatal("missing Content-Security-Policy header")
	}
	if got := resp.Header.Get("Referrer-Policy"); got != "strict-origin-when-cross-origin" {
		t.Fatalf("Referrer-Policy = %q, want %q", got, "strict-origin-when-cross-origin")
	}
	if got := resp.Header.Get("X-Content-Type-Options"); got != "nosniff" {
		t.Fatalf("X-Content-Type-Options = %q, want %q", got, "nosniff")
	}
	if got := resp.Header.Get("X-Frame-Options"); got != "DENY" {
		t.Fatalf("X-Frame-Options = %q, want %q", got, "DENY")
	}
}
