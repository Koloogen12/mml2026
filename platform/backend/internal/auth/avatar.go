package auth

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"io"
	"net/http"
)

// Uploader — объектное хранилище (MinIO). Тот же контракт, что у загрузок
// партнёра: файл кладём в хранилище, в БД — только ссылка.
type Uploader interface {
	Put(ctx context.Context, key, contentType string, data []byte) (string, error)
}

// Форматы аватара. Тип определяем по содержимому, а не по заголовку клиента:
// заголовок подделывается, и через него в хранилище уезжает что угодно.
// SVG не принимаем: он умеет исполнять скрипты, а мы отдаём файлы со своего
// домена — это был бы XSS в чужой вкладке.
var avatarTypes = map[string]string{
	"image/jpeg": ".jpg",
	"image/png":  ".png",
	"image/webp": ".webp",
}

const maxAvatar = 5 << 20 // 5 МБ

// UploadAvatar — POST /api/v1/me/avatar (multipart, поле file).
func (h *Handler) UploadAvatar(w http.ResponseWriter, r *http.Request) {
	c := UserFrom(r.Context())
	if c == nil {
		writeErr(w, http.StatusUnauthorized, "нужен вход")
		return
	}
	if h.up == nil {
		writeErr(w, http.StatusNotImplemented, "загрузки недоступны: не настроено хранилище")
		return
	}

	r.Body = http.MaxBytesReader(w, r.Body, maxAvatar+1024)
	if err := r.ParseMultipartForm(maxAvatar + 1024); err != nil {
		writeErr(w, http.StatusBadRequest, "файл больше 5 МБ или битый запрос")
		return
	}
	file, _, err := r.FormFile("file")
	if err != nil {
		writeErr(w, http.StatusBadRequest, "нужно поле file")
		return
	}
	defer file.Close()

	data, err := io.ReadAll(io.LimitReader(file, maxAvatar+1))
	if err != nil {
		writeErr(w, http.StatusBadRequest, "не удалось прочитать файл")
		return
	}
	if len(data) > maxAvatar {
		writeErr(w, http.StatusRequestEntityTooLarge, "файл больше 5 МБ")
		return
	}

	ct := http.DetectContentType(data)
	ext, ok := avatarTypes[ct]
	if !ok {
		writeErr(w, http.StatusBadRequest, "подойдёт JPG, PNG или WebP")
		return
	}

	// Случайное имя, а не публичный id: иначе аватар любого человека угадывается
	// по ссылке, а старый файл остаётся доступен после замены.
	buf := make([]byte, 8)
	if _, err := rand.Read(buf); err != nil {
		writeErr(w, http.StatusInternalServerError, "не удалось сохранить")
		return
	}
	key := "avatars/" + c.UserPublicID + "-" + hex.EncodeToString(buf) + ext

	url, err := h.up.Put(r.Context(), key, ct, data)
	if err != nil {
		h.svc.log.Warn("аватар: не загрузился", "err", err)
		writeErr(w, http.StatusBadGateway, "хранилище недоступно")
		return
	}
	if err := h.svc.SetAvatar(r.Context(), c.UserPublicID, url); err != nil {
		writeErr(w, http.StatusInternalServerError, "не удалось сохранить")
		return
	}
	writeJSON(w, map[string]string{"avatar_url": url})
}

// DeleteAvatar — DELETE /api/v1/me/avatar. Ссылку снимаем; файл в хранилище
// остаётся сиротой — чистится отдельным проходом, как и прочие загрузки.
func (h *Handler) DeleteAvatar(w http.ResponseWriter, r *http.Request) {
	c := UserFrom(r.Context())
	if c == nil {
		writeErr(w, http.StatusUnauthorized, "нужен вход")
		return
	}
	if err := h.svc.SetAvatar(r.Context(), c.UserPublicID, ""); err != nil {
		writeErr(w, http.StatusInternalServerError, "не удалось снять аватар")
		return
	}
	writeJSON(w, map[string]bool{"deleted": true})
}
