// Package email — письма MakeMeLook: общий каркас + шаблоны.
//
// Свёрстано по макету «MakeMeLook Emails» (Claude Design). Отличия от макета
// осознанные и продиктованы почтой, а не вкусом:
//   - таблицы вместо flex/grid: Outlook на Word-движке их не понимает;
//   - CSS только инлайном (Gmail режет <style> в теле, частично оставляет в <head>);
//   - Martina Plantijn → Georgia: кастомные шрифты почтовые клиенты не грузят,
//     а Georgia есть везде и держит тот же серифный характер;
//   - у каждого письма обязателен text/plain: без него письмо чаще уходит в спам,
//     и его не прочитать в клиентах без HTML.
package email

import (
	"fmt"
	"html"
	"strings"
)

// Палитра из макета.
const (
	ink      = "#16150F"
	accent   = "#2743E3"
	plate    = "#ECEEFF"
	paper    = "#EFEDE6"
	line     = "rgba(0,0,0,.08)"
	muted    = "rgba(0,0,0,.46)"
	bodyText = "rgba(0,0,0,.64)"
)

// Логотип — PNG, а не SVG из макета: Gmail и Outlook вырезают SVG целиком, и на
// его месте остаётся «сломанная картинка». PNG @2x (374×64) отдаётся в CSS-высоту
// 22px, чтобы не мылить на retina. Ссылкой, а не data:URI — Gmail режет и его.
//
// Два файла вместо CSS-фильтра из макета: brightness/invert в почте не работает,
// поэтому тёмная версия — отдельная картинка, которую показываем свопом display.
// alt обязателен: пока картинки не подгружены (а Outlook блокирует их по умолчанию),
// человек видит «MakeMeLook», а не пустоту.
const logoURL = "https://makemelook.ai/app/email/logo.png"
const logoDarkURL = "https://makemelook.ai/app/email/logo-dark.png"

const logoIMG = `<img class="mml-logo-l" src="` + logoURL + `" width="128" height="22" alt="MakeMeLook" style="height:22px;width:auto;border:0;display:block">` +
	`<!--[if !mso]><!--><img class="mml-logo-d" src="` + logoDarkURL + `" width="128" height="22" alt="MakeMeLook" style="height:22px;width:auto;border:0;display:none;max-height:0;overflow:hidden;mso-hide:all"><!--<![endif]-->`

// Реквизиты в футере — обязательны: письмо от юрлица, а не от абстрактного бренда.
// Класс на самой ссылке обязателен: тёмная тема наследуется через color, а у
// <a> свой цвет — без .mml-muted реквизиты становятся чёрным по чёрному.
const legalLine = `ООО «МОНОРУС» · <a class="mml-muted" href="mailto:ceo@themono.ru" style="color:rgba(0,0,0,.42)">ceo@themono.ru</a> · 125009, Москва, ул. Тверская, 1`

// Mail — готовое письмо.
type Mail struct {
	Subject string
	HTML    string
	Text    string
}

// Опции каркаса.
type layoutOpts struct {
	preheader string // невидимая строка-превью в списке писем
	reason    string // «почему вы это получили» — требование антиспама
	unsubURL  string // для маркетинговых писем; пусто — блок отписки не рисуем
}

