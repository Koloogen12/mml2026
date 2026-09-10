package service

import (
	"bytes"
	"context"
	"fmt"
	"io"
	"math/rand"
	"mime/multipart"
	"net/http"
	"strconv"
	"time"

	"mml-saas-backend/pkg/logger"
)

// Композит идентичности: возвращает покупателю его собственное лицо после
// генеративной примерки.
//
// Зачем это существует. Модель перерисовывает кадр целиком — лицо, волосы,
// кисти рук, фон. Маска через API задачу не решает: замерено, что при
// нескольких image[] в /v1/images/edits она перестаёт влиять на результат.
// Поэтому личность возвращается на нашей стороне: сервис mml-vto-segmenter
// считает семантическую сегментацию отдельно для фото покупателя и для
// генерации и собирает итог по таблице регионов.
//
// Насколько это важно, видно на цепочке из трёх примерок подряд (замер
// 09.09.2026, пять настоящих фото): без композита косинус ArcFace против
// исходного фото падает в среднем на 0.115 за три прохода, в худшем случае с
// 0.847 до 0.677 — это уже другой человек. С композитом падение 0.007.
//
// ГДЕ ЭТО СТОИТ В ПОТОКЕ И ПОЧЕМУ ИМЕННО ТАМ:
//
//	провайдер (+ кросс-фолбэк на Gemini) -> [ЗДЕСЬ] -> fitResultToModel -> upload
//
//   - После свитча провайдеров — значит композит применяется к тому результату,
//     который ПОБЕДИЛ. Если основной провайдер упал и ответил Gemini, чинится
//     ответ Gemini, а не первая попытка.
//   - До fitResultToModel — тот делает леттербоксинг под пропорции исходного
//     фото, дорисовывая белые поля. Композит после него совмещал бы оригинал с
//     уменьшенной внутри полей генерацией, то есть с промахом по геометрии.
//   - До выгрузки в хранилище — сырая генерация нигде не сохраняется и не
//     переживает этот вызов. Кэша результатов в сервисе сегодня нет вовсе; когда
//     он появится, кэшировать можно только то, что лежит ниже по потоку, иначе
//     попадание в кэш вернёт неисправленное лицо.
//
// Сбой композита не является сбоем примерки. Любая ошибка, таймаут, пустой
// ответ — возвращаем генерацию как есть и пишем предупреждение.

// applyIdentityComposite возвращает (возможно) исправленное изображение.
// Контракт функции: она НИКОГДА не возвращает ошибку и никогда не возвращает
// пустые байты. Худшее, что она делает, — отдаёт вход без изменений.
func (s *TryOnService) applyIdentityComposite(
	ctx context.Context,
	modelPhotoURL string,
	resultBytes []byte,
	ext string,
) ([]byte, string) {
	if s.cfg.VTOCompositeURL == "" {
		return resultBytes, ext
	}

	started := time.Now()

	modelBytes, _, err := s.loadImageBytes(ctx, modelPhotoURL)
	if err != nil {
		logger.Warn("tryon", "composite: не удалось загрузить фото покупателя, отдаём генерацию",
			"error", err)
		return resultBytes, ext
	}

	// Выборочный замер: на части запросов сервис дополнительно считает
	// косинус ArcFace, чтобы можно было увидеть тренд. Считать на каждом
	// запросе дорого, а тревога нужна как сигнал, а не как проверка кадра.
	measure := s.cfg.VTOCompositeSamplePct > 0 &&
		rand.Intn(100) < s.cfg.VTOCompositeSamplePct

	out, hdr, err := s.postComposite(ctx, modelBytes, resultBytes, measure)
	if err != nil {
		logger.Warn("tryon", "composite: сервис не ответил, отдаём генерацию как есть",
			"error", err, "latency_ms", time.Since(started).Milliseconds())
		return resultBytes, ext
	}
	if len(out) == 0 {
		logger.Warn("tryon", "composite: пустой ответ, отдаём генерацию как есть")
		return resultBytes, ext
	}

	fields := []any{
		"latency_ms", time.Since(started).Milliseconds(),
		"face_found", hdr.Get("X-Face-Found"),
		"kept_pct", hdr.Get("X-Kept-Pct"),
		"invariant_ok", hdr.Get("X-Invariant-Ok"),
	}
	if measure {
		fields = append(fields, "cos_generated", hdr.Get("X-Cos-Generated"),
			"cos_composite", hdr.Get("X-Cos-Composite"), "box", hdr.Get("X-Cos-Box"))
		if alarm, reason := compositeAlarm(hdr); alarm {
			// Тревога намеренно ОТНОСИТЕЛЬНАЯ: абсолютный порог у ArcFace
			// плавает от кадра к кадру (на закрытом лице метрика неустойчива),
			// а вот «композит стал хуже генерации» — это сигнал, что таблица
			// регионов отработала не туда. Грубый пол на 0.85 добавлен как
			// вторая, независимая от сравнения, сетка.
			logger.Warn("tryon", "composite: тревога по идентичности",
				append(fields, "reason", reason)...)
		}
	}
	logger.Info("tryon", "composite ok", fields...)

	// Сервис всегда отвечает PNG.
	return out, ".png"
}

// compositeAlarm читает заголовки замера и решает, надо ли шуметь.
// Возвращает (тревога, человекочитаемая причина).
func compositeAlarm(h http.Header) (bool, string) {
	gen, err1 := strconv.ParseFloat(h.Get("X-Cos-Generated"), 64)
	comp, err2 := strconv.ParseFloat(h.Get("X-Cos-Composite"), 64)
	if err1 != nil || err2 != nil {
		return false, ""
	}
	if comp < gen {
		return true, fmt.Sprintf("композит хуже генерации: %.4f < %.4f", comp, gen)
	}
	if comp < 0.85 {
		return true, fmt.Sprintf("косинус композита ниже пола: %.4f < 0.85", comp)
	}
	return false, ""
}

// postComposite шлёт два файла и забирает склеенный кадр.
func (s *TryOnService) postComposite(
	ctx context.Context,
	original, generated []byte,
	measure bool,
) ([]byte, http.Header, error) {
	var buf bytes.Buffer
	mw := multipart.NewWriter(&buf)
	for _, f := range []struct {
		field, name string
		data        []byte
	}{
		{"original", "original.png", original},
		{"generated", "generated.png", generated},
	} {
		w, err := mw.CreateFormFile(f.field, f.name)
		if err != nil {
			return nil, nil, err
		}
		if _, err := w.Write(f.data); err != nil {
			return nil, nil, err
		}
	}
	if err := mw.Close(); err != nil {
		return nil, nil, err
	}

	timeout := time.Duration(s.cfg.VTOCompositeTimeoutSec) * time.Second
	reqCtx, cancel := context.WithTimeout(ctx, timeout)
	defer cancel()

	url := s.cfg.VTOCompositeURL
	if measure {
		url += "?measure=1"
	}
	req, err := http.NewRequestWithContext(reqCtx, http.MethodPost, url, &buf)
	if err != nil {
		return nil, nil, err
	}
	req.Header.Set("Content-Type", mw.FormDataContentType())

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return nil, nil, err
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(io.LimitReader(resp.Body, 32<<20))
	if err != nil {
		return nil, nil, err
	}
	if resp.StatusCode != http.StatusOK {
		return nil, nil, fmt.Errorf("сервис композита ответил %d: %s",
			resp.StatusCode, truncateRunes(string(body), 300))
	}
	return body, resp.Header, nil
}
