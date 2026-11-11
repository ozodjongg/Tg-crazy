package httpapi

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"time"

	"github.com/ozodjongg/tg-crazy/backend/internal/ai"
	"github.com/ozodjongg/tg-crazy/backend/internal/auth"
	"github.com/ozodjongg/tg-crazy/backend/internal/store"
)

// ---- Kirish ----

func (s *Server) authStart(w http.ResponseWriter, r *http.Request) {
	bot := s.BotUsername()
	if bot == "" {
		writeError(w, http.StatusServiceUnavailable, "auth_disabled", "Tasdiqlash boti sozlanmagan")
		return
	}
	nonce, secret := auth.RandomToken(16), auth.RandomToken(32)
	if err := s.Store.CreateNonce(r.Context(), nonce, auth.Hash(secret), s.NonceTTL); err != nil {
		s.internal(w, r, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"nonce":        nonce,
		"secret":       secret,
		"bot_username": bot,
		"expires_in":   int(s.NonceTTL.Seconds()),
	})
}

type tokenPair struct {
	AccessToken  string `json:"access_token"`
	RefreshToken string `json:"refresh_token"`
	ExpiresIn    int    `json:"expires_in"`
}

func (s *Server) issueTokens(ctx context.Context, uid int64) (tokenPair, error) {
	access, err := s.Tokens.Issue(uid)
	if err != nil {
		return tokenPair{}, err
	}
	refresh := auth.RandomToken(32)
	if err := s.Store.SaveRefreshToken(ctx, auth.Hash(refresh), uid, s.RefreshTTL); err != nil {
		return tokenPair{}, err
	}
	return tokenPair{AccessToken: access, RefreshToken: refresh, ExpiresIn: int(s.Tokens.TTL().Seconds())}, nil
}

func (s *Server) authComplete(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Nonce  string `json:"nonce"`
		Secret string `json:"secret"`
	}
	if !decode(w, r, &req) {
		return
	}
	uid, pending, err := s.Store.ConsumeNonce(r.Context(), req.Nonce, auth.Hash(req.Secret))
	switch {
	case errors.Is(err, store.ErrNotFound):
		writeError(w, http.StatusBadRequest, "nonce_invalid", "Kod yaroqsiz yoki muddati o'tgan")
		return
	case err != nil:
		s.internal(w, r, err)
		return
	case pending:
		writeJSON(w, http.StatusAccepted, map[string]bool{"pending": true})
		return
	}
	pair, err := s.issueTokens(r.Context(), uid)
	if err != nil {
		s.internal(w, r, err)
		return
	}
	writeJSON(w, http.StatusOK, pair)
}

func (s *Server) authRefresh(w http.ResponseWriter, r *http.Request) {
	var req struct {
		RefreshToken string `json:"refresh_token"`
	}
	if !decode(w, r, &req) {
		return
	}
	uid, err := s.Store.RotateRefreshToken(r.Context(), auth.Hash(req.RefreshToken))
	if errors.Is(err, store.ErrNotFound) {
		writeError(w, http.StatusUnauthorized, "refresh_invalid", "Qaytadan ulanish kerak")
		return
	}
	if err != nil {
		s.internal(w, r, err)
		return
	}
	pair, err := s.issueTokens(r.Context(), uid)
	if err != nil {
		s.internal(w, r, err)
		return
	}
	writeJSON(w, http.StatusOK, pair)
}

