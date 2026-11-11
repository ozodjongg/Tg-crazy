// Package httpapi — HTTP API.
package httpapi

import (
	"context"
	"encoding/json"
	"errors"
	"log/slog"
	"net/http"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"
	"github.com/go-chi/httprate"

	"github.com/ozodjongg/tg-crazy/backend/internal/ai"
	"github.com/ozodjongg/tg-crazy/backend/internal/auth"
	"github.com/ozodjongg/tg-crazy/backend/internal/store"
	"github.com/ozodjongg/tg-crazy/backend/internal/tgbot"
)

type Server struct {
	Store       *store.Store
	Tokens      *auth.Tokens
	AI          *ai.Service
	Log         *slog.Logger
	CORSOrigins []string
	RefreshTTL  time.Duration
	NonceTTL    time.Duration
	// BotUsername bo'sh bo'lsa bot sozlanmagan — ulanish yo'llari 503 qaytaradi.
	BotUsername func() string
	AITimeout   time.Duration
}

func (s *Server) Handler() http.Handler {
	r := chi.NewRouter()
	r.Use(middleware.RequestID, middleware.RealIP, s.logRequests, middleware.Recoverer)
	r.Use(cors.Handler(cors.Options{
		AllowedOrigins: s.CORSOrigins,
		AllowedMethods: []string{"GET", "POST", "PUT", "OPTIONS"},
		AllowedHeaders: []string{"Authorization", "Content-Type"},
		MaxAge:         600,
	}))
	r.Use(func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, req *http.Request) {
			req.Body = http.MaxBytesReader(w, req.Body, 1<<20)
			next.ServeHTTP(w, req)
		})
	})

	r.Get("/healthz", s.health)

	r.Route("/v1", func(r chi.Router) {
		r.Get("/billing/plans", s.listPlans)

		r.Group(func(r chi.Router) {
			// Kirish yo'llari: bitta manzildan daqiqasiga 30 ta so'rov
			r.Use(httprate.LimitByIP(30, time.Minute))
			r.Post("/auth/start", s.authStart)
			r.Post("/auth/complete", s.authComplete)
			r.Post("/auth/refresh", s.authRefresh)
			r.Post("/auth/logout", s.authLogout)
		})

		r.Group(func(r chi.Router) {
			r.Use(s.requireUser)
			r.Get("/me", s.me)
			r.Get("/settings", s.getSettings)
			r.Put("/settings", s.putSettings)
			r.Get("/billing/subscription", s.subscription)
			r.Post("/ai/summarize", s.aiSummarize)
			r.Post("/ai/translate", s.aiTranslate)
			r.Post("/ai/reply-draft", s.aiReplyDraft)
		})
	})
	return r
}

// ConfirmLogin tgbot.Confirmer ni amalga oshiradi.
func (s *Server) ConfirmLogin(ctx context.Context, nonce string, tgID int64, firstName, username string) error {
	u, err := s.Store.UpsertUser(ctx, tgID, firstName, username)
	if err != nil {
		return err
	}
	if err := s.Store.ConfirmNonce(ctx, nonce, u.ID); err != nil {
		if errors.Is(err, store.ErrNotFound) {
			return tgbot.ErrBadNonce
		}
		return err
	}
	return nil
}

// ---- yordamchilar ----

type ctxKey struct{}

func userID(r *http.Request) int64 { return r.Context().Value(ctxKey{}).(int64) }

func (s *Server) requireUser(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		token, ok := strings.CutPrefix(r.Header.Get("Authorization"), "Bearer ")
		if !ok {
			writeError(w, http.StatusUnauthorized, "unauthorized", "Avtorizatsiya kerak")
			return
		}
		id, err := s.Tokens.Verify(token)
		if err != nil {
			writeError(w, http.StatusUnauthorized, "token_invalid", "Token yaroqsiz yoki muddati o'tgan")
			return
		}
		next.ServeHTTP(w, r.WithContext(context.WithValue(r.Context(), ctxKey{}, id)))
	})
}

func (s *Server) logRequests(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		ww := middleware.NewWrapResponseWriter(w, r.ProtoMajor)
		start := time.Now()
		next.ServeHTTP(ww, r)
		// So'rov tanasi (xabarlar matni) hech qachon logga yozilmaydi
		s.Log.Info("http", "method", r.Method, "path", r.URL.Path, "status", ww.Status(),
			"ms", time.Since(start).Milliseconds(), "id", middleware.GetReqID(r.Context()))
	})
}

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(v)
}

func writeError(w http.ResponseWriter, status int, code, message string) {
	writeJSON(w, status, map[string]any{"error": map[string]string{"code": code, "message": message}})
}

func (s *Server) internal(w http.ResponseWriter, r *http.Request, err error) {
	s.Log.Error("ichki xato", "err", err, "path", r.URL.Path, "id", middleware.GetReqID(r.Context()))
	writeError(w, http.StatusInternalServerError, "internal", "Ichki xatolik")
}

// decode JSON tanani o'qiydi; xato bo'lsa javobni o'zi yozadi va false qaytaradi.
func decode(w http.ResponseWriter, r *http.Request, v any) bool {
	dec := json.NewDecoder(r.Body)
	dec.DisallowUnknownFields()
	if err := dec.Decode(v); err != nil {
		var tooBig *http.MaxBytesError
		if errors.As(err, &tooBig) {
			writeError(w, http.StatusRequestEntityTooLarge, "too_large", "So'rov juda katta")
		} else {
			writeError(w, http.StatusBadRequest, "bad_json", "So'rov formati noto'g'ri")
		}
		return false
	}
	return true
}

func (s *Server) health(w http.ResponseWriter, r *http.Request) {
	if err := s.Store.Ping(r.Context()); err != nil {
		writeError(w, http.StatusServiceUnavailable, "db_down", "Baza javob bermayapti")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"status": "ok",
		"auth":   s.BotUsername() != "",
		"ai":     s.AI != nil,
	})
}
