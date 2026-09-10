-- Метка последней авто-реактивации заглохшего лида (антиспам-кулдаун дрипа).
ALTER TABLE users ADD COLUMN reactivated_at TIMESTAMPTZ;
