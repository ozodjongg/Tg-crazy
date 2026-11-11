package config

import (
	"reflect"
	"strings"
	"testing"
)

func setBase(t *testing.T) {
	t.Helper()
	t.Setenv("DATABASE_URL", "postgres://x")
	t.Setenv("JWT_SECRET", strings.Repeat("s", 32))
	for _, k := range []string{"AI_PROVIDER", "AI_FALLBACK", "ANTHROPIC_API_KEY", "ANTHROPIC_MODEL", "AI_MODEL", "GEMINI_API_KEY", "GEMINI_MODEL"} {
		t.Setenv(k, "")
	}
}

func TestAIProviders(t *testing.T) {
	cases := []struct {
		name    string
		env     map[string]string
		want    []string
		wantErr string
	}{
		{"kalitsiz", nil, nil, ""},
		{"faqat gemini (auto)", map[string]string{"GEMINI_API_KEY": "g"}, []string{"gemini"}, ""},
		{"faqat anthropic (auto)", map[string]string{"ANTHROPIC_API_KEY": "a"}, []string{"anthropic"}, ""},
		{"ikkalasi (auto)", map[string]string{"ANTHROPIC_API_KEY": "a", "GEMINI_API_KEY": "g"}, []string{"anthropic", "gemini"}, ""},
		{"gemini asosiy", map[string]string{"AI_PROVIDER": "Gemini", "ANTHROPIC_API_KEY": "a", "GEMINI_API_KEY": "g"}, []string{"gemini", "anthropic"}, ""},
		{"zaxirasiz", map[string]string{"AI_FALLBACK": "false", "ANTHROPIC_API_KEY": "a", "GEMINI_API_KEY": "g"}, []string{"anthropic"}, ""},
		{"gemini kalitsiz", map[string]string{"AI_PROVIDER": "gemini", "ANTHROPIC_API_KEY": "a"}, nil, "GEMINI_API_KEY"},
		{"anthropic kalitsiz", map[string]string{"AI_PROVIDER": "anthropic"}, nil, "ANTHROPIC_API_KEY"},
		{"noma'lum", map[string]string{"AI_PROVIDER": "openai"}, nil, "noma'lum"},
		{"yaroqsiz fallback", map[string]string{"AI_FALLBACK": "ha"}, nil, "AI_FALLBACK"},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			setBase(t)
			for k, v := range tc.env {
				t.Setenv(k, v)
			}
			c, err := Load()
			if tc.wantErr != "" {
				if err == nil || !strings.Contains(err.Error(), tc.wantErr) {
					t.Fatalf("xato kutilgan (%s), keldi: %v", tc.wantErr, err)
				}
				return
			}
			if err != nil {
				t.Fatal(err)
			}
			if got := c.AIProviders(); !reflect.DeepEqual(got, tc.want) {
				t.Fatalf("AIProviders = %v, kutilgan %v", got, tc.want)
			}
		})
	}
}

func TestModelDefaultsAndLegacyName(t *testing.T) {
	setBase(t)
	c, err := Load()
	if err != nil {
		t.Fatal(err)
	}
	if c.AnthropicModel != "claude-opus-5-5" || c.GeminiModel != "gemini-3.6-flash" {
		t.Fatalf("standart modellar: %q %q", c.AnthropicModel, c.GeminiModel)
	}
	t.Setenv("AI_MODEL", "eski-model")
	if c, _ = Load(); c.AnthropicModel != "eski-model" {
		t.Fatalf("AI_MODEL e'tiborga olinmadi: %q", c.AnthropicModel)
	}
	t.Setenv("ANTHROPIC_MODEL", "yangi-model")
	if c, _ = Load(); c.AnthropicModel != "yangi-model" {
		t.Fatalf("ANTHROPIC_MODEL ustun bo'lishi kerak: %q", c.AnthropicModel)
	}
}
