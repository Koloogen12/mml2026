import { type FC, useRef, useState, useEffect } from 'react';
import { useWidgetStore } from '@/store';
import { t, type TranslationKey } from '@/i18n';
import { uploadPhoto } from '@/api';
import toast from 'react-hot-toast';
import { assetUrl } from '@/lib/utils';

const LOADING_PHRASES: TranslationKey[] = [
  'loading.measuring',
  'loading.cutting',
  'loading.fitting',
  'loading.adjusting',
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

export const PhotoUploadStage: FC = () => {
  const goToStage = useWidgetStore((s) => s.goToStage);
  const setModelPhoto = useWidgetStore((s) => s.setModelPhoto);
  const sessionToken = useWidgetStore((s) => s.sessionToken);
  const setLoading = useWidgetStore((s) => s.setLoading);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState('');

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !sessionToken) return;

    // Validate file size (max 10MB)
    const MAX_SIZE = 10 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      toast.error(t('common.fileTooLarge'));
      return;
    }

    const preview = URL.createObjectURL(file);
    setPreviewUrl(preview);
    setUploading(true);
    setLoading(true);
    try {
      const resp = await uploadPhoto(sessionToken, file);
      setModelPhoto(resp.public_id, resp.url);
      goToStage('showroom');
    } catch {
      toast.error(t('photoUpload.uploadError'));
      // Stay on upload screen — don't navigate with a fake photo ID
    } finally {
      setUploading(false);
      setLoading(false);
    }
  };

  if (uploading && previewUrl) {
    return <UploadingOverlay photoUrl={previewUrl} />;
  }

  return (
    <div className="relative w-full h-full overflow-hidden rounded-[24px] bg-white">
      <img
        src={assetUrl('photo-upload-example.jpg')}
        alt=""
        className="absolute inset-0 w-full h-full object-cover"
        draggable={false}
      />

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
