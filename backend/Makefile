.PHONY: run test vet build
TEST_DATABASE_URL ?= postgres://tgcrazy:tgcrazy@127.0.0.1:5432/tgcrazy_test?sslmode=disable

run:
	set -a; . ./.env; set +a; go run ./cmd/api

test:
	TEST_DATABASE_URL="$(TEST_DATABASE_URL)" go test -race -count=1 ./...

vet:
	go vet ./...

build:
	go build -o bin/api ./cmd/api
