import { type FC, useState } from 'react';
import { useWidgetStore } from '@/store';
import { StageLayout } from '@/components/StageLayout';
import { updateSession } from '@/api';
import { t } from '@/i18n';

export const AccountEmailStage: FC = () => {
  const email = useWidgetStore((s) => s.email);
  const setEmail = useWidgetStore((s) => s.setEmail);
  const sessionToken = useWidgetStore((s) => s.sessionToken);
  const goBack = useWidgetStore((s) => s.goBack);
  const [inputValue, setInputValue] = useState(email ?? '');
  const [saving, setSaving] = useState(false);

  const isValid = inputValue.trim().length > 0;

  const handleSave = async () => {
    if (!isValid || !sessionToken) return;
    setSaving(true);
    try {
      await updateSession(sessionToken, { email: inputValue.trim() });
      setEmail(inputValue.trim());
      goBack();
    } catch {
      // Still save locally on error
      setEmail(inputValue.trim());
      goBack();
    } finally {
      setSaving(false);
    }
  };

  return (
    <StageLayout heading={t('account.email')} showBack>
      <input
        className="mml-account-email__field"
        type="email"
        placeholder={t('account.emailPlaceholder')}
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
      />
      <button
        className={`mml-btn-primary mml-account-email__btn ${!isValid || saving ? 'mml--disabled' : ''}`}
        onClick={handleSave}
        disabled={saving}
      >
        {saving ? t('common.saving') : t('common.save')}
      </button>
    </StageLayout>
  );
};
