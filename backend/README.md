# Tg-crazy backend

Go xizmati: akkaunt va obuna, sozlamalar sinxroni, AI funksiyalar.

**Telegram sessiyasi va yozishmalar bu yerga kelmaydi.** Backend faqat quyidagilarni ko'radi:
foydalanuvchining Telegram ID si va ismi, Tg-crazy sozlamalari, hamda foydalanuvchi AI uchun
o'zi yuborgan matn (u saqlanmaydi va logga yozilmaydi — faqat hisoblagich yuritiladi).

## Ishga tushirish

```bash
docker compose up -d          # Postgres
cp .env.example .env          # JWT_SECRET ni to'ldiring; BOT_TOKEN va ANTHROPIC_API_KEY ixtiyoriy
make run                      # migratsiyalar avtomatik bajariladi
```

Testlar haqiqiy Postgres bilan ishlaydi (`tgcrazy_test` bazasi kerak): `make test`.

## Foydalanuvchini tasdiqlash

1. Klient `POST /v1/auth/start` → `nonce`, `secret`, `bot_username`.
2. Foydalanuvchi roziligi bilan klient uning akkauntidan botga `/start <nonce>` yuboradi.
3. Bot xabardan Telegram ID ni oladi va nonce'ni tasdiqlaydi (faqat shaxsiy chatda).
4. Klient `POST /v1/auth/complete` (`nonce` + `secret`) → `202` (kutilmoqda) yoki tokenlar.

`secret` faqat klientda qoladi, shuning uchun nonce'ni ko'rib qolgan begona kira olmaydi.

## API

| Yo'l | Vazifa |
|---|---|
| `GET /healthz` | Holat; `auth`/`ai` yoqilganmi |
| `POST /v1/auth/start`, `/complete`, `/refresh`, `/logout` | Kirish (refresh token bir martalik, aylanadi) |
| `GET /v1/me` | Foydalanuvchi, tarif, bugungi AI limiti |
| `GET/PUT /v1/settings` | JSON sozlamalar; `version` mos kelmasa `409` + amaldagi holat |
| `POST /v1/ai/summarize`, `/translate`, `/reply-draft` | AI; limit tugasa `429`, xato so'rov limitdan yechilmaydi |
| `GET /v1/billing/plans`, `/subscription` | Tariflar va amaldagi obuna |

## Obuna

To'lov tizimi (Click/Payme) hali ulanmagan — `internal/billing` da interfeys tayyor.
Hozircha obuna qo'lda beriladi:

```bash
go run ./cmd/api grant -tg 123456789 -plan pro -days 30
```

Tariflar `plans` jadvalida: bepul — kuniga 10 ta AI so'rov, Pro — 200 ta. Pro narxi belgilanmagan.

## AI

Standart model — `claude-opus-5-5` (`AI_MODEL` bilan o'zgartiriladi). Model so'rovni xavfsizlik
sababli rad etsa, API uni avtomatik zaxira modelda qayta bajaradi (server-side fallback).

## Tuzilma

`cmd/api` — kirish nuqtasi · `internal/httpapi` — router va handlerlar · `internal/store` —
Postgres va migratsiyalar · `internal/auth` — JWT · `internal/tgbot` — bot · `internal/ai` —
promptlar va provayder · `internal/billing` — to'lov interfeysi.
