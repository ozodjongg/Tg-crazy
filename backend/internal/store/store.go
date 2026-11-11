// Package store Postgres bilan ishlaydi.
package store

import (
	"context"
	"embed"
	"encoding/json"
	"errors"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/jackc/pgx/v5/stdlib"
	"github.com/pressly/goose/v3"
)

//go:embed migrations/*.sql
var migrations embed.FS

var (
	ErrNotFound      = errors.New("topilmadi")
	ErrConflict      = errors.New("versiya mos kelmadi")
	ErrQuotaExceeded = errors.New("kunlik limit tugadi")
)

type Store struct {
	pool *pgxpool.Pool
}

func Open(ctx context.Context, url string) (*Store, error) {
	pool, err := pgxpool.New(ctx, url)
	if err != nil {
		return nil, err
	}
	if err := pool.Ping(ctx); err != nil {
		pool.Close()
		return nil, fmt.Errorf("bazaga ulanib bo'lmadi: %w", err)
	}
	return &Store{pool: pool}, nil
}

func (s *Store) Close() { s.pool.Close() }

func (s *Store) Ping(ctx context.Context) error { return s.pool.Ping(ctx) }

// Migrate barcha qo'llanmagan migratsiyalarni bajaradi.
func (s *Store) Migrate(ctx context.Context) error {
	goose.SetBaseFS(migrations)
	goose.SetLogger(goose.NopLogger())
	if err := goose.SetDialect("postgres"); err != nil {
		return err
	}
	db := stdlib.OpenDBFromPool(s.pool)
	defer db.Close()
	return goose.UpContext(ctx, db, "migrations")
}

// ---- Foydalanuvchilar ----

type User struct {
	ID        int64     `json:"id"`
	TgID      int64     `json:"tg_id"`
	FirstName string    `json:"first_name"`
	Username  string    `json:"username"`
	CreatedAt time.Time `json:"created_at"`
}

func (s *Store) UpsertUser(ctx context.Context, tgID int64, firstName, username string) (User, error) {
	var u User
	err := s.pool.QueryRow(ctx, `
		INSERT INTO users (tg_id, first_name, username) VALUES ($1, $2, $3)
		ON CONFLICT (tg_id) DO UPDATE SET first_name = EXCLUDED.first_name, username = EXCLUDED.username
		RETURNING id, tg_id, first_name, username, created_at`,
		tgID, firstName, username,
	).Scan(&u.ID, &u.TgID, &u.FirstName, &u.Username, &u.CreatedAt)
	return u, err
}

func (s *Store) GetUser(ctx context.Context, id int64) (User, error) {
	var u User
	err := s.pool.QueryRow(ctx,
		`SELECT id, tg_id, first_name, username, created_at FROM users WHERE id = $1`, id,
	).Scan(&u.ID, &u.TgID, &u.FirstName, &u.Username, &u.CreatedAt)
	return u, notFound(err)
}

// ---- Tasdiqlash (nonce) ----

func (s *Store) CreateNonce(ctx context.Context, nonce string, secretHash []byte, ttl time.Duration) error {
	_, err := s.pool.Exec(ctx,
		`INSERT INTO auth_nonces (nonce, secret_hash, expires_at) VALUES ($1, $2, now() + make_interval(secs => $3))`,
		nonce, secretHash, ttl.Seconds())
	return err
}

