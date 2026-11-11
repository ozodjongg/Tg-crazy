package ai

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"net/http"
	"strings"

	"github.com/anthropics/anthropic-sdk-go/v2"
)

// ProviderError — provayder API'si qaytargan HTTP xatosi.
type ProviderError struct {
	Status int
	Err    error
}

func (e *ProviderError) Error() string { return fmt.Sprintf("HTTP %d: %v", e.Status, e.Err) }
func (e *ProviderError) Unwrap() error { return e.Err }

// Named — nomli provayder (log va zaxira tartibi uchun).
type Named struct {
	Name string
	Provider
}

// Fallback ro'yxatdagi provayderlarni tartib bilan sinaydi: asosiysi ishlamasa keyingisiga o'tadi.
type Fallback struct {
	Providers []Named
	Log       *slog.Logger
}

func (f *Fallback) Complete(ctx context.Context, system, user string) (string, Usage, error) {
	var lastErr error
	for i, p := range f.Providers {
		out, usage, err := p.Complete(ctx, system, user)
		if err == nil {
			if i > 0 && f.Log != nil {
				f.Log.Info("AI: zaxira provayder javob berdi", "provider", p.Name)
			}
			return out, usage, nil
		}
		lastErr = err
		if !shouldFallBack(ctx, err) || i == len(f.Providers)-1 {
			return "", usage, err
		}
		if f.Log != nil {
			// Xato matnida foydalanuvchi matni bo'lmaydi; faqat holat kodi va provayder nomi
			f.Log.Warn("AI: provayder ishlamadi, keyingisiga o'tilmoqda",
				"provider", p.Name, "next", f.Providers[i+1].Name, "status", statusOf(err))
		}
	}
	return "", Usage{}, lastErr
}

// shouldFallBack: rad etish, bekor qilingan so'rov va noto'g'ri so'rov (400) boshqa
// provayderga o'tkazilmaydi. Tarmoq, kalit/model (401/403/404), limit (429) va
// server (5xx) xatolarida zaxira provayder sinaladi.
func shouldFallBack(ctx context.Context, err error) bool {
	if ctx.Err() != nil || errors.Is(err, ErrRefused) || errors.Is(err, ErrEmpty) || errors.Is(err, ErrTooLong) {
		return false
	}
	switch s := statusOf(err); {
	case s == 0: // tarmoq xatosi yoki status noma'lum
		return true
	case s == http.StatusBadRequest || s == http.StatusRequestEntityTooLarge || s == http.StatusUnprocessableEntity:
		return false
	default:
		return true
	}
}

func statusOf(err error) int {
	var pe *ProviderError
	if errors.As(err, &pe) {
		return pe.Status
	}
	var ae *anthropic.Error
	if errors.As(err, &ae) {
		return ae.StatusCode
	}
	return 0
}

// Describe "anthropic+gemini" ko'rinishidagi qisqa nom qaytaradi.
func (f *Fallback) Describe() string {
	names := make([]string, len(f.Providers))
	for i, p := range f.Providers {
		names[i] = p.Name
	}
	return strings.Join(names, "+")
}
