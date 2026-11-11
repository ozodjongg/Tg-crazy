package ai

import (
	"context"
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

type stub struct {
	out   string
	err   error
	calls int
}

func (s *stub) Complete(context.Context, string, string) (string, Usage, error) {
	s.calls++
	return s.out, Usage{InputTokens: 1}, s.err
}

func TestFallback(t *testing.T) {
	ctx := context.Background()
	cases := []struct {
		name          string
		primaryErr    error
		wantSecondary bool
	}{
		{"muvaffaqiyat", nil, false},
		{"tarmoq xatosi", errors.New("connection reset"), true},
		{"limit (429)", &ProviderError{Status: 429, Err: errors.New("x")}, true},
		{"server (503)", &ProviderError{Status: 503, Err: errors.New("x")}, true},
		{"kalit noto'g'ri (401)", &ProviderError{Status: 401, Err: errors.New("x")}, true},
		{"noto'g'ri so'rov (400)", &ProviderError{Status: 400, Err: errors.New("x")}, false},
		{"rad etish", ErrRefused, false},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			a := &stub{out: "A", err: tc.primaryErr}
			b := &stub{out: "B"}
			f := &Fallback{Providers: []Named{{"anthropic", a}, {"gemini", b}}}
			out, _, err := f.Complete(ctx, "s", "u")
			if tc.wantSecondary {
				if err != nil || out != "B" || b.calls != 1 {
					t.Fatalf("zaxira ishlatilmadi: out=%q err=%v calls=%d", out, err, b.calls)
				}
				return
			}
			if b.calls != 0 {
				t.Fatal("zaxira keraksiz chaqirildi")
			}
			if tc.primaryErr == nil && out != "A" {
				t.Fatalf("out=%q", out)
			}
			if tc.primaryErr != nil && !errors.Is(err, tc.primaryErr) {
				t.Fatalf("asl xato qaytmadi: %v", err)
			}
		})
	}

	t.Run("bekor qilingan so'rov", func(t *testing.T) {
		cctx, cancel := context.WithCancel(ctx)
		cancel()
		b := &stub{out: "B"}
		f := &Fallback{Providers: []Named{{"a", &stub{err: context.Canceled}}, {"b", b}}}
		if _, _, err := f.Complete(cctx, "s", "u"); err == nil || b.calls != 0 {
			t.Fatalf("err=%v calls=%d", err, b.calls)
		}
	})
	t.Run("ikkalasi ham ishlamasa oxirgi xato", func(t *testing.T) {
		last := &ProviderError{Status: 500, Err: errors.New("b")}
		f := &Fallback{Providers: []Named{{"a", &stub{err: errors.New("a")}}, {"b", &stub{err: last}}}}
		if _, _, err := f.Complete(ctx, "s", "u"); !errors.Is(err, last) {
			t.Fatalf("err=%v", err)
		}
	})
	if d := (&Fallback{Providers: []Named{{"anthropic", nil}, {"gemini", nil}}}).Describe(); d != "anthropic+gemini" {
		t.Fatal(d)
	}
}

// fakeGemini Gemini API'ga o'xshab javob beradi va kelgan so'rovni saqlaydi.
func fakeGemini(t *testing.T, status int, body string) (*httptest.Server, *map[string]any, *string) {
	t.Helper()
	var got map[string]any
	var path string
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		path = r.URL.Path + " key=" + r.Header.Get("x-goog-api-key")
		raw, _ := io.ReadAll(r.Body)
		_ = json.Unmarshal(raw, &got)
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(status)
		_, _ = io.WriteString(w, body)
	}))
	t.Cleanup(srv.Close)
	return srv, &got, &path
}

func TestGemini(t *testing.T) {
	ctx := context.Background()

	t.Run("javob va tokenlar", func(t *testing.T) {
		srv, got, path := fakeGemini(t, 200, `{
			"candidates":[{"content":{"role":"model","parts":[{"text":"Salom!"}]},"finishReason":"STOP"}],
			"usageMetadata":{"promptTokenCount":12,"candidatesTokenCount":3,"thoughtsTokenCount":5}}`)
		g, err := NewGemini(ctx, "test-kalit", "gemini-test", srv.URL)
		if err != nil {
			t.Fatal(err)
		}
		out, usage, err := g.Complete(ctx, "ko'rsatma", "matn")
		if err != nil || out != "Salom!" || usage.InputTokens != 12 || usage.OutputTokens != 8 {
			t.Fatalf("out=%q usage=%+v err=%v", out, usage, err)
		}
		if !strings.Contains(*path, "gemini-test:generateContent") || !strings.Contains(*path, "key=test-kalit") {
			t.Errorf("so'rov manzili: %s", *path)
		}
		b, _ := json.Marshal(*got)
		if !strings.Contains(string(b), `"systemInstruction"`) || !strings.Contains(string(b), "ko'rsatma") || !strings.Contains(string(b), "matn") {
			t.Errorf("so'rov tanasi: %s", b)
		}
	})

	for name, body := range map[string]string{
		"so'rov bloklandi": `{"promptFeedback":{"blockReason":"SAFETY"}}`,
		"javob bloklandi":  `{"candidates":[{"content":{"parts":[]},"finishReason":"SAFETY"}]}`,
	} {
		t.Run(name, func(t *testing.T) {
			srv, _, _ := fakeGemini(t, 200, body)
			g, _ := NewGemini(ctx, "k", "m", srv.URL)
			if _, _, err := g.Complete(ctx, "s", "u"); !errors.Is(err, ErrRefused) {
				t.Fatalf("ErrRefused kutilgan: %v", err)
			}
		})
	}

	t.Run("API xatosi holat kodi bilan", func(t *testing.T) {
		srv, _, _ := fakeGemini(t, 429, `{"error":{"code":429,"message":"quota","status":"RESOURCE_EXHAUSTED"}}`)
		g, _ := NewGemini(ctx, "k", "m", srv.URL)
		_, _, err := g.Complete(ctx, "s", "u")
		if statusOf(err) != 429 || !shouldFallBack(ctx, err) {
			t.Fatalf("status=%d err=%v", statusOf(err), err)
		}
	})
}
