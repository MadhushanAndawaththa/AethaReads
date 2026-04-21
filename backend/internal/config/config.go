package config

import (
	"os"
	"strconv"
	"time"

	"github.com/joho/godotenv"
)

type Config struct {
	DB     DBConfig
	Redis  RedisConfig
	Server ServerConfig
	Cache  CacheConfig
	Auth   AuthConfig
}

type DBConfig struct {
	Host     string
	Port     int
	User     string
	Password string
	Name     string
	SSLMode  string
}

type RedisConfig struct {
	Addr     string
	Password string
	DB       int
}

type ServerConfig struct {
	Port           string
	AllowedOrigins string
}

type CacheConfig struct {
	ChapterTTL time.Duration
	NovelTTL   time.Duration
	CatalogTTL time.Duration
}

type AuthConfig struct {
	JWTSecret          string
	AccessTokenExpiry  time.Duration
	RefreshTokenExpiry time.Duration
	GoogleClientID     string
	GoogleClientSecret string
	GoogleRedirectURL  string
	CookieDomain       string
	CookieSecure       bool
}

func Load() *Config {
	_ = godotenv.Load()

	dbPort, _ := strconv.Atoi(getEnv("DB_PORT", "5432"))
	redisDB, _ := strconv.Atoi(getEnv("REDIS_DB", "0"))
	chapterTTL, _ := strconv.Atoi(getEnv("CHAPTER_CACHE_TTL", "3600"))
	novelTTL, _ := strconv.Atoi(getEnv("NOVEL_CACHE_TTL", "1800"))
	catalogTTL, _ := strconv.Atoi(getEnv("CATALOG_CACHE_TTL", "900"))
	accessExp, _ := strconv.Atoi(getEnv("ACCESS_TOKEN_EXPIRY_MIN", "15"))
	refreshExp, _ := strconv.Atoi(getEnv("REFRESH_TOKEN_EXPIRY_DAYS", "7"))
	cookieSecure := getEnv("COOKIE_SECURE", "false") == "true"

	return &Config{
		DB: DBConfig{
			Host:     getEnv("DB_HOST", "localhost"),
			Port:     dbPort,
			User:     getEnv("DB_USER", "aetha"),
			Password: getEnv("DB_PASSWORD", "aetha_secret"),
			Name:     getEnv("DB_NAME", "aetha_db"),
			SSLMode:  getEnv("DB_SSLMODE", "disable"),
		},
		Redis: RedisConfig{
			Addr:     getEnv("REDIS_ADDR", "localhost:6379"),
			Password: getEnv("REDIS_PASSWORD", ""),
			DB:       redisDB,
		},
		Server: ServerConfig{
			Port:           getEnv("PORT", "8080"),
			AllowedOrigins: getEnv("ALLOWED_ORIGINS", "http://localhost:3000"),
		},
		Cache: CacheConfig{
			ChapterTTL: time.Duration(chapterTTL) * time.Second,
			NovelTTL:   time.Duration(novelTTL) * time.Second,
			CatalogTTL: time.Duration(catalogTTL) * time.Second,
		},
		Auth: AuthConfig{
			JWTSecret:          getEnv("JWT_SECRET", "change-me-in-production-32chars!"),
			AccessTokenExpiry:  time.Duration(accessExp) * time.Minute,
			RefreshTokenExpiry: time.Duration(refreshExp) * 24 * time.Hour,
			GoogleClientID:     getEnv("GOOGLE_CLIENT_ID", ""),
			GoogleClientSecret: getEnv("GOOGLE_CLIENT_SECRET", ""),
			GoogleRedirectURL:  getEnv("GOOGLE_REDIRECT_URL", "http://localhost:8080/api/auth/google/callback"),
			CookieDomain:       getEnv("COOKIE_DOMAIN", ""),
			CookieSecure:       cookieSecure,
		},
	}
}

func getEnv(key, fallback string) string {
	if val, ok := os.LookupEnv(key); ok {
		return val
	}
	return fallback
}