// ConfirmNonce botga kelgan xabar asosida nonce'ni foydalanuvchiga bog'laydi.
// Muddati o'tgan, ishlatilgan yoki allaqachon tasdiqlangan nonce uchun ErrNotFound.
func (s *Store) ConfirmNonce(ctx context.Context, nonce string, userID int64) error {
	tag, err := s.pool.Exec(ctx, `
		UPDATE auth_nonces SET user_id = $2
		WHERE nonce = $1 AND user_id IS NULL AND used_at IS NULL AND expires_at > now()`,
		nonce, userID)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

// ConsumeNonce tasdiqlangan nonce'ni bir marta ishlatadi va foydalanuvchi ID sini qaytaradi.
// pending=true — nonce mavjud, lekin bot hali tasdiqlamagan.
func (s *Store) ConsumeNonce(ctx context.Context, nonce string, secretHash []byte) (userID int64, pending bool, err error) {
	var uid *int64
	err = s.pool.QueryRow(ctx, `
		UPDATE auth_nonces SET used_at = now()
		WHERE nonce = $1 AND secret_hash = $2 AND user_id IS NOT NULL
		  AND used_at IS NULL AND expires_at > now()
		RETURNING user_id`, nonce, secretHash).Scan(&uid)
	if err == nil {
		return *uid, false, nil
	}
	if !errors.Is(err, pgx.ErrNoRows) {
		return 0, false, err
	}
	var exists bool
	err = s.pool.QueryRow(ctx, `
		SELECT EXISTS (SELECT 1 FROM auth_nonces
		WHERE nonce = $1 AND secret_hash = $2 AND user_id IS NULL AND used_at IS NULL AND expires_at > now())`,
		nonce, secretHash).Scan(&exists)
	if err != nil {
		return 0, false, err
	}
	if exists {
		return 0, true, nil
	}
	return 0, false, ErrNotFound
}

// ---- Refresh tokenlar ----

func (s *Store) SaveRefreshToken(ctx context.Context, hash []byte, userID int64, ttl time.Duration) error {
	_, err := s.pool.Exec(ctx,
		`INSERT INTO refresh_tokens (token_hash, user_id, expires_at) VALUES ($1, $2, now() + make_interval(secs => $3))`,
		hash, userID, ttl.Seconds())
	return err
}

// RotateRefreshToken eski tokenni bekor qiladi va egasini qaytaradi (bir martalik ishlatish).
func (s *Store) RotateRefreshToken(ctx context.Context, hash []byte) (int64, error) {
	var uid int64
	err := s.pool.QueryRow(ctx, `
		UPDATE refresh_tokens SET revoked_at = now()
		WHERE token_hash = $1 AND revoked_at IS NULL AND expires_at > now()
		RETURNING user_id`, hash).Scan(&uid)
	return uid, notFound(err)
}

func (s *Store) RevokeRefreshToken(ctx context.Context, hash []byte) error {
	_, err := s.pool.Exec(ctx,
		`UPDATE refresh_tokens SET revoked_at = now() WHERE token_hash = $1 AND revoked_at IS NULL`, hash)
	return err
}

// ---- Sozlamalar ----

type Settings struct {
	Data      json.RawMessage `json:"data"`
	Version   int64           `json:"version"`
	UpdatedAt time.Time       `json:"updated_at"`
}

func (s *Store) GetSettings(ctx context.Context, userID int64) (Settings, error) {
	var st Settings
	err := s.pool.QueryRow(ctx,
		`SELECT data, version, updated_at FROM settings WHERE user_id = $1`, userID,
	).Scan(&st.Data, &st.Version, &st.UpdatedAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return Settings{Data: json.RawMessage(`{}`)}, nil
	}
	return st, err
}

// PutSettings sozlamalarni saqlaydi. baseVersion klient ko'rgan versiya: boshqa qurilma
// orada yozgan bo'lsa ErrConflict qaytadi va klient yangisini qayta o'qiydi.
func (s *Store) PutSettings(ctx context.Context, userID int64, data json.RawMessage, baseVersion int64) (Settings, error) {
	var st Settings
	err := s.pool.QueryRow(ctx, `
		INSERT INTO settings (user_id, data, version) VALUES ($1, $2, 1)
		ON CONFLICT (user_id) DO UPDATE
			SET data = EXCLUDED.data, version = settings.version + 1, updated_at = now()
			WHERE settings.version = $3
		RETURNING data, version, updated_at`,
		userID, data, baseVersion,
	).Scan(&st.Data, &st.Version, &st.UpdatedAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return st, ErrConflict
	}
	return st, err
}

// ---- Tariflar va obuna ----

type Plan struct {
	ID           string `json:"id"`
	Name         string `json:"name"`
	DailyAILimit int    `json:"daily_ai_limit"`
	PriceUZS     *int   `json:"price_uzs"`
}

func (s *Store) ListPlans(ctx context.Context) ([]Plan, error) {
	rows, err := s.pool.Query(ctx, `SELECT id, name, daily_ai_limit, price_uzs FROM plans ORDER BY daily_ai_limit`)
	if err != nil {
		return nil, err
	}
	return pgx.CollectRows(rows, func(r pgx.CollectableRow) (Plan, error) {
		var p Plan
		return p, r.Scan(&p.ID, &p.Name, &p.DailyAILimit, &p.PriceUZS)
	})
}

type Subscription struct {
	Plan      Plan       `json:"plan"`
	ExpiresAt *time.Time `json:"expires_at"`
}

// ActiveSubscription amaldagi tarifni qaytaradi; obuna yo'q yoki muddati o'tgan bo'lsa — bepul tarif.
func (s *Store) ActiveSubscription(ctx context.Context, userID int64) (Subscription, error) {
	var sub Subscription
	var exp time.Time
	err := s.pool.QueryRow(ctx, `
		SELECT p.id, p.name, p.daily_ai_limit, p.price_uzs, s.expires_at
		FROM subscriptions s JOIN plans p ON p.id = s.plan_id
		WHERE s.user_id = $1 AND s.expires_at > now()`, userID,
	).Scan(&sub.Plan.ID, &sub.Plan.Name, &sub.Plan.DailyAILimit, &sub.Plan.PriceUZS, &exp)
	if err == nil {
		sub.ExpiresAt = &exp
		return sub, nil
	}
	if !errors.Is(err, pgx.ErrNoRows) {
		return sub, err
	}
	err = s.pool.QueryRow(ctx, `SELECT id, name, daily_ai_limit, price_uzs FROM plans WHERE id = 'free'`).
		Scan(&sub.Plan.ID, &sub.Plan.Name, &sub.Plan.DailyAILimit, &sub.Plan.PriceUZS)
	return sub, err
}

// GrantSubscription obunani beradi yoki uzaytiradi (amaldagi muddat ustiga qo'shiladi).
func (s *Store) GrantSubscription(ctx context.Context, userID int64, planID string, d time.Duration) error {
	_, err := s.pool.Exec(ctx, `
		INSERT INTO subscriptions (user_id, plan_id, expires_at) VALUES ($1, $2, now() + make_interval(secs => $3))
		ON CONFLICT (user_id) DO UPDATE SET
			plan_id = EXCLUDED.plan_id,
			expires_at = GREATEST(subscriptions.expires_at, now()) + make_interval(secs => $3)`,
		userID, planID, d.Seconds())
	return err
}

func (s *Store) UserByTgID(ctx context.Context, tgID int64) (User, error) {
	var u User
	err := s.pool.QueryRow(ctx,
		`SELECT id, tg_id, first_name, username, created_at FROM users WHERE tg_id = $1`, tgID,
	).Scan(&u.ID, &u.TgID, &u.FirstName, &u.Username, &u.CreatedAt)
	return u, notFound(err)
}

// ---- AI hisoblagichi ----

// ReserveAIRequest bugungi hisoblagichni atomik oshiradi; limitdan oshsa ErrQuotaExceeded.
func (s *Store) ReserveAIRequest(ctx context.Context, userID int64, limit int) (used int, err error) {
	err = s.pool.QueryRow(ctx, `
		INSERT INTO ai_usage (user_id, day, requests) SELECT $1, current_date, 1 WHERE $2 > 0
		ON CONFLICT (user_id, day) DO UPDATE SET requests = ai_usage.requests + 1
			WHERE ai_usage.requests < $2
		RETURNING requests`, userID, limit).Scan(&used)
	if errors.Is(err, pgx.ErrNoRows) {
		return 0, ErrQuotaExceeded
	}
	return used, err
}

// ReleaseAIRequest muvaffaqiyatsiz so'rov uchun band qilingan o'rinni qaytaradi.
func (s *Store) ReleaseAIRequest(ctx context.Context, userID int64) error {
	_, err := s.pool.Exec(ctx, `
		UPDATE ai_usage SET requests = requests - 1
		WHERE user_id = $1 AND day = current_date AND requests > 0`, userID)
	return err
}

func (s *Store) AddAITokens(ctx context.Context, userID int64, in, out int64) error {
	_, err := s.pool.Exec(ctx, `
		UPDATE ai_usage SET input_tokens = input_tokens + $2, output_tokens = output_tokens + $3
		WHERE user_id = $1 AND day = current_date`, userID, in, out)
	return err
}

func (s *Store) AIUsedToday(ctx context.Context, userID int64) (int, error) {
	var n int
	err := s.pool.QueryRow(ctx,
		`SELECT requests FROM ai_usage WHERE user_id = $1 AND day = current_date`, userID).Scan(&n)
	if errors.Is(err, pgx.ErrNoRows) {
		return 0, nil
	}
	return n, err
}

func notFound(err error) error {
	if errors.Is(err, pgx.ErrNoRows) {
		return ErrNotFound
	}
	return err
}