func (s *Server) authLogout(w http.ResponseWriter, r *http.Request) {
	var req struct {
		RefreshToken string `json:"refresh_token"`
	}
	if !decode(w, r, &req) {
		return
	}
	if err := s.Store.RevokeRefreshToken(r.Context(), auth.Hash(req.RefreshToken)); err != nil {
		s.internal(w, r, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

// ---- Profil, sozlamalar, obuna ----

type aiQuota struct {
	Used  int `json:"used"`
	Limit int `json:"limit"`
}

func (s *Server) quota(ctx context.Context, uid int64) (store.Subscription, aiQuota, error) {
	sub, err := s.Store.ActiveSubscription(ctx, uid)
	if err != nil {
		return sub, aiQuota{}, err
	}
	used, err := s.Store.AIUsedToday(ctx, uid)
	return sub, aiQuota{Used: used, Limit: sub.Plan.DailyAILimit}, err
}

func (s *Server) me(w http.ResponseWriter, r *http.Request) {
	u, err := s.Store.GetUser(r.Context(), userID(r))
	if errors.Is(err, store.ErrNotFound) {
		writeError(w, http.StatusUnauthorized, "token_invalid", "Foydalanuvchi topilmadi")
		return
	}
	if err != nil {
		s.internal(w, r, err)
		return
	}
	sub, q, err := s.quota(r.Context(), u.ID)
	if err != nil {
		s.internal(w, r, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"user": u, "subscription": sub, "ai": q, "ai_enabled": s.AI != nil,
	})
}

func (s *Server) getSettings(w http.ResponseWriter, r *http.Request) {
	st, err := s.Store.GetSettings(r.Context(), userID(r))
	if err != nil {
		s.internal(w, r, err)
		return
	}
	writeJSON(w, http.StatusOK, st)
}

const maxSettingsBytes = 64 << 10

func (s *Server) putSettings(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Data    json.RawMessage `json:"data"`
		Version int64           `json:"version"`
	}
	if !decode(w, r, &req) {
		return
	}
	var obj map[string]json.RawMessage
	if len(req.Data) > maxSettingsBytes || json.Unmarshal(req.Data, &obj) != nil || obj == nil {
		writeError(w, http.StatusBadRequest, "bad_settings", "Sozlamalar 64 KB dan kichik JSON obyekt bo'lishi kerak")
		return
	}
	st, err := s.Store.PutSettings(r.Context(), userID(r), req.Data, req.Version)
	if errors.Is(err, store.ErrConflict) {
		current, gerr := s.Store.GetSettings(r.Context(), userID(r))
		if gerr != nil {
			s.internal(w, r, gerr)
			return
		}
		writeJSON(w, http.StatusConflict, map[string]any{
			"error":   map[string]string{"code": "version_conflict", "message": "Sozlamalar boshqa qurilmada o'zgargan"},
			"current": current,
		})
		return
	}
	if err != nil {
		s.internal(w, r, err)
		return
	}
	writeJSON(w, http.StatusOK, st)
}

func (s *Server) listPlans(w http.ResponseWriter, r *http.Request) {
	plans, err := s.Store.ListPlans(r.Context())
	if err != nil {
		s.internal(w, r, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"plans": plans})
}

func (s *Server) subscription(w http.ResponseWriter, r *http.Request) {
	sub, err := s.Store.ActiveSubscription(r.Context(), userID(r))
	if err != nil {
		s.internal(w, r, err)
		return
	}
	writeJSON(w, http.StatusOK, sub)
}

// ---- AI ----

// runAI kvotani band qiladi, so'rovni bajaradi va natijani yozadi.
// Muvaffaqiyatsiz so'rov kvotadan yechilmaydi.
func (s *Server) runAI(w http.ResponseWriter, r *http.Request, call func(context.Context) (string, ai.Usage, error)) {
	if s.AI == nil {
		writeError(w, http.StatusServiceUnavailable, "ai_disabled", "AI sozlanmagan")
		return
	}
	uid := userID(r)
	sub, err := s.Store.ActiveSubscription(r.Context(), uid)
	if err != nil {
		s.internal(w, r, err)
		return
	}
	limit := sub.Plan.DailyAILimit
	used, err := s.Store.ReserveAIRequest(r.Context(), uid, limit)
	if errors.Is(err, store.ErrQuotaExceeded) {
		writeJSON(w, http.StatusTooManyRequests, map[string]any{
			"error": map[string]string{"code": "quota_exceeded", "message": "Bugungi AI limiti tugadi"},
			"ai":    aiQuota{Used: limit, Limit: limit},
		})
		return
	}
	if err != nil {
		s.internal(w, r, err)
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), s.AITimeout)
	defer cancel()
	text, usage, err := call(ctx)
	if err != nil {
		// Klient uzilib ketgan bo'lsa ham o'rinni qaytarish uchun alohida kontekst
		bg, cancelBG := context.WithTimeout(context.WithoutCancel(r.Context()), 5*time.Second)
		defer cancelBG()
		if rerr := s.Store.ReleaseAIRequest(bg, uid); rerr != nil {
			s.Log.Error("AI o'rnini qaytarib bo'lmadi", "err", rerr)
		}
		switch {
		case errors.Is(err, ai.ErrEmpty):
			writeError(w, http.StatusBadRequest, "empty", "Matn bo'sh")
		case errors.Is(err, ai.ErrTooLong):
			writeError(w, http.StatusRequestEntityTooLarge, "too_long", "Matn juda uzun — kamroq xabar tanlang")
		case errors.Is(err, ai.ErrRefused):
			writeError(w, http.StatusUnprocessableEntity, "refused", "AI bu so'rovni bajara olmadi")
		default:
			s.Log.Error("AI xatosi", "err", err)
			writeError(w, http.StatusBadGateway, "ai_failed", "AI xizmati javob bermadi")
		}
		return
	}
	if err := s.Store.AddAITokens(r.Context(), uid, usage.InputTokens, usage.OutputTokens); err != nil {
		s.Log.Error("AI tokenlarini yozib bo'lmadi", "err", err)
	}
	writeJSON(w, http.StatusOK, map[string]any{"text": text, "ai": aiQuota{Used: used, Limit: limit}})
}

func (s *Server) aiSummarize(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Messages []ai.ChatMessage `json:"messages"`
		Lang     string           `json:"lang"`
	}
	if !decode(w, r, &req) {
		return
	}
	s.runAI(w, r, func(ctx context.Context) (string, ai.Usage, error) {
		return s.AI.Summarize(ctx, req.Messages, req.Lang)
	})
}

func (s *Server) aiTranslate(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Text string `json:"text"`
		Lang string `json:"lang"`
	}
	if !decode(w, r, &req) {
		return
	}
	s.runAI(w, r, func(ctx context.Context) (string, ai.Usage, error) {
		return s.AI.Translate(ctx, req.Text, req.Lang)
	})
}

func (s *Server) aiReplyDraft(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Messages []ai.ChatMessage `json:"messages"`
		Hint     string           `json:"hint"`
		Lang     string           `json:"lang"`
	}
	if !decode(w, r, &req) {
		return
	}
	s.runAI(w, r, func(ctx context.Context) (string, ai.Usage, error) {
		return s.AI.ReplyDraft(ctx, req.Messages, req.Hint, req.Lang)
	})
}
