// Package config muhit o'zgaruvchilaridan sozlamalarni o'qiydi.
package config

import (
	"errors"
	"fmt"
	"os"
	"strconv"
	"strings"
	"time"
)

type Config struct {
	Addr        string
	DatabaseURL string
	JWTSecret   []byte
	CORSOrigins []string

	// O'z botimiz: foydalanuvchi kimligini tasdiqlash uchun. Bo'sh bo'lsa bot ishga tushmaydi.
	BotToken  string
	BotAPIURL string

	// AI. Kalit bo'sh bo'lsa AI yo'llari 503 qaytaradi.
	AnthropicAPIKey string
	AIModel         string
	AIMaxInputChars int

	AccessTTL  time.Duration
	RefreshTTL time.Duration
	NonceTTL   time.Duration
}

func Load() (Config, error) {
	c := Config{
		Addr:            ":" + env("PORT", "8080"),
		DatabaseURL:     os.Getenv("DATABASE_URL"),
		JWTSecret:       []byte(os.Getenv("JWT_SECRET")),
		CORSOrigins:     splitList(env("CORS_ORIGINS", "http://localhost:3000")),
		BotToken:        os.Getenv("BOT_TOKEN"),
		BotAPIURL:       env("BOT_API_URL", "https://api.telegram.org"),
		AnthropicAPIKey: os.Getenv("ANTHROPIC_API_KEY"),
		AIModel:         env("AI_MODEL", "claude-opus-5-5"),
		AccessTTL:       15 * time.Minute,
		RefreshTTL:      30 * 24 * time.Hour,
		NonceTTL:        5 * time.Minute,
	}
	var err error
	if c.AIMaxInputChars, err = strconv.Atoi(env("AI_MAX_INPUT_CHARS", "40000")); err != nil {
		return c, fmt.Errorf("AI_MAX_INPUT_CHARS: %w", err)
	}
	if c.DatabaseURL == "" {
		return c, errors.New("DATABASE_URL ko'rsatilmagan")
	}
	if len(c.JWTSecret) < 32 {
		return c, errors.New("JWT_SECRET kamida 32 belgidan iborat bo'lishi kerak")
	}
	return c, nil
}

func env(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

func splitList(s string) []string {
	var out []string
	for _, p := range strings.Split(s, ",") {
		if p = strings.TrimSpace(p); p != "" {
			out = append(out, p)
		}
	}
	return out
}
