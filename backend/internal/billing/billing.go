// Package billing: to'lov provayderlari uchun interfeys.
//
// Tariflar va obuna holati store paketida. Haqiqiy to'lov (Click, Payme) ulanmaguncha
// obuna qo'lda beriladi: `api grant -tg <id> -plan pro -days 30`.
package billing

import (
	"context"
	"errors"
)

// ErrNotConfigured — to'lov provayderi hali ulanmagan.
var ErrNotConfigured = errors.New("to'lov tizimi ulanmagan")

// Invoice — foydalanuvchi to'lashi kerak bo'lgan hisob.
type Invoice struct {
	ID        string
	PayURL    string
	AmountUZS int
}

// Provider Click/Payme kabi tizimlar uchun umumiy shakl.
type Provider interface {
	// CreateInvoice tarif uchun to'lov havolasini yaratadi.
	CreateInvoice(ctx context.Context, userID int64, planID string, amountUZS int) (Invoice, error)
}

// Disabled — provayder ulanmagan holat.
type Disabled struct{}

func (Disabled) CreateInvoice(context.Context, int64, string, int) (Invoice, error) {
	return Invoice{}, ErrNotConfigured
}
