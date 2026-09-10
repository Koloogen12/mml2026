import { type FC, useRef, useState, useEffect } from 'react';
import { useWidgetStore } from '@/store';
import { t, type TranslationKey } from '@/i18n';
import { uploadPhoto } from '@/api';
import toast from 'react-hot-toast';
import { assetUrl } from '@/lib/utils';

// Mirror of PHRASE_KEYS in components/TryOnLoader.tsx — keep these in sync
// when adding new phrases (this list is used during photo-upload waiting,
// the other one during try-on generation).
const LOADING_PHRASES: TranslationKey[] = [
  'loading.measuring',
  'loading.cutting',
  'loading.fitting',
  'loading.adjusting',
  'loading.learning',
  'loading.almostReady',
  'loading.handCrafted',
  'loading.finishing',
];

const CheckBadge: FC<{ label: string; style?: React.CSSProperties }> = ({ label, style }) => (
  <div
    className="absolute flex items-center gap-[6px] px-[12px] py-[11px] rounded-[12px] bg-white/90 backdrop-blur-[5px] shadow-sm"
    style={style}
  >
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <rect width="20" height="20" rx="4" fill="#34d399" />
      <path d="M6 10l3 3 5-5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
    <span className="font-['Inter',sans-serif] font-medium text-[15px] text-black leading-[20px] tracking-[-0.2px] whitespace-nowrap">
      {label}
    </span>
  </div>
);

const UploadingOverlay: FC<{ photoUrl: string }> = ({ photoUrl }) => {
  const [phraseIdx, setPhraseIdx] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setPhraseIdx((prev) => (prev + 1) % LOADING_PHRASES.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="mml-upload-loading">
      <img
        src={photoUrl}
        alt=""
        className="mml-upload-loading__bg"
        draggable={false}
      />
      <div className="mml-upload-loading__overlay" />
      <div className="mml-upload-loading__center">
        <img src={assetUrl('logo-symbol.svg')} alt="" className="mml-upload-loading__logo" />
        <div className="mml-upload-loading__phrase">
          <div className="mml-upload-loading__spinner" />
          <span>{t(LOADING_PHRASES[phraseIdx])}</span>
        </div>
      </div>
    </div>
  );
};

// Localised reject-screen copy for each backend reason_code. Keys map 1:1
// to the codes in internal/service/tryon.go::validationPromptText. If the
// backend ships a new code we don't know about yet, we fall back to the
// LLM-supplied message (and ultimately the generic `validation.reject.other`).
const REJECT_REASON_KEYS: Record<string, TranslationKey> = {
  no_person: 'validation.reject.no_person',
  not_a_real_photo: 'validation.reject.not_a_real_photo',
  multiple_people: 'validation.reject.multiple_people',
  selfie_closeup: 'validation.reject.selfie_closeup',
  not_full_body: 'validation.reject.not_full_body',
  too_far: 'validation.reject.too_far',
  back_or_side_view: 'validation.reject.back_or_side_view',
  non_standing_pose: 'validation.reject.non_standing_pose',
  bulky_outerwear: 'validation.reject.bulky_outerwear',
  partial_occlusion: 'validation.reject.partial_occlusion',
  low_quality: 'validation.reject.low_quality',
  screenshot: 'validation.reject.screenshot',
  collage: 'validation.reject.collage',
  other: 'validation.reject.other',
};

interface RejectionState {
  reason: string;
  /** Backend-supplied Russian message (fallback when reason isn't in REJECT_REASON_KEYS). */
  fallbackMsg: string;
  /** The original File the user selected — kept so "Try anyway" can re-upload with ?force=true. */
  file: File;
  /** Local blob URL of the rejected photo to preview on the screen. */
  previewUrl: string;
}

