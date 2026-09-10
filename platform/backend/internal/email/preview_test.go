package email

import (
	"os"
	"strings"
	"testing"
)

// TestPreview кладёт рендер каждого шаблона в /tmp/mmlmail для глазной проверки.
// Не ассерт — инструмент вёрстки.
func TestPreview(t *testing.T) {
	dir := "/tmp/mmlmail"
	cases := map[string]Mail{
		"u1-login-code": LoginCode("483920", false),
		"p1-login-code": LoginCode("483920", true),
		"u2-welcome":    Welcome("Данил", "https://makemelook.ai/app/"),
		"p2-partner":    PartnerWelcome("https://makemelook.ai/partner/"),
		"u5-biometric":  BiometricDeleted("17.07.2026"),
	}
	for name, m := range cases {
		if m.Subject == "" || m.HTML == "" || m.Text == "" {
			t.Fatalf("%s: пустое поле письма", name)
		}
		if !strings.Contains(m.HTML, "МОНОРУС") {
			t.Fatalf("%s: нет реквизитов в футере", name)
		}
		os.WriteFile(dir+"/"+name+".html", []byte(m.HTML), 0644)
		os.WriteFile(dir+"/"+name+".txt", []byte("Subject: "+m.Subject+"\n\n"+m.Text), 0644)
	}
}
