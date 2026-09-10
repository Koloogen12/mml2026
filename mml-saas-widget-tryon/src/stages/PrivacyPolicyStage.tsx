import { type FC, useState } from 'react';
import { useWidgetStore } from '@/store';
import { t, getLocale } from '@/i18n';
import { assetUrl } from '@/lib/utils';
import { recordConsent } from '@/api';

const SAAS_BASE_URL = 'https://admin.makemelook.tech';

// Bump when the consent wording changes — audit trail uses this to prove
// which policy revision the user accepted.
const CONSENT_POLICY_VERSION = '2026-04-24';

export const PrivacyPolicyStage: FC = () => {
  const goToStage = useWidgetStore((s) => s.goToStage);
  const backTo = useWidgetStore((s) => s.backTo);
  const sessionToken = useWidgetStore((s) => s.sessionToken);
  const [agreed, setAgreed] = useState(false);
  const [showPolicy, setShowPolicy] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const locale = getLocale();
  const fullPolicyUrl = `${SAAS_BASE_URL}/${locale}/personal-data-policy`;
  const fullPrivacyUrl = `${SAAS_BASE_URL}/${locale}/privacy`;

  const handleContinue = async () => {
    if (!agreed || submitting) return;
    setSubmitting(true);
    try {
      if (sessionToken) {
        await recordConsent(sessionToken, 'biometric', CONSENT_POLICY_VERSION, locale);
      }
    } catch {
      // Consent logging failure must not block a legally valid consent
      // the user has already given — continue to photo upload anyway.
    } finally {
      setSubmitting(false);
      goToStage('photoUpload');
    }
  };

  if (showPolicy) {
    return (
      <div className="mml-privacy-policy-text">
        <div className="mml-privacy-policy-text__header">
          <button
            className="mml-privacy-policy-text__back"
            onClick={() => setShowPolicy(false)}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#1a1a1a" strokeWidth="2" strokeLinecap="round">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
        </div>
        <div className="mml-privacy-policy-text__body">
          <h2>{t('privacy.policyTitle')}</h2>
          <h3>1. {t('privacy.policy1Title')}</h3>
          <p>{t('privacy.policy1Text')}</p>
          <h3>2. {t('privacy.policy2Title')}</h3>
          <p>{t('privacy.policy2Text')}</p>
          <h3>3. {t('privacy.policy3Title')}</h3>
          <p>{t('privacy.policy3Text')}</p>
          <h3>4. {t('privacy.policy4Title')}</h3>
          <p>{t('privacy.policy4Text')}</p>
          <p style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 12 }}>
            <a href={fullPolicyUrl} target="_blank" rel="noopener noreferrer">
              → {t('privacy.fullPolicyLink')}
            </a>
            <a href={fullPrivacyUrl} target="_blank" rel="noopener noreferrer">
              → {t('privacy.fullPrivacyLink')}
            </a>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mml-privacy">
      {/* Background photo — NO blur overlay, clean image */}
      <div className="mml-privacy__bg">
        <img src={assetUrl('privacy-bg.jpg')} alt="" draggable={false} />
      </div>

      {/* Privacy badge floating over the photo */}
      <div className="mml-privacy__badge">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24" />
          <line x1="1" y1="1" x2="23" y2="23" />
        </svg>
        <span>{t('privacy.badge')}</span>
      </div>

      {/* Bottom card */}
      <div className="mml-privacy__card">
        <h2 className="mml-privacy__heading">{t('privacy.heading')}</h2>
        <p className="mml-privacy__desc">{t('privacy.description')}</p>

        {/* Consent row */}
        <div className="mml-privacy__consent">
          <div className="mml-privacy__consent-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#005cf1" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              <circle cx="12" cy="10" r="3" />
              <path d="M12 13v1" />
            </svg>
          </div>
          <div className="mml-privacy__consent-text">
            <strong>{t('privacy.consentTitle')}</strong>
            <span>
              {t('privacy.consentPrefix')}{' '}
              <a onClick={() => setShowPolicy(true)}>{t('privacy.consentLink')}</a>
              {' '}{t('privacy.consentSuffix')}
            </span>
          </div>
          <label className="mml-toggle">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
            />
            <span className="mml-toggle__slider" />
          </label>
        </div>

        {/* CTA */}
        {backTo !== 'settings' && (
          <div className="mml-privacy__cta-wrap">
            <button
              className={`mml-onboarding__cta ${!agreed || submitting ? 'mml-onboarding__cta--disabled' : ''}`}
              onClick={handleContinue}
              disabled={!agreed || submitting}
            >
              <span className="mml-onboarding__cta-text">{t('common.continue')}</span>
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M12.5 7.5L15 10L12.5 12.5" stroke="url(#cta-grad-p)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M5 10H15" stroke="url(#cta-grad-p)" strokeWidth="1.5" strokeLinecap="round" />
                <defs>
                  <linearGradient id="cta-grad-p" x1="5" y1="7" x2="15" y2="13">
                    <stop offset="0%" stopColor="#f5bfd7" />
                    <stop offset="33%" stopColor="#f5ffe0" />
                    <stop offset="62%" stopColor="#caefd7" />
                    <stop offset="100%" stopColor="#abc9e9" />
                  </linearGradient>
                </defs>
              </svg>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
