package httpapi_test

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"os"
	"sync"
	"testing"
	"time"

	"github.com/ozodjongg/tg-crazy/backend/internal/ai"
	"github.com/ozodjongg/tg-crazy/backend/internal/auth"
	"github.com/ozodjongg/tg-crazy/backend/internal/httpapi"
	"github.com/ozodjongg/tg-crazy/backend/internal/store"
	"github.com/ozodjongg/tg-crazy/backend/internal/tgbot"
)

type fakeAI struct {
	mu    sync.Mutex
	fail  error
	calls int
}

func (f *fakeAI) Complete(context.Context, string, string) (string, ai.Usage, error) {
	f.mu.Lock()
	defer f.mu.Unlock()
	f.calls++
	if f.fail != nil {
		return "", ai.Usage{}, f.fail
	}
	return "xulosa", ai.Usage{InputTokens: 100, OutputTokens: 20}, nil
}

type env struct {
	t     *testing.T
	url   string
	store *store.Store
	bot   *tgbot.Bot
	ai    *fakeAI
	sent  *[]string
}

// setup haqiqiy Postgres (TEST_DATABASE_URL) va soxta Bot API bilan serverni ko'taradi.
func setup(t *testing.T) *env {
	t.Helper()
	dsn := os.Getenv("TEST_DATABASE_URL")
	if dsn == "" {
		t.Skip("TEST_DATABASE_URL ko'rsatilmagan")
	}
	ctx := context.Background()
	st, err := store.Open(ctx, dsn)
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(st.Close)
	if err := st.Migrate(ctx); err != nil {
		t.Fatal(err)
	}

	var sent []string
	botAPI := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		var body struct {
			Text string `json:"text"`
		}
		_ = json.NewDecoder(r.Body).Decode(&body)
		sent = append(sent, body.Text)
		_, _ = io.WriteString(w, `{"ok":true,"result":{}}`)
	}))
	t.Cleanup(botAPI.Close)

	log := slog.New(slog.NewTextHandler(io.Discard, nil))
	f := &fakeAI{}
	srv := &httpapi.Server{
		Store:       st,
		Tokens:      auth.NewTokens([]byte("test-secret-test-secret-test-secret"), time.Minute),
		AI:          ai.NewService(f, 2000),
		Log:         log,
		CORSOrigins: []string{"http://localhost:3000"},
		RefreshTTL:  time.Hour,
		NonceTTL:    time.Minute,
		BotUsername: func() string { return "tgcrazy_test_bot" },
		AITimeout:   5 * time.Second,
	}
	ts := httptest.NewServer(srv.Handler())
	t.Cleanup(ts.Close)
	return &env{t: t, url: ts.URL, store: st, bot: tgbot.New("TOKEN", botAPI.URL, srv, log), ai: f, sent: &sent}
}

func (e *env) do(method, path, token string, body any, out any) int {
	e.t.Helper()
	var r io.Reader
	if body != nil {
		b, _ := json.Marshal(body)
		r = bytes.NewReader(b)
	}
	req, _ := http.NewRequest(method, e.url+path, r)
	if token != "" {
		req.Header.Set("Authorization", "Bearer "+token)
	}
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		e.t.Fatal(err)
	}
	defer resp.Body.Close()
	raw, _ := io.ReadAll(resp.Body)
	if out != nil && len(raw) > 0 {
		if err := json.Unmarshal(raw, out); err != nil {
			e.t.Fatalf("%s %s: javob JSON emas: %s", method, path, raw)
		}
	}
	return resp.StatusCode
}

func (e *env) startMessage(tgID int64, chatType, text string) {
	var u tgbot.Update
	raw := map[string]any{"update_id": 1, "message": map[string]any{
		"text": text,
		"from": map[string]any{"id": tgID, "first_name": "Sinov", "username": "sinov"},
		"chat": map[string]any{"id": tgID, "type": chatType},
	}}
	b, _ := json.Marshal(raw)
	_ = json.Unmarshal(b, &u)
	e.bot.HandleUpdate(context.Background(), u)
}

type tokens struct {
	AccessToken  string `json:"access_token"`
	RefreshToken string `json:"refresh_token"`
}

// login to'liq oqimni bajaradi: start → botga xabar → complete.
func (e *env) login(tgID int64) tokens {
	e.t.Helper()
	var start struct{ Nonce, Secret string }
	if code := e.do("POST", "/v1/auth/start", "", nil, &start); code != 200 {
		e.t.Fatalf("start: %d", code)
	}
	e.startMessage(tgID, "private", "/start "+start.Nonce)
	var tok tokens
	if code := e.do("POST", "/v1/auth/complete", "", map[string]string{"nonce": start.Nonce, "secret": start.Secret}, &tok); code != 200 {
		e.t.Fatalf("complete: %d", code)
	}
	return tok
}

// Har test o'z foydalanuvchisi bilan ishlaydi, shunda takroriy ishga tushirish xalaqit bermaydi.
func uniqueTgID() int64 { return time.Now().UnixNano() }

