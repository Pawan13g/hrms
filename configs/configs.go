package configs

import (
	"errors"
	"os"
	"strconv"
	"time"
)

type Config struct {
	Env           string
	Port          string
	DatabaseURL   string
	RedisURL      string
	JWTSecret     string
	JWTAccessTTL  time.Duration
	JWTRefreshTTL time.Duration
	LogLevel      string
	CORSOrigins   []string
	PlaygroundOn  bool
}

func Load() (*Config, error) {

	c := &Config{
		Env:           GetEnv("ENV", "dev"),
		Port:          GetEnv("PORT", "8080"),
		DatabaseURL:   os.Getenv("DATABASE_URL"),
		RedisURL:      os.Getenv("REDIS_URL"),
		JWTSecret:     os.Getenv("JWT_SECRET"),
		JWTAccessTTL:  ParseDuration("JWT_ACCESS_TTL", 15*time.Minute),
		JWTRefreshTTL: ParseDuration("JWT_REFRESH_TTL", 7*24*time.Hour),
		LogLevel:      GetEnv("LOG_LEVEL", "info"),
		CORSOrigins:   ParseCSV(GetEnv("CORS_ORIGINS", "*")),
	}
	c.PlaygroundOn = c.Env == "dev"

	if c.DatabaseURL == "" {
		return nil, errors.New("DATABASE_URL is required")
	}
	if c.RedisURL == "" {
		return nil, errors.New("REDIS_URL is required")
	}
	if c.JWTSecret == "" {
		return nil, errors.New("JWT_SECRET is required")
	}
	return c, nil
}

func GetEnv(key, def string) string {
	if v, ok := os.LookupEnv(key); ok && v != "" {
		return v
	}
	return def
}

func ParseDuration(key string, def time.Duration) time.Duration {
	v := os.Getenv(key)
	if v == "" {
		return def
	}
	if d, err := time.ParseDuration(v); err == nil {
		return d
	}
	if n, err := strconv.Atoi(v); err == nil {
		return time.Duration(n) * time.Second
	}
	return def
}

func ParseCSV(s string) []string {
	if s == "" {
		return nil
	}
	out := []string{}
	start := 0
	for i := 0; i <= len(s); i++ {
		if i == len(s) || s[i] == ',' {
			if i > start {
				out = append(out, s[start:i])
			}
			start = i + 1
		}
	}
	return out
}