// wrap собирает письмо целиком.
func wrap(bodyHTML string, o layoutOpts) string {
	unsub := ""
	if o.unsubURL != "" {
		unsub = fmt.Sprintf(
			`<p style="margin:8px 0 0;font:400 12px/1.55 Inter,-apple-system,'Segoe UI',Roboto,Arial,sans-serif;color:rgba(0,0,0,.42)">`+
				`<a href="%s" style="color:rgba(0,0,0,.42)">Отписаться от таких писем</a></p>`, o.unsubURL)
	}
	return `<!doctype html>
<html lang="ru">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light dark">
<meta name="supported-color-schemes" content="light dark">
<title>MakeMeLook</title>
<style>
  /* Тёмная тема: клиент сам переключит по системной настройке. */
  @media (prefers-color-scheme: dark) {
    .mml-bg   { background:#0f0f11 !important; }
    .mml-card { background:#1a1a1d !important; }
    .mml-ink  { color:#F4F1EA !important; }
    .mml-body { color:rgba(244,241,234,.72) !important; }
    .mml-muted{ color:rgba(244,241,234,.5) !important; }
    .mml-plate{ background:#20233d !important; }
    .mml-line { border-color:rgba(244,241,234,.14) !important; }
    /* Логотип свопом: чёрная версия на тёмном фоне была бы невидима. */
    .mml-logo-l { display:none !important; max-height:0 !important; overflow:hidden !important; }
    .mml-logo-d { display:block !important; max-height:none !important; }
  }
  /* Один шаблон на все ширины; телефон — единственный брейкпоинт. */
  @media (max-width:600px) {
    .mml-card { border-radius:0 !important; }
    .mml-pad  { padding-left:22px !important; padding-right:22px !important; }
    .mml-h1   { font-size:25px !important; }
    .mml-code { font-size:34px !important; letter-spacing:.12em !important; }
  }
</style>
</head>
<body class="mml-bg" style="margin:0;padding:0;background:` + paper + `;-webkit-font-smoothing:antialiased">
<!-- preheader: показывается в списке писем рядом с темой и больше нигде -->
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;height:0;width:0">` +
		html.EscapeString(o.preheader) +
		`&#8199;&#65279;&#847; &#8199;&#65279;&#847; &#8199;&#65279;&#847; &#8199;&#65279;&#847; &#8199;&#65279;&#847;</div>

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="mml-bg" style="background:` + paper + `">
  <tr><td align="center" style="padding:32px 12px">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="mml-card" style="max-width:600px;background:#ffffff;border-radius:16px;overflow:hidden">

      <tr><td class="mml-pad" style="padding:26px 36px 0">` + logoIMG + `</td></tr>

      <tr><td class="mml-pad" style="padding:22px 36px 4px">` + bodyHTML + `</td></tr>

      <tr><td class="mml-pad mml-line" style="border-top:1px solid ` + line + `;margin-top:24px;padding:22px 36px 28px">
        <p class="mml-muted" style="margin:0 0 8px;font:400 12px/1.55 Inter,-apple-system,'Segoe UI',Roboto,Arial,sans-serif;color:rgba(0,0,0,.42)">` +
		html.EscapeString(o.reason) + `</p>
        <p class="mml-muted" style="margin:0;font:400 12px/1.55 Inter,-apple-system,'Segoe UI',Roboto,Arial,sans-serif;color:rgba(0,0,0,.42)">` + legalLine + `</p>
        ` + unsub + `
      </td></tr>

    </table>
  </td></tr>
</table>
</body></html>`
}

// ── кирпичики тела ──────────────────────────────────────────────────────────

func h1(text string) string {
	return `<h1 class="mml-h1 mml-ink" style="margin:0 0 12px;font:400 30px/1.15 Georgia,'Times New Roman',serif;letter-spacing:-.01em;color:` + ink + `">` +
		html.EscapeString(text) + `</h1>`
}

func p(text string) string {
	return `<p class="mml-body" style="margin:0 0 14px;font:400 16px/1.62 Inter,-apple-system,'Segoe UI',Roboto,Arial,sans-serif;color:` + bodyText + `">` +
		html.EscapeString(text) + `</p>`
}

func note(text string) string {
	return `<p class="mml-muted" style="margin:0;font:400 13.5px/1.55 Inter,-apple-system,'Segoe UI',Roboto,Arial,sans-serif;color:` + muted + `">` +
		html.EscapeString(text) + `</p>`
}

// codePlate — плашка с кодом. Пробел в середине помогает прочитать вслух и
// перенабрать; в text/plain код остаётся слитным, чтобы копировался целиком.
func codePlate(code string) string {
	return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:24px 0 14px">
  <tr><td class="mml-plate" align="center" style="background:` + plate + `;border-radius:14px;padding:26px 20px">
    <span class="mml-code" style="font:600 42px/1 'IBM Plex Mono',ui-monospace,Menlo,Consolas,monospace;letter-spacing:.16em;color:` + accent + `">` +
		html.EscapeString(spaced(code)) + `</span>
  </td></tr>
</table>`
}

// button — CTA. Таблицей, потому что <a> с паддингами в Outlook разъезжается.
func button(label, url string) string {
	return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 20px">
  <tr><td align="center" bgcolor="` + ink + `" style="border-radius:999px">
    <a href="` + url + `" style="display:inline-block;padding:14px 28px;font:600 15px Inter,-apple-system,'Segoe UI',Roboto,Arial,sans-serif;color:#ffffff;text-decoration:none">` +
		html.EscapeString(label) + `</a>
  </td></tr>
</table>`
}

func divider() string {
	return `<div class="mml-line" style="border-top:1px solid ` + line + `;padding-top:18px;margin:4px 0"></div>`
}

// spaced — «483920» → «483 920».
func spaced(code string) string {
	if len(code) != 6 {
		return code
	}
	return code[:3] + " " + code[3:]
}

func center(inner string) string {
	return `<div style="text-align:center">` + inner + `</div>`
}

func mutedCenter(text string) string {
	return `<p class="mml-muted" style="margin:0 0 22px;text-align:center;font:500 13px Inter,-apple-system,'Segoe UI',Roboto,Arial,sans-serif;color:rgba(0,0,0,.44)">` +
		html.EscapeString(text) + `</p>`
}

// plain — сборка text/plain версии.
func plain(lines ...string) string {
	out := strings.Join(lines, "\n")
	return strings.TrimSpace(out) + "\n\n—\nООО «МОНОРУС» · ceo@themono.ru · 125009, Москва, ул. Тверская, 1"
}
