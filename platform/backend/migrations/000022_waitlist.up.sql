-- Лист ожидания с главной makemelook.ai. Почта, а не телефон: SMS платные, а
-- код входа мы и так шлём письмом.
--
-- Заявки живут здесь, а не в бэкенде виджета (где лежал телефонный вариант):
-- виджет — отдельный прод, пересобирать его ради формы на лендинге незачем.
CREATE TABLE IF NOT EXISTS waitlist_signups (
    id         BIGSERIAL PRIMARY KEY,
    email      TEXT NOT NULL,
    source     TEXT NOT NULL DEFAULT 'landing',
    ip         TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Повторная отправка той же почты не плодит строки и не двигает очередь:
-- человек, нажавший дважды, должен увидеть тот же номер.
CREATE UNIQUE INDEX IF NOT EXISTS waitlist_signups_email_key
    ON waitlist_signups (lower(email));
