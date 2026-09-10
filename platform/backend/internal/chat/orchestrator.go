package chat

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log/slog"
	"strings"
	"time"

	"github.com/anthropics/anthropic-sdk-go"
	"github.com/anthropics/anthropic-sdk-go/option"

	"mml-platform-backend/internal/catalog"
)

// ErrOverloaded — модель временно перегружена (волны длятся секунды).
var ErrOverloaded = errors.New("модель перегружена")

const (
	maxRetries    = 3    // всего 4 попытки: 2с + 4с + 8с ожидания
	maxToolRounds = 4    // защита от зацикливания tool-loop
	maxTurnTokens = 2048 // ответы стилиста короткие по промпту
	historyLimit  = 30
)

// Emitter — куда оркестратор пишет события по мере генерации (SSE-слой).
type Emitter interface {
	Delta(text string)                     // кусок текста ассистента
	Products(items []catalog.SearchResult) // карточки для рендера
	Meta(sessionPublicID string)           // служебное: id сессии
	Error(userMessage string)              // человеческая ошибка
}

type Orchestrator struct {
	client anthropic.Client
	model  anthropic.Model
	repo   *catalog.Repo
	embed  Embedder
	encode func([]float32) string
	store  *Store
	log    *slog.Logger
}

// NewOrchestrator: baseURL/proxyKey непустые — запросы идут через прокси
// (Cloudflare Worker), который сам подставляет реальный ключ Anthropic.
func NewOrchestrator(apiKey, baseURL, proxyKey, model string, repo *catalog.Repo, embed Embedder, encode func([]float32) string, store *Store, log *slog.Logger) *Orchestrator {
	opts := []option.RequestOption{option.WithAPIKey(apiKey)}
	if baseURL != "" {
		opts = append(opts, option.WithBaseURL(baseURL))
	}
	if proxyKey != "" {
		opts = append(opts, option.WithHeader("x-proxy-key", proxyKey))
	}
	return &Orchestrator{
		client: anthropic.NewClient(opts...),
		model:  anthropic.Model(model),
		repo:   repo,
		embed:  embed,
		encode: encode,
		store:  store,
		log:    log,
	}
}

// Turn — вход одного хода: кто пишет и что.
type Turn struct {
	SessionPublicID string
	UserText        string
	UserID          int64                    // 0 для гостя
	PassportContext string                   // компактная сводка паспорта (для тона ответа)
	Personalization *catalog.Personalization // структурный профиль для ретривала (nil для гостя)
}

