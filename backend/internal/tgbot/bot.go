// Package tgbot — o'z botimiz. Yagona vazifasi: foydalanuvchi o'z akkauntidan yuborgan
// "/start <nonce>" xabari orqali uning Telegram ID sini ishonchli aniqlash.
// Telegram sessiyasi yoki yozishmalar bu yerga kelmaydi.
package tgbot

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log/slog"
	"net/http"
	"strings"
	"time"
)

// Confirmer nonce'ni foydalanuvchiga bog'laydi (store ustidagi yupqa qatlam).
type Confirmer interface {
	ConfirmLogin(ctx context.Context, nonce string, tgID int64, firstName, username string) error
}

type Bot struct {
	token    string
	baseURL  string
	http     *http.Client
	confirm  Confirmer
	log      *slog.Logger
	Username string
}

func New(token, baseURL string, confirm Confirmer, log *slog.Logger) *Bot {
	return &Bot{
		token:   token,
		baseURL: strings.TrimRight(baseURL, "/"),
		http:    &http.Client{Timeout: 40 * time.Second},
		confirm: confirm,
		log:     log,
	}
}

type Update struct {
	UpdateID int64    `json:"update_id"`
	Message  *Message `json:"message"`
}

type Message struct {
	Text string `json:"text"`
	From *struct {
		ID        int64  `json:"id"`
		IsBot     bool   `json:"is_bot"`
		FirstName string `json:"first_name"`
		Username  string `json:"username"`
	} `json:"from"`
	Chat struct {
		ID   int64  `json:"id"`
		Type string `json:"type"`
	} `json:"chat"`
}

func (b *Bot) call(ctx context.Context, method string, params any, out any) error {
	body, err := json.Marshal(params)
	if err != nil {
		return err
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodPost,
		fmt.Sprintf("%s/bot%s/%s", b.baseURL, b.token, method), bytes.NewReader(body))
	if err != nil {
		return err
	}
	req.Header.Set("Content-Type", "application/json")
	resp, err := b.http.Do(req)
	if err != nil {
		// Xato matnida token bo'lgan URL chiqib ketmasligi uchun
		return fmt.Errorf("bot api %s: so'rov bajarilmadi", method)
	}
	defer resp.Body.Close()
	var envelope struct {
		OK          bool            `json:"ok"`
		Description string          `json:"description"`
		Result      json.RawMessage `json:"result"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&envelope); err != nil {
		return fmt.Errorf("bot api %s: javobni o'qib bo'lmadi (HTTP %d)", method, resp.StatusCode)
	}
	if !envelope.OK {
		return fmt.Errorf("bot api %s: %s", method, envelope.Description)
	}
	if out != nil {
		return json.Unmarshal(envelope.Result, out)
	}
	return nil
}

// Init bot nomini aniqlaydi (klientga qaytariladi).
func (b *Bot) Init(ctx context.Context) error {
	var me struct {
		Username string `json:"username"`
	}
	if err := b.call(ctx, "getMe", struct{}{}, &me); err != nil {
		return err
	}
	b.Username = me.Username
	return nil
}

// Run long-polling bilan yangilanishlarni o'qiydi; ctx bekor bo'lguncha ishlaydi.
func (b *Bot) Run(ctx context.Context) {
	var offset int64
	for ctx.Err() == nil {
		var updates []Update
		err := b.call(ctx, "getUpdates", map[string]any{
			"offset": offset, "timeout": 30, "allowed_updates": []string{"message"},
		}, &updates)
		if err != nil {
			if ctx.Err() != nil {
				return
			}
			b.log.Warn("bot: yangilanishlarni olib bo'lmadi", "err", err)
			select {
			case <-ctx.Done():
				return
			case <-time.After(3 * time.Second):
			}
			continue
		}
		for _, u := range updates {
			offset = u.UpdateID + 1
			b.HandleUpdate(ctx, u)
		}
	}
}

// HandleUpdate bitta yangilanishni qayta ishlaydi.
func (b *Bot) HandleUpdate(ctx context.Context, u Update) {
	m := u.Message
	// Faqat shaxsiy chatdagi odam yuborgan xabar: guruhda boshqa birov nonce'ni yubora olmasin.
	if m == nil || m.From == nil || m.From.IsBot || m.Chat.Type != "private" {
		return
	}
	nonce, ok := strings.CutPrefix(strings.TrimSpace(m.Text), "/start ")
	nonce = strings.TrimSpace(nonce)
	if !ok || nonce == "" {
		b.reply(ctx, m.Chat.ID, "Bu bot Tg-crazy ilovasiga ulanishni tasdiqlash uchun. Ulanishni ilovadan boshlang.")
		return
	}
	err := b.confirm.ConfirmLogin(ctx, nonce, m.From.ID, m.From.FirstName, m.From.Username)
	switch {
	case err == nil:
		b.reply(ctx, m.Chat.ID, "✅ Tasdiqlandi. Tg-crazy ilovasiga qaytishingiz mumkin.")
	case errors.Is(err, ErrBadNonce):
		b.reply(ctx, m.Chat.ID, "Kod yaroqsiz yoki muddati o'tgan. Ilovada ulanishni qaytadan boshlang.")
	default:
		b.log.Error("bot: tasdiqlashda xato", "err", err)
		b.reply(ctx, m.Chat.ID, "Xatolik yuz berdi. Birozdan keyin urinib ko'ring.")
	}
}

// ErrBadNonce — Confirmer yaroqsiz kod uchun qaytaradi.
var ErrBadNonce = errors.New("yaroqsiz kod")

func (b *Bot) reply(ctx context.Context, chatID int64, text string) {
	if err := b.call(ctx, "sendMessage", map[string]any{"chat_id": chatID, "text": text}, nil); err != nil {
		b.log.Warn("bot: javob yuborilmadi", "err", err)
	}
}