func TestAuthFlow(t *testing.T) {
	e := setup(t)
	var start struct {
		Nonce, Secret string
		BotUsername   string `json:"bot_username"`
	}
	if code := e.do("POST", "/v1/auth/start", "", nil, &start); code != 200 || start.BotUsername != "tgcrazy_test_bot" {
		t.Fatalf("start: %d %+v", code, start)
	}
	creds := map[string]string{"nonce": start.Nonce, "secret": start.Secret}

	// Bot hali tasdiqlamagan
	if code := e.do("POST", "/v1/auth/complete", "", creds, nil); code != 202 {
		t.Fatalf("kutilayotgan holat: %d", code)
	}
	// Guruhdan kelgan xabar hisobga olinmaydi
	tgID := uniqueTgID()
	e.startMessage(tgID, "group", "/start "+start.Nonce)
	if code := e.do("POST", "/v1/auth/complete", "", creds, nil); code != 202 {
		t.Fatalf("guruh xabari tasdiq sifatida qabul qilindi: %d", code)
	}
	// Noto'g'ri secret — nonce'ni bilgan begona kira olmaydi
	e.startMessage(tgID, "private", "/start "+start.Nonce)
	if code := e.do("POST", "/v1/auth/complete", "", map[string]string{"nonce": start.Nonce, "secret": "boshqa"}, nil); code != 400 {
		t.Fatalf("noto'g'ri secret: %d", code)
	}
	var tok tokens
	if code := e.do("POST", "/v1/auth/complete", "", creds, &tok); code != 200 || tok.AccessToken == "" {
		t.Fatalf("complete: %d", code)
	}
	// Nonce bir martalik
	if code := e.do("POST", "/v1/auth/complete", "", creds, nil); code != 400 {
		t.Fatalf("nonce qayta ishlatildi: %d", code)
	}
	// Ishlatilgan nonce'ni boshqa akkaunt qayta tasdiqlay olmaydi
	e.startMessage(uniqueTgID(), "private", "/start "+start.Nonce)
	if last := (*e.sent)[len(*e.sent)-1]; last == "" || last[0] == 0xE2 {
		t.Fatalf("ishlatilgan kod uchun bot javobi: %q", last)
	}

	var me struct {
		User struct {
			TgID int64 `json:"tg_id"`
		} `json:"user"`
		Subscription struct {
			Plan struct{ ID string } `json:"plan"`
		} `json:"subscription"`
	}
	if code := e.do("GET", "/v1/me", tok.AccessToken, nil, &me); code != 200 || me.User.TgID != tgID || me.Subscription.Plan.ID != "free" {
		t.Fatalf("me: %d %+v", code, me)
	}
	if code := e.do("GET", "/v1/me", "", nil, nil); code != 401 {
		t.Fatalf("tokensiz: %d", code)
	}
	if code := e.do("GET", "/v1/me", "yolg'on", nil, nil); code != 401 {
		t.Fatalf("yolg'on token: %d", code)
	}

	// Refresh aylanadi: eski token ikkinchi marta ishlamaydi
	var tok2 tokens
	if code := e.do("POST", "/v1/auth/refresh", "", map[string]string{"refresh_token": tok.RefreshToken}, &tok2); code != 200 {
		t.Fatalf("refresh: %d", code)
	}
	if code := e.do("POST", "/v1/auth/refresh", "", map[string]string{"refresh_token": tok.RefreshToken}, nil); code != 401 {
		t.Fatalf("eski refresh qayta ishladi: %d", code)
	}
	if code := e.do("POST", "/v1/auth/logout", "", map[string]string{"refresh_token": tok2.RefreshToken}, nil); code != 204 {
		t.Fatalf("logout: %d", code)
	}
	if code := e.do("POST", "/v1/auth/refresh", "", map[string]string{"refresh_token": tok2.RefreshToken}, nil); code != 401 {
		t.Fatalf("chiqilgandan keyin refresh ishladi: %d", code)
	}
}

func TestSettings(t *testing.T) {
	e := setup(t)
	a := e.login(uniqueTgID()).AccessToken

	var st struct {
		Data    map[string]any `json:"data"`
		Version int64          `json:"version"`
	}
	if code := e.do("GET", "/v1/settings", a, nil, &st); code != 200 || st.Version != 0 || len(st.Data) != 0 {
		t.Fatalf("bo'sh sozlamalar: %d %+v", code, st)
	}
	put := func(data any, version int64, out any) int {
		return e.do("PUT", "/v1/settings", a, map[string]any{"data": data, "version": version}, out)
	}
	if code := put(map[string]any{"theme": "dark"}, 0, &st); code != 200 || st.Version != 1 {
		t.Fatalf("birinchi yozuv: %d %+v", code, st)
	}
	if code := put(map[string]any{"theme": "light"}, 1, &st); code != 200 || st.Version != 2 {
		t.Fatalf("ikkinchi yozuv: %d %+v", code, st)
	}
	// Eski versiya bilan yozish — ziddiyat, javobda amaldagi holat
	var conflict struct {
		Current struct {
			Data    map[string]any `json:"data"`
			Version int64          `json:"version"`
		} `json:"current"`
	}
	if code := put(map[string]any{"theme": "dark"}, 1, &conflict); code != 409 || conflict.Current.Version != 2 || conflict.Current.Data["theme"] != "light" {
		t.Fatalf("ziddiyat: %d %+v", code, conflict)
	}
	if code := put([]int{1}, 2, nil); code != 400 {
		t.Fatalf("obyekt bo'lmagan sozlama: %d", code)
	}
	// Boshqa foydalanuvchi buni ko'rmaydi
	b := e.login(uniqueTgID()).AccessToken
	if code := e.do("GET", "/v1/settings", b, nil, &st); code != 200 || st.Version != 0 {
		t.Fatalf("begona sozlamalar ko'rindi: %+v", st)
	}
}

