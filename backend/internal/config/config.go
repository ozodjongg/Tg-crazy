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

	// AI. Provayder kaliti bo'lmasa AI yo'llari 503 qaytaradi.
	AIProvider      string // auto | anthropic | gemini
	AIFallback      bool   // ikkala kalit bo'lsa: asosiy ishlamasa ikkinchisiga o'tish
	AnthropicAPIKey string
	AnthropicModel  string
	GeminiAPIKey    string
	GeminiModel     string
	// Faqat sinov yoki proksi uchun; bo'sh bo'lsa Google'ning standart manzili.
	GeminiBaseURL   string
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
		AIProvider:      strings.ToLower(env("AI_PROVIDER", "auto")),
		AnthropicAPIKey: os.Getenv("ANTHROPIC_API_KEY"),
		// AI_MODEL — eski nom, moslik uchun qoldirilgan
		AnthropicModel: env("ANTHROPIC_MODEL", env("AI_MODEL", "claude-opus-5-5")),
		GeminiAPIKey:   os.Getenv("GEMINI_API_KEY"),
		GeminiModel:    env("GEMINI_MODEL", "gemini-3.6-flash"),
		GeminiBaseURL:  os.Getenv("GEMINI_BASE_URL"),
		AccessTTL:      15 * time.Minute,
		RefreshTTL:     30 * 24 * time.Hour,
		NonceTTL:       5 * time.Minute,
	}
	var err error
	if c.AIMaxInputChars, err = strconv.Atoi(env("AI_MAX_INPUT_CHARS", "40000")); err != nil {
		return c, fmt.Errorf("AI_MAX_INPUT_CHARS: %w", err)
	}
	if c.AIFallback, err = strconv.ParseBool(env("AI_FALLBACK", "true")); err != nil {
		return c, fmt.Errorf("AI_FALLBACK true yoki false bo'lishi kerak: %w", err)
	}
	if err := c.checkAI(); err != nil {
		return c, err
	}
	if c.DatabaseURL == "" {
		return c, errors.New("DATABASE_URL ko'rsatilmagan")
	}
	if len(c.JWTSecret) < 32 {
		return c, errors.New("JWT_SECRET kamida 32 belgidan iborat bo'lishi kerak")
	}
	return c, nil
}

// AIProviders asosiy va (bo'lsa) zaxira provayder nomlarini qaytaradi.
// Bo'sh ro'yxat — AI o'chiq.
func (c Config) AIProviders() []string {
	has := map[string]bool{"anthropic": c.AnthropicAPIKey != "", "gemini": c.GeminiAPIKey != ""}
	var order []string
	switch c.AIProvider {
	case "anthropic":
		order = []string{"anthropic", "gemini"}
	case "gemini":
		order = []string{"gemini", "anthropic"}
	default: // auto
		order = []string{"anthropic", "gemini"}
	}
	var out []string
	for _, name := range order {
		if has[name] {
			out = append(out, name)
		}
	}
	if len(out) > 1 && !c.AIFallback {
		out = out[:1]
	}
	return out
}

func (c Config) checkAI() error {
	switch c.AIProvider {
	case "auto":
		return nil
	case "anthropic":
		if c.AnthropicAPIKey == "" {
			return errors.New("AI_PROVIDER=anthropic, lekin ANTHROPIC_API_KEY ko'rsatilmagan")
		}
	case "gemini":
		if c.GeminiAPIKey == "" {
			return errors.New("AI_PROVIDER=gemini, lekin GEMINI_API_KEY ko'rsatilmagan")
		}
	default:
		return fmt.Errorf("AI_PROVIDER noma'lum: %q (auto, anthropic yoki gemini bo'lishi kerak)", c.AIProvider)
	}
	return nil
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
