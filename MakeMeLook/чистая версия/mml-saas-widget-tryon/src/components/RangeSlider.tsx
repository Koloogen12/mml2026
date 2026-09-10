import { type FC, useRef, useCallback, useState, useEffect } from 'react';

interface RangeSliderProps {
  label: string;
  unitLabel: string;
  min: number;
  max: number;
  value: number;
  step?: number;
  onChange: (value: number) => void;
}

export const RangeSlider: FC<RangeSliderProps> = ({
  label,
  unitLabel,
  min,
  max,
  value,
  step = 1,
  onChange,
}) => {
  const trackRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const totalSteps = Math.floor((max - min) / step);
  const currentIndex = Math.round((value - min) / step);
  const percent = totalSteps > 0 ? (currentIndex / totalSteps) * 100 : 0;

  const getValueFromX = useCallback(
    (clientX: number) => {
      const track = trackRef.current;
      if (!track) return value;
      const rect = track.getBoundingClientRect();
      const x = clientX - rect.left;
      const ratio = Math.max(0, Math.min(1, x / rect.width));
      const idx = Math.round(ratio * totalSteps);
      return min + idx * step;
    },
    [min, step, totalSteps, value],
  );

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      setIsDragging(true);
      onChange(getValueFromX(e.clientX));
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    },
    [getValueFromX, onChange],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!isDragging) return;
      onChange(getValueFromX(e.clientX));
    },
    [isDragging, getValueFromX, onChange],
  );

  const handlePointerUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      const prevent = (e: Event) => e.preventDefault();
      document.addEventListener('selectstart', prevent);
      return () => document.removeEventListener('selectstart', prevent);
    }
  }, [isDragging]);

  return (
    <div className="mml-slider">
      <div className="mml-slider__header">
        <span className="mml-slider__label">
          {label}
          {unitLabel && (
            <span className="mml-slider__unit">, {unitLabel}</span>
          )}
        </span>
        <span className="mml-slider__value">{value}</span>
      </div>
      <div
        className={`mml-slider__track ${isDragging ? 'mml-slider__track--active' : ''}`}
        ref={trackRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        <div
          className="mml-slider__fill"
          style={{ width: `${percent}%` }}
        >
          <div className="mml-slider__thumb" />
        </div>
      </div>
    </div>
  );
};