func TestAIQuotaAndSubscription(t *testing.T) {
	e := setup(t)
	tgID := uniqueTgID()
	a := e.login(tgID).AccessToken
	ctx := context.Background()

	var res struct {
		Text string `json:"text"`
		AI   struct{ Used, Limit int }
	}
	body := map[string]any{"messages": []map[string]any{{"sender": "Ali", "text": "Salom"}}, "lang": "uz"}
	if code := e.do("POST", "/v1/ai/summarize", a, body, &res); code != 200 || res.Text != "xulosa" || res.AI.Used != 1 || res.AI.Limit != 10 {
		t.Fatalf("summarize: %d %+v", code, res)
	}
	// Xato so'rovlar kvotadan yechilmaydi
	if code := e.do("POST", "/v1/ai/translate", a, map[string]string{"text": " ", "lang": "en"}, nil); code != 400 {
		t.Fatalf("bo'sh matn: %d", code)
	}
	e.ai.fail = errors.New("uzildi")
	if code := e.do("POST", "/v1/ai/translate", a, map[string]string{"text": "salom", "lang": "en"}, nil); code != 502 {
		t.Fatalf("provayder xatosi: %d", code)
	}
	e.ai.fail = ai.ErrRefused
	if code := e.do("POST", "/v1/ai/reply-draft", a, body, nil); code != 422 {
		t.Fatalf("rad etish: %d", code)
	}
	e.ai.fail = nil
	var me struct {
		AI struct{ Used, Limit int }
	}
	e.do("GET", "/v1/me", a, nil, &me)
	if me.AI.Used != 1 {
		t.Fatalf("xato so'rovlar kvotadan yechilgan: %+v", me.AI)
	}

	// Bepul limit (10) tugaguncha
	for i := 2; i <= 10; i++ {
		if code := e.do("POST", "/v1/ai/translate", a, map[string]string{"text": "salom", "lang": "en"}, nil); code != 200 {
			t.Fatalf("%d-so'rov: %d", i, code)
		}
	}
	calls := e.ai.calls
	if code := e.do("POST", "/v1/ai/translate", a, map[string]string{"text": "salom", "lang": "en"}, nil); code != 429 {
		t.Fatalf("limitdan keyin: %d", code)
	}
	if e.ai.calls != calls {
		t.Fatal("limit tugaganda ham model chaqirildi")
	}

	// Pro obuna limitni ko'taradi
	u, err := e.store.UserByTgID(ctx, tgID)
	if err != nil {
		t.Fatal(err)
	}
	if err := e.store.GrantSubscription(ctx, u.ID, "pro", 24*time.Hour); err != nil {
		t.Fatal(err)
	}
	if code := e.do("POST", "/v1/ai/translate", a, map[string]string{"text": "salom", "lang": "en"}, &res); code != 200 || res.AI.Limit != 200 || res.AI.Used != 11 {
		t.Fatalf("pro: %d %+v", code, res)
	}
	var sub struct {
		Plan      struct{ ID string } `json:"plan"`
		ExpiresAt *time.Time          `json:"expires_at"`
	}
	if code := e.do("GET", "/v1/billing/subscription", a, nil, &sub); code != 200 || sub.Plan.ID != "pro" || sub.ExpiresAt == nil {
		t.Fatalf("obuna: %d %+v", code, sub)
	}
	var plans struct {
		Plans []struct{ ID string } `json:"plans"`
	}
	if code := e.do("GET", "/v1/billing/plans", "", nil, &plans); code != 200 || len(plans.Plans) != 2 {
		t.Fatalf("tariflar: %d %+v", code, plans)
	}
}

func TestConcurrentQuota(t *testing.T) {
	e := setup(t)
	a := e.login(uniqueTgID()).AccessToken
	var wg sync.WaitGroup
	var mu sync.Mutex
	ok := 0
	for range 25 {
		wg.Add(1)
		go func() {
			defer wg.Done()
			if e.do("POST", "/v1/ai/translate", a, map[string]string{"text": "salom", "lang": "en"}, nil) == 200 {
				mu.Lock()
				ok++
				mu.Unlock()
			}
		}()
	}
	wg.Wait()
	if ok != 10 {
		t.Fatalf("parallel so'rovlarda limit buzildi: %d ta o'tdi (10 bo'lishi kerak)", ok)
	}
}