export const PhotoUploadStage: FC = () => {
  const goToStage = useWidgetStore((s) => s.goToStage);
  const goBack = useWidgetStore((s) => s.goBack);
  const setModelPhoto = useWidgetStore((s) => s.setModelPhoto);
  const sessionToken = useWidgetStore((s) => s.sessionToken);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState('');
  const [rejection, setRejection] = useState<RejectionState | null>(null);

  const handleUpload = async (file: File, opts?: { force?: boolean }) => {
    if (!sessionToken) return;
    const preview = URL.createObjectURL(file);
    setPreviewUrl(preview);
    setRejection(null);
    setUploading(true);
    try {
      const resp = await uploadPhoto(sessionToken, file, opts);
      setModelPhoto(resp.public_id, resp.url);
      goToStage('showroom');
    } catch (err) {
      const axiosErr = err as {
        code?: string;
        response?: {
          status?: number;
          data?: {
            error?: { code?: string; reason?: string; message?: string };
            photo_url?: string;
            object_key?: string;
          };
        };
      };
      const status = axiosErr?.response?.status;
      const errData = axiosErr?.response?.data?.error;
      // 422 + photo_rejected → backend rejected the photo via the strict
      // validator. Show the dedicated reject screen with the matching
      // reason_code message + "Try anyway" override.
      if (status === 422 && errData?.code === 'photo_rejected') {
        setRejection({
          reason: errData.reason || 'other',
          fallbackMsg: errData.message || '',
          file,
          previewUrl: preview,
        });
        return;
      }
      // Everything else is a transport / unexpected error → keep the old
      // toast UX so the user can simply retry.
      if (axiosErr.code === 'ECONNABORTED') {
        toast.error(t('photoUpload.uploadError'));
      } else {
        const serverMsg = errData?.message;
        toast.error(
          typeof serverMsg === 'string' && serverMsg
            ? serverMsg
            : t('photoUpload.uploadError'),
        );
      }
      URL.revokeObjectURL(preview);
      setPreviewUrl('');
    } finally {
      setUploading(false);
      // CRITICAL: reset file input so the user can re-select the same file
      // (without this, onChange never fires again for the same filename).
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size (max 10MB)
    const MAX_SIZE = 10 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      toast.error(t('common.fileTooLarge'));
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    await handleUpload(file);
  };

  if (uploading && previewUrl) {
    return <UploadingOverlay photoUrl={previewUrl} />;
  }

  // Rejection screen — strict validator said no. Two paths out:
  //   1. "Upload another photo"  → drop rejection, open file picker again
  //   2. "Try anyway"            → re-upload the same file with force=true
  if (rejection) {
    const i18nKey = REJECT_REASON_KEYS[rejection.reason];
    const localisedMsg = i18nKey ? t(i18nKey) : '';
    const message = localisedMsg || rejection.fallbackMsg || t('validation.reject.other');
    return (
      <div className="relative w-full h-full overflow-hidden rounded-[24px] bg-white flex flex-col">
        {/* Back button */}
        <button
          type="button"
          aria-label={t('nav.back')}
          onClick={() => {
            URL.revokeObjectURL(rejection.previewUrl);
            setRejection(null);
            setPreviewUrl('');
          }}
          className="absolute top-[14px] left-[14px] z-[3] flex items-center justify-center w-[36px] h-[36px] rounded-full bg-white/90 backdrop-blur-[5px] shadow-sm cursor-pointer hover:bg-white transition-colors"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1a1a1a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>

        {/* Preview of the rejected photo */}
        <div className="flex-1 relative bg-[#f4f4f4] overflow-hidden">
          <img
            src={rejection.previewUrl}
            alt=""
            className="w-full h-full object-cover"
            draggable={false}
          />
          {/* Warning chip overlaid on the photo */}
          <div className="absolute top-[14px] right-[14px] flex items-center gap-[6px] px-[10px] py-[7px] rounded-full bg-[#ffe5e5] backdrop-blur-[5px] shadow-sm">
            <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
              <circle cx="10" cy="10" r="9" fill="#e54a4a" />
              <path d="M10 5v6" stroke="white" strokeWidth="2" strokeLinecap="round" />
              <circle cx="10" cy="14" r="1" fill="white" />
            </svg>
            <span className="font-['Inter',sans-serif] font-medium text-[12px] text-[#9a1c1c] leading-[16px]">
              {t('validation.reject.title')}
            </span>
          </div>
        </div>

        {/* Bottom card with reason + actions */}
        <div className="bg-white rounded-t-[20px] flex flex-col gap-[16px] px-[24px] pt-[20px] pb-[24px] shadow-[0_-8px_24px_rgba(0,0,0,0.08)] z-[2]">
          <p className="font-['Inter',sans-serif] font-medium text-[15px] leading-[20px] text-[#1a1a1a] text-center">
            {message}
          </p>
          <div className="flex flex-col gap-[10px]">
            <button
              className="flex items-center justify-center h-[52px] bg-[#1a1a1a] rounded-[500px] cursor-pointer"
              onClick={() => {
                URL.revokeObjectURL(rejection.previewUrl);
                setRejection(null);
                setPreviewUrl('');
                fileInputRef.current?.click();
              }}
            >
              <span
                className="font-['Inter',sans-serif] font-medium text-[15px] leading-[20px] tracking-[-0.2px]"
                style={{
                  background: 'linear-gradient(131deg, #f5bfd7 5%, #f5ffe0 34%, #caefd7 62%, #abc9e9 106%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}
              >
                {t('validation.reject.uploadAnother')}
              </span>
            </button>
            <button
              className="flex items-center justify-center h-[44px] rounded-[500px] cursor-pointer bg-transparent border border-[#e0e0e0]"
              onClick={() => {
                // Re-upload the same file with the force flag. The backend
                // bypasses the validator on force=true and the upload
                // proceeds (with a Telegram alert tagging the override).
                const f = rejection.file;
                URL.revokeObjectURL(rejection.previewUrl);
                setRejection(null);
                setPreviewUrl('');
                void handleUpload(f, { force: true });
              }}
            >
              <span className="font-['Inter',sans-serif] font-normal text-[13px] leading-[18px] tracking-[-0.1px] text-[#666666]">
                {t('validation.reject.tryAnyway')}
              </span>
            </button>
          </div>
        </div>

        {/* Hidden file input for "Upload another" CTA */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
        />
      </div>
    );
  }

  return (
    <div className="relative w-full h-full overflow-hidden rounded-[24px] bg-white">
      <img
        src={assetUrl('photo-upload-example.jpg')}
        alt=""
        className="absolute inset-0 w-full h-full object-cover"
        draggable={false}
      />

      {/* Back button — top-left, mirrors the close button style so it
          doesn't visually dominate the example photo. Sits above badges
          via z-[3]. */}
      <button
        type="button"
        aria-label={t('nav.back')}
        onClick={goBack}
        className="absolute top-[14px] left-[14px] z-[3] flex items-center justify-center w-[36px] h-[36px] rounded-full bg-white/90 backdrop-blur-[5px] shadow-sm cursor-pointer hover:bg-white transition-colors"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1a1a1a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M15 18l-6-6 6-6" />
        </svg>
      </button>

      {/* Badges on the photo */}
      <CheckBadge label={t('photoUpload.badgeFullBody')} style={{ top: '18%', left: '8%' }} />
      <CheckBadge label={t('photoUpload.badgeStraight')} style={{ top: '25%', right: '8%' }} />
      <CheckBadge label={t('photoUpload.badgeFitting')} style={{ top: '62%', left: '8%' }} />

      {/* Bottom card */}
      <div className="absolute bottom-[10px] left-[10px] right-[10px] bg-white rounded-[20px] flex flex-col items-center gap-[32px] px-[24px] pt-[24px] pb-[42px] z-[2]">
        <div className="flex flex-col items-center gap-[8px] py-[3px] w-full">
          <h2 className="font-['Inter',sans-serif] font-semibold text-[24px] leading-[28px] tracking-[-0.8px] text-[#1a1a1a] whitespace-nowrap">
            {t('photoUpload.heading')}
          </h2>
          <p className="font-['Inter',sans-serif] font-normal text-[15px] leading-[20px] tracking-[-0.14px] text-[#1a1a1a] text-center">
            {t('photoUpload.descPrefix')}{' '}
            <span
              className="text-[#005ff9] underline cursor-pointer"
              onClick={() => goToStage('photoRecommendations')}
            >
              {t('photoUpload.descLink')}
            </span>
          </p>
        </div>

        <button
          className="flex items-center justify-center gap-[4px] w-[240px] h-[60px] bg-[#1a1a1a] rounded-[500px] cursor-pointer"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
        >
          <span
            className="font-['Inter',sans-serif] font-medium text-[15px] leading-[20px] tracking-[-0.2px]"
            style={{
              background: 'linear-gradient(131deg, #f5bfd7 5%, #f5ffe0 34%, #caefd7 62%, #abc9e9 106%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            {t('photoUpload.selectBtn')}
          </span>
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <rect x="3" y="3" width="14" height="14" rx="3" stroke="url(#img-grad)" strokeWidth="1.5" />
            <circle cx="7.5" cy="7.5" r="1.5" fill="url(#img-grad)" />
            <path d="M3 14l4-4 3 3 2-2 5 5" stroke="url(#img-grad)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            <defs>
              <linearGradient id="img-grad" x1="3" y1="3" x2="17" y2="17">
                <stop offset="0%" stopColor="#f5bfd7" />
                <stop offset="50%" stopColor="#caefd7" />
                <stop offset="100%" stopColor="#abc9e9" />
              </linearGradient>
            </defs>
          </svg>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
          />
        </button>
      </div>
    </div>
  );
};
