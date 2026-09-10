import { type FC, useState, useCallback } from 'react';
import type { Gender } from '@/types';

export interface CardSwitchOption {
  value: string;
  label: string;
  imageMale: string;
  imageFemale: string;
}

interface CardSwitchProps {
  options: CardSwitchOption[];
  value: string;
  gender: Gender;
  onChange: (value: string) => void;
}

export const CardSwitch: FC<CardSwitchProps> = ({
  options,
  value,
  gender,
  onChange,
}) => {
  const [activeIndex, setActiveIndex] = useState(() =>
    Math.max(
      0,
      options.findIndex((o) => o.value === value),
    ),
  );

  const currentOption = options[activeIndex];

  const handleCardClick = useCallback(
    (index: number) => {
      setActiveIndex(index);
      onChange(options[index].value);
    },
    [onChange, options],
  );

  const handlePrev = useCallback(() => {
    const newIndex = activeIndex <= 0 ? options.length - 1 : activeIndex - 1;
    setActiveIndex(newIndex);
    onChange(options[newIndex].value);
  }, [activeIndex, onChange, options]);

  const handleNext = useCallback(() => {
    const newIndex = activeIndex >= options.length - 1 ? 0 : activeIndex + 1;
    setActiveIndex(newIndex);
    onChange(options[newIndex].value);
  }, [activeIndex, onChange, options]);

  return (
    <div className="mml-card-switch">
      <div className="mml-card-switch__cards">
        {options.map((option, i) => (
          <div
            key={option.value}
            className={`mml-card-switch__card ${i === activeIndex ? 'mml-card-switch__card--active' : ''}`}
            onClick={() => handleCardClick(i)}
          >
            <img
              src={gender === 'male' ? option.imageMale : option.imageFemale}
              alt={option.label}
            />
          </div>
        ))}
      </div>
      <div className="mml-card-switch__controls">
        <div className="mml-card-switch__btn-left" onClick={handlePrev} />
        <div className="mml-card-switch__label">{currentOption?.label}</div>
        <div className="mml-card-switch__btn-right" onClick={handleNext} />
      </div>
    </div>
  );
};
