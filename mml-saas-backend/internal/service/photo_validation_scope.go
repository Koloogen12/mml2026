package service

import (
	"strconv"
	"strings"
)

// PhotoValidationEnabled говорит, нужно ли проверять фото покупателя для
// конкретного проекта.
//
// Проверка — это отдельный вызов зрительной модели, и он не бесплатен по
// времени: замер на проде 10.09.2026 дал 11.4 с на загрузку с проверкой
// против 1.0 с без неё. Для реального магазина эти секунды окупаются: плохой
// кадр отсекается до генерации, а генерация стоит денег и разочарования.
// Для демо-стенда, где продукт показывают вживую и снимают ролики, та же
// пауза работает против продукта.
//
// Поэтому выключатель пообъектный, а не глобальный: список числовых id
// проектов в PHOTO_VALIDATION_SKIP_PROJECTS. Пусто = проверяем везде.
func (s *TryOnService) PhotoValidationEnabled(projectID int) bool {
	raw := strings.TrimSpace(s.cfg.PhotoValidationSkipProjects)
	if raw == "" {
		return true
	}
	for _, part := range strings.Split(raw, ",") {
		id, err := strconv.Atoi(strings.TrimSpace(part))
		if err == nil && id == projectID {
			return false
		}
	}
	return true
}
