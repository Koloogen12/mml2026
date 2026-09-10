package reco

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"time"
)

// Client — HTTP-клиент инференс-сайдкара.
type Client struct {
	baseURL string
	http    *http.Client
}

func New(baseURL string) *Client {
	return &Client{baseURL: baseURL, http: &http.Client{Timeout: 60 * time.Second}}
}

type embedRequest struct {
	Texts []string `json:"texts"`
	Kind  string   `json:"kind"`
}

type embedResponse struct {
	Vectors [][]float32 `json:"vectors"`
	Dim     int         `json:"dim"`
}

// Embed возвращает нормализованные векторы. kind: "query" | "passage" —
// e5-модели требуют разные префиксы для запроса и документа.
func (c *Client) Embed(ctx context.Context, texts []string, kind string) ([][]float32, error) {
	body, _ := json.Marshal(embedRequest{Texts: texts, Kind: kind})
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, c.baseURL+"/embed", bytes.NewReader(body))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := c.http.Do(req)
	if err != nil {
		return nil, fmt.Errorf("reco embed: %w", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("reco embed: status %d", resp.StatusCode)
	}
	var out embedResponse
	if err := json.NewDecoder(resp.Body).Decode(&out); err != nil {
		return nil, err
	}
	if len(out.Vectors) != len(texts) {
		return nil, fmt.Errorf("reco embed: ожидали %d векторов, получили %d", len(texts), len(out.Vectors))
	}
	return out.Vectors, nil
}

type imageEmbedRequest struct {
	ImageURLs []string `json:"image_urls"`
}

type fashionTextRequest struct {
	Texts []string `json:"texts"`
}

// ErrUnfetchable — часть картинок не скачалась (reco вернул 422). ETL помечает
// такие товары, а не пишет мусорный вектор.
type ErrUnfetchable struct{ URLs []string }

func (e *ErrUnfetchable) Error() string {
	return fmt.Sprintf("reco embed-image: %d картинок не скачались", len(e.URLs))
}

// EmbedImage — Marqo-FashionSigLIP image embeddings (768d) по URL фото.
func (c *Client) EmbedImage(ctx context.Context, imageURLs []string) ([][]float32, error) {
	body, _ := json.Marshal(imageEmbedRequest{ImageURLs: imageURLs})
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, c.baseURL+"/embed-image", bytes.NewReader(body))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := c.http.Do(req)
	if err != nil {
		return nil, fmt.Errorf("reco embed-image: %w", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode == http.StatusUnprocessableEntity {
		var detail struct {
			Detail struct {
				Unfetchable []string `json:"unfetchable"`
			} `json:"detail"`
		}
		_ = json.NewDecoder(resp.Body).Decode(&detail)
		return nil, &ErrUnfetchable{URLs: detail.Detail.Unfetchable}
	}
	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("reco embed-image: status %d", resp.StatusCode)
	}
	var out embedResponse
	if err := json.NewDecoder(resp.Body).Decode(&out); err != nil {
		return nil, err
	}
	if len(out.Vectors) != len(imageURLs) {
		return nil, fmt.Errorf("reco embed-image: ожидали %d векторов, получили %d", len(imageURLs), len(out.Vectors))
	}
	return out.Vectors, nil
}

// EmbedFashionText — Marqo text-энкодер (768d), одно пространство с фото.
// Запросы подаём переведёнными на EN (text-энкодер англоязычный).
func (c *Client) EmbedFashionText(ctx context.Context, texts []string) ([][]float32, error) {
	body, _ := json.Marshal(fashionTextRequest{Texts: texts})
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, c.baseURL+"/embed-fashion-text", bytes.NewReader(body))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := c.http.Do(req)
	if err != nil {
		return nil, fmt.Errorf("reco embed-fashion-text: %w", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("reco embed-fashion-text: status %d", resp.StatusCode)
	}
	var out embedResponse
	if err := json.NewDecoder(resp.Body).Decode(&out); err != nil {
		return nil, err
	}
	return out.Vectors, nil
}

// VectorLiteral сериализует вектор в формат pgvector: [0.1,0.2,...]
func VectorLiteral(v []float32) string {
	var b bytes.Buffer
	b.WriteByte('[')
	for i, f := range v {
		if i > 0 {
			b.WriteByte(',')
		}
		fmt.Fprintf(&b, "%g", f)
	}
	b.WriteByte(']')
	return b.String()
}
