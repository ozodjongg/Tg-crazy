package auth

import (
	"testing"
	"time"
)

func TestTokens(t *testing.T) {
	secret := []byte("0123456789abcdef0123456789abcdef")
	tok := NewTokens(secret, time.Minute)
	s, err := tok.Issue(42)
	if err != nil {
		t.Fatal(err)
	}
	if id, err := tok.Verify(s); err != nil || id != 42 {
		t.Fatalf("Verify = %d, %v", id, err)
	}
	if _, err := NewTokens([]byte("boshqa-kalit-boshqa-kalit-boshqa!"), time.Minute).Verify(s); err == nil {
		t.Fatal("boshqa kalit bilan imzolangan token qabul qilindi")
	}
	tok.now = func() time.Time { return time.Now().Add(2 * time.Minute) }
	if _, err := tok.Verify(s); err == nil {
		t.Fatal("muddati o'tgan token qabul qilindi")
	}
	if _, err := tok.Verify("axlat"); err == nil {
		t.Fatal("yaroqsiz token qabul qilindi")
	}
}

func TestRandomTokenUnique(t *testing.T) {
	if a, b := RandomToken(16), RandomToken(16); a == b || len(a) < 20 {
		t.Fatalf("tokenlar: %q %q", a, b)
	}
}
