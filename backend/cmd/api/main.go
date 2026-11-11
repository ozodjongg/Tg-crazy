// Tg-crazy backend: akkaunt/obuna, sozlamalar sinxroni va AI.
//
//	api                                  — serverni ishga tushiradi
//	api grant -tg <id> -plan pro -days 30 — obunani qo'lda beradi
package main

import (
	"context"
	"errors"
	"flag"
	"fmt"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/ozodjongg/tg-crazy/backend/internal/ai"
	"github.com/ozodjongg/tg-crazy/backend/internal/auth"
	"github.com/ozodjongg/tg-crazy/backend/internal/config"
	"github.com/ozodjongg/tg-crazy/backend/internal/httpapi"
	"github.com/ozodjongg/tg-crazy/backend/internal/store"
	"github.com/ozodjongg/tg-crazy/backend/internal/tgbot"
)

func main() {
	log := slog.New(slog.NewJSONHandler(os.Stdout, nil))
	if err := run(log); err != nil {
		log.Error("to'xtadi", "err", err)
		os.Exit(1)
	}
}

func run(log *slog.Logger) error {
	cfg, err := config.Load()
	if err != nil {
		return err
	}
	ctx, stop := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
	defer stop()

	st, err := store.Open(ctx, cfg.DatabaseURL)
	if err != nil {
		return err
	}
	defer st.Close()
	if err := st.Migrate(ctx); err != nil {
		return fmt.Errorf("migratsiya: %w", err)
	}

	if len(os.Args) > 1 && os.Args[1] == "grant" {
		return grant(ctx, st, os.Args[2:])
	}

	srv := &httpapi.Server{
		Store:       st,
		Tokens:      auth.NewTokens(cfg.JWTSecret, cfg.AccessTTL),
		Log:         log,
		CORSOrigins: cfg.CORSOrigins,
		RefreshTTL:  cfg.RefreshTTL,
		NonceTTL:    cfg.NonceTTL,
		BotUsername: func() string { return "" },
		AITimeout:   2 * time.Minute,
	}
	if cfg.AnthropicAPIKey != "" {
		srv.AI = ai.NewService(ai.NewClaude(cfg.AnthropicAPIKey, cfg.AIModel), cfg.AIMaxInputChars)
	} else {
		log.Warn("ANTHROPIC_API_KEY yo'q — AI yo'llari o'chirilgan")
	}
	if cfg.BotToken != "" {
		bot := tgbot.New(cfg.BotToken, cfg.BotAPIURL, srv, log)
		if err := bot.Init(ctx); err != nil {
			return fmt.Errorf("bot: %w", err)
		}
		srv.BotUsername = func() string { return bot.Username }
		go bot.Run(ctx)
		log.Info("bot ishga tushdi", "username", bot.Username)
	} else {
		log.Warn("BOT_TOKEN yo'q — ulanish (auth) o'chirilgan")
	}

	httpSrv := &http.Server{
		Addr:              cfg.Addr,
		Handler:           srv.Handler(),
		ReadHeaderTimeout: 10 * time.Second,
		// AI so'rovlari uzoq davom etishi mumkin
		WriteTimeout: srv.AITimeout + 30*time.Second,
	}
	errc := make(chan error, 1)
	go func() { errc <- httpSrv.ListenAndServe() }()
	log.Info("server ishga tushdi", "addr", cfg.Addr)

	select {
	case err := <-errc:
		return err
	case <-ctx.Done():
	}
	shutdownCtx, cancel := context.WithTimeout(context.Background(), 20*time.Second)
	defer cancel()
	if err := httpSrv.Shutdown(shutdownCtx); err != nil && !errors.Is(err, http.ErrServerClosed) {
		return err
	}
	return nil
}

func grant(ctx context.Context, st *store.Store, args []string) error {
	fs := flag.NewFlagSet("grant", flag.ContinueOnError)
	tgID := fs.Int64("tg", 0, "foydalanuvchining Telegram ID si")
	plan := fs.String("plan", "pro", "tarif")
	days := fs.Int("days", 30, "necha kunga")
	if err := fs.Parse(args); err != nil {
		return err
	}
	if *tgID == 0 || *days <= 0 {
		return errors.New("-tg va musbat -days kerak")
	}
	u, err := st.UserByTgID(ctx, *tgID)
	if errors.Is(err, store.ErrNotFound) {
		return fmt.Errorf("tg_id=%d foydalanuvchi hali ilovaga ulanmagan", *tgID)
	}
	if err != nil {
		return err
	}
	if err := st.GrantSubscription(ctx, u.ID, *plan, time.Duration(*days)*24*time.Hour); err != nil {
		return err
	}
	sub, err := st.ActiveSubscription(ctx, u.ID)
	if err != nil {
		return err
	}
	fmt.Printf("%s (tg %d): %s tarifi, %s gacha\n", u.FirstName, u.TgID, sub.Plan.Name, sub.ExpiresAt.Format("2006-01-02"))
	return nil
}