// Handle ведёт один ход диалога: история → стрим модели → tool-loop → персист.
func (o *Orchestrator) Handle(ctx context.Context, t Turn, emit Emitter) error {
	sessionPublicID, userText := t.SessionPublicID, t.UserText
	sessionID, pubID, err := o.store.EnsureSession(ctx, sessionPublicID, t.UserID)
	if err != nil {
		return fmt.Errorf("сессия: %w", err)
	}
	emit.Meta(pubID)

	history, err := o.store.History(ctx, sessionID, historyLimit)
	if err != nil {
		return fmt.Errorf("история: %w", err)
	}

	messages := make([]anthropic.MessageParam, 0, len(history)+1)
	for _, m := range history {
		if m.Role == "user" {
			messages = append(messages, anthropic.NewUserMessage(anthropic.NewTextBlock(m.Content)))
		} else {
			messages = append(messages, anthropic.NewAssistantMessage(anthropic.NewTextBlock(m.Content)))
		}
	}
	messages = append(messages, anthropic.NewUserMessage(anthropic.NewTextBlock(userText)))

	if err := o.store.Append(ctx, sessionID, "user", userText, nil); err != nil {
		return fmt.Errorf("персист user: %w", err)
	}

	tools := []anthropic.ToolUnionParam{searchCatalogTool()}

	var assistantText string
	var shownProducts []string

	// Первый блок — фрозен-промпт с кэшем; второй — паспорт вошедшего без кэша,
	// чтобы персонализация не инвалидировала кэш общего промпта.
	system := []anthropic.TextBlockParam{{
		Text:         systemPrompt,
		CacheControl: anthropic.NewCacheControlEphemeralParam(),
	}}
	if t.PassportContext != "" {
		system = append(system, anthropic.TextBlockParam{
			Text: "Паспорт стиля этого покупателя (учитывайте, но не зачитывайте вслух):\n" + t.PassportContext,
		})
	}

	for round := 0; ; round++ {
		params := anthropic.MessageNewParams{
			Model:     o.model,
			MaxTokens: maxTurnTokens,
			System:    system,
			Messages:  messages,
			Tools:     tools,
		}

		// Перегрузка модели — штатная временная ситуация, а не поломка: даём
		// пару повторов с паузой. Раньше единственный «Overloaded» превращался
		// для человека в «Что-то пошло не так» на весь запрос.
		// Повторяем, только пока ничего не отдали в поток: половина ответа плюс
		// повтор склеили бы два разных ответа в один.
		var message anthropic.Message
		var streamErr error
		for attempt := 0; ; attempt++ {
			stream := o.client.Messages.NewStreaming(ctx, params)
			message = anthropic.Message{}
			emitted := false
			for stream.Next() {
				event := stream.Current()
				if err := message.Accumulate(event); err != nil {
					o.log.Error("accumulate", "err", err)
				}
				if delta, ok := event.AsAny().(anthropic.ContentBlockDeltaEvent); ok {
					if text, ok := delta.Delta.AsAny().(anthropic.TextDelta); ok {
						assistantText += text.Text
						emitted = true
						emit.Delta(text.Text)
					}
				}
			}
			streamErr = stream.Err()
			if streamErr == nil || emitted || attempt >= maxRetries || !retryable(streamErr) {
				break
			}
			// Перегрузка приходит волнами по несколько секунд, поэтому пауза
			// растёт: 2с, 4с, 8с. Чат и так думает ~10с — подождать выгоднее,
			// чем показать человеку ошибку.
			back := time.Duration(1<<attempt) * 2 * time.Second
			o.log.Warn("модель перегружена — повтор", "попытка", attempt+1, "пауза", back, "err", streamErr)
			select {
			case <-ctx.Done():
				return ctx.Err()
			case <-time.After(back):
			}
		}
		if streamErr != nil {
			if retryable(streamErr) {
				// Отличаем «сервис занят» от «сломалось»: человеку нужен
				// разный совет, а нам — разный сигнал в логах.
				return fmt.Errorf("%w: %v", ErrOverloaded, streamErr)
			}
			return fmt.Errorf("claude stream: %w", streamErr)
		}

		if message.StopReason != anthropic.StopReasonToolUse {
			break
		}
		if round >= maxToolRounds {
			o.log.Warn("tool-loop limit reached", "session", sessionID)
			break
		}

		messages = append(messages, message.ToParam())

		var toolResults []anthropic.ContentBlockParamUnion
		for _, block := range message.Content {
			tu, ok := block.AsAny().(anthropic.ToolUseBlock)
			if !ok {
				continue
			}
			if tu.Name != "search_catalog" {
				toolResults = append(toolResults,
					anthropic.NewToolResultBlock(block.ID, "неизвестный инструмент", true))
				continue
			}
			result, cards, err := executeSearch(ctx, o.repo, o.embed, o.encode,
				json.RawMessage(tu.JSON.Input.Raw()), t.Personalization)
			if err != nil {
				o.log.Error("search_catalog", "err", err)
				toolResults = append(toolResults, anthropic.NewToolResultBlock(block.ID,
					"Поиск временно недоступен. Извинитесь и предложите повторить чуть позже.", true))
				continue
			}
			if len(cards) > 0 {
				emit.Products(cards)
				for _, c := range cards {
					shownProducts = append(shownProducts, c.PublicID)
				}
			}
			toolResults = append(toolResults, anthropic.NewToolResultBlock(block.ID, result, false))
		}
		messages = append(messages, anthropic.NewUserMessage(toolResults...))
	}

	if assistantText == "" {
		assistantText = "Простите, не получилось собрать ответ. Попробуете переформулировать?"
		emit.Delta(assistantText)
	}
	if err := o.store.Append(ctx, sessionID, "assistant", assistantText, shownProducts); err != nil {
		return fmt.Errorf("персист assistant: %w", err)
	}
	return nil
}

// retryable — временные ответы модели, которые имеет смысл повторить.
func retryable(err error) bool {
	s := strings.ToLower(err.Error())
	return strings.Contains(s, "overloaded") ||
		strings.Contains(s, "rate_limit") ||
		strings.Contains(s, "429") ||
		strings.Contains(s, "529") ||
		strings.Contains(s, "timeout")
}
