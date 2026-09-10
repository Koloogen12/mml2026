import type { FC } from 'react';

interface StageCtaProps {
  label: string;
  onClick: () => void;
  disabled?: boolean;
}

const ArrowIcon: FC = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
    <path
      d="M7.5 5L12.5 10L7.5 15"
      stroke="url(#cta-arrow-grad)"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <defs>
      <linearGradient id="cta-arrow-grad" x1="7" y1="5" x2="13" y2="15">
        <stop offset="0%" stopColor="#f5bfd7" />
        <stop offset="50%" stopColor="#caefd7" />
        <stop offset="100%" stopColor="#abc9e9" />
      </linearGradient>
    </defs>
  </svg>
);

export const StageCta: FC<StageCtaProps> = ({ label, onClick, disabled }) => (
  <div className="mml-stage-cta-wrap">
    <button
      className={`mml-stage-cta ${disabled ? 'mml--disabled' : ''}`}
      onClick={disabled ? undefined : onClick}
    >
      <span className="mml-stage-cta__text">{label}</span>
      <ArrowIcon />
    </button>
  </div>
);
