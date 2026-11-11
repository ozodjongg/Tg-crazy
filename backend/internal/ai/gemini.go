package ai

import (
	"context"
	"errors"
	"fmt"
	"net/http"

	"google.golang.org/genai"
)

// Gemini — Google Gemini API orqali ishlaydigan provayder.
type Gemini struct {
	client *genai.Client
	model  string
}

// NewGemini baseURL bo'sh bo'lsa Google'ning standart manzilidan foydalanadi.
func NewGemini(ctx context.Context, apiKey, model, baseURL string) (*Gemini, error) {
	client, err := genai.NewClient(ctx, &genai.ClientConfig{
		APIKey:      apiKey,
		Backend:     genai.BackendGeminiAPI,
		HTTPOptions: genai.HTTPOptions{BaseURL: baseURL},
	})
	if err != nil {
		return nil, fmt.Errorf("gemini klienti: %w", err)
	}
	return &Gemini{client: client, model: model}, nil
}

// Javob xavfsizlik yoki siyosat sababli to'xtatilganini bildiradigan sabablar.
var geminiBlocked = map[genai.FinishReason]bool{
	genai.FinishReasonSafety:            true,
	genai.FinishReasonRecitation:        true,
	genai.FinishReasonBlocklist:         true,
	genai.FinishReasonProhibitedContent: true,
	genai.FinishReasonSPII:              true,
}

func (g *Gemini) Complete(ctx context.Context, system, user string) (string, Usage, error) {
	resp, err := g.client.Models.GenerateContent(ctx, g.model, genai.Text(user), &genai.GenerateContentConfig{
		SystemInstruction: genai.NewContentFromText(system, genai.RoleUser),
		MaxOutputTokens:   16000,
	})
	if err != nil {
		var apiErr genai.APIError
		if errors.As(err, &apiErr) {
			return "", Usage{}, &ProviderError{Status: apiErr.Code, Err: err}
		}
		return "", Usage{}, err
	}

	var usage Usage
	if m := resp.UsageMetadata; m != nil {
		usage = Usage{
			InputTokens: int64(m.PromptTokenCount),
			// Fikrlash tokenlari ham chiqish sifatida hisoblanadi
			OutputTokens: int64(m.CandidatesTokenCount) + int64(m.ThoughtsTokenCount),
		}
	}
	if fb := resp.PromptFeedback; fb != nil && fb.BlockReason != "" {
		return "", usage, ErrRefused
	}
	if len(resp.Candidates) == 0 {
		return "", usage, &ProviderError{Status: http.StatusBadGateway, Err: errors.New("gemini: javobda variant yo'q")}
	}
	if c := resp.Candidates[0]; geminiBlocked[c.FinishReason] {
		return "", usage, ErrRefused
	}
	return resp.Text(), usage, nil
}
