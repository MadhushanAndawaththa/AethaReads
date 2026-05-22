package handlers

import (
	"fmt"
	"net/url"
	"path"
	"strings"
)

var allowedCoverHostSuffixes = []string{
	".supabase.co",
	".supabase.in",
	".cloudflare.com",
	".amazonaws.com",
}

var allowedCoverExtensions = map[string]struct{}{
	".jpg":  {},
	".jpeg": {},
	".png":  {},
	".webp": {},
	".gif":  {},
	".avif": {},
}

func hasAllowedCoverExtension(resourcePath string) bool {
	ext := strings.ToLower(path.Ext(resourcePath))
	_, ok := allowedCoverExtensions[ext]
	return ok
}

func coverProviderLabel(host string) string {
	switch {
	case host == "":
		return "Local app asset"
	case host == "res.cloudinary.com":
		return "Cloudinary"
	case host == "localhost":
		return "Localhost"
	case host == "supabase.co" || strings.HasSuffix(host, ".supabase.co") || host == "supabase.in" || strings.HasSuffix(host, ".supabase.in"):
		return "Supabase Storage"
	case host == "cloudflare.com" || strings.HasSuffix(host, ".cloudflare.com"):
		return "Cloudflare"
	case host == "amazonaws.com" || strings.HasSuffix(host, ".amazonaws.com"):
		return "Amazon S3"
	default:
		return host
	}
}

func isAllowedRemoteCoverHost(host string) bool {
	if host == "res.cloudinary.com" || host == "localhost" {
		return true
	}
	for _, suffix := range allowedCoverHostSuffixes {
		trimmed := strings.TrimPrefix(suffix, ".")
		if host == trimmed || strings.HasSuffix(host, suffix) {
			return true
		}
	}
	return false
}

func normalizeLocalCoverPath(raw string) (string, string, bool, error) {
	cleaned := path.Clean("/" + strings.TrimPrefix(strings.TrimSpace(raw), "/"))
	if !strings.HasPrefix(cleaned, "/covers/") && !strings.HasPrefix(cleaned, "/uploads/covers/") {
		return "", "", false, fmt.Errorf("cover path must be under /covers/ or /uploads/covers/")
	}
	if !hasAllowedCoverExtension(cleaned) {
		return "", "", false, fmt.Errorf("cover path must end with .jpg, .jpeg, .png, .webp, .gif, or .avif")
	}
	return cleaned, coverProviderLabel(""), true, nil
}

func normalizeCoverURL(raw string) (string, string, bool, error) {
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return "", "", false, nil
	}

	if strings.HasPrefix(raw, "/") {
		return normalizeLocalCoverPath(raw)
	}

	parsed, err := url.Parse(raw)
	if err != nil || parsed.Hostname() == "" {
		return "", "", false, fmt.Errorf("cover must be a valid URL or a local /covers/... path")
	}

	host := strings.ToLower(parsed.Hostname())
	scheme := strings.ToLower(parsed.Scheme)
	if scheme == "http" {
		if host != "localhost" {
			return "", "", false, fmt.Errorf("only https cover URLs are allowed, except localhost in development")
		}
	} else if scheme != "https" {
		return "", "", false, fmt.Errorf("cover must use https or a local /covers/... path")
	}

	if !isAllowedRemoteCoverHost(host) {
		return "", "", false, fmt.Errorf("cover host is not supported; use Cloudinary, Supabase, Cloudflare, Amazon S3, localhost, or a local cover path")
	}
	if !hasAllowedCoverExtension(parsed.Path) {
		return "", "", false, fmt.Errorf("cover URL must end with .jpg, .jpeg, .png, .webp, .gif, or .avif")
	}

	if parsed.Port() != "" {
		parsed.Host = host + ":" + parsed.Port()
	} else {
		parsed.Host = host
	}
	parsed.Fragment = ""

	return parsed.String(), coverProviderLabel(host), false, nil
}

func normalizeOptionalCoverURL(raw string) (string, error) {
	normalized, _, _, err := normalizeCoverURL(raw)
	if err != nil {
		return "", err
	}
	return normalized, nil
}