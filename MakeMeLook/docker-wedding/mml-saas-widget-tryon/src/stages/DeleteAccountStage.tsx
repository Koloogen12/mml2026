import { useState, type FC } from 'react';
import { useWidgetStore } from '@/store';
import { StageLayout } from '@/components/StageLayout';
import { t } from '@/i18n';
import { getApiClient } from '@/api';

export const DeleteAccountStage: FC = () => {
  const goBack = useWidgetStore((s) => s.goBack);
  const goToStage = useWidgetStore((s) => s.goToStage);
  const reset = useWidgetStore((s) => s.reset);
  const sessionToken = useWidgetStore((s) => s.sessionToken);
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    setLoading(true);
    try {
      if (sessionToken) {
        await getApiClient().delete(`/api/widget/v1/sessions/${sessionToken}`);
      }
    } catch {
      // best-effort — clear local state regardless
    }
    localStorage.removeItem('mml_session_token');
    reset();
    goToStage('intro');
  };

  return (
    <StageLayout heading={t('deleteAccount.heading')} showBack>
      <div className="mml-modal__subheading" style={{ marginTop: 36 }}>
        {t('deleteAccount.description')}
      </div>
      <div className="mml-delete-account__buttons">
        <button className="mml-btn-secondary" onClick={handleDelete} disabled={loading}>
          {loading ? '...' : t('common.delete')}
        </button>
        <button className="mml-btn-primary" onClick={goBack}>
          {t('common.back')}
        </button>
      </div>
    </StageLayout>
  );
};
