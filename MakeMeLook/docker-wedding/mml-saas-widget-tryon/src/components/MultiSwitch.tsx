import type { FC } from 'react';

interface MultiSwitchProps {
  label?: string;
  items: string[];
  value: string;
  onChange: (value: string) => void;
}

export const MultiSwitch: FC<MultiSwitchProps> = ({
  label,
  items,
  value,
  onChange,
}) => {
  return (
    <div className="mml-multi-switch">
      {label && <div className="mml-multi-switch__label">{label}</div>}
      <div className="mml-multi-switch__items">
        {items.map((item) => (
          <div
            key={item}
            className={`mml-multi-switch__item ${item === value ? 'mml-multi-switch__item--active' : ''}`}
            onClick={() => onChange(item)}
          >
            {item}
          </div>
        ))}
      </div>
    </div>
  );
};
