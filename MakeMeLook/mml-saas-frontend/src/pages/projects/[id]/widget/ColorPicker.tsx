import { useState, useRef, useEffect } from 'react';
import type { FC } from 'react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface ColorPickerProps {
  value: string;
  onChange: (color: string) => void;
  label?: string;
}

export const ColorPicker: FC<ColorPickerProps> = ({
  value,
  onChange,
  label,
}) => {
  const [inputValue, setInputValue] = useState(value);
  const nativePickerRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setInputValue(value);
  }, [value]);

  const handleInputChange = (hex: string) => {
    setInputValue(hex);
    if (/^#[0-9A-Fa-f]{6}$/.test(hex)) {
      onChange(hex);
    }
  };

  const handleSwatchClick = () => {
    nativePickerRef.current?.click();
  };

  return (
    <div className="relative">
      {label && (
        <span className="text-sm font-medium text-foreground mb-1.5 block">
          {label}
        </span>
      )}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={handleSwatchClick}
          className={cn(
            'w-9 h-9 rounded-md border border-border shrink-0 cursor-pointer',
            'ring-offset-background transition-shadow',
            'hover:ring-2 hover:ring-ring hover:ring-offset-1',
          )}
          style={{ backgroundColor: value }}
        />
        <input
          ref={nativePickerRef}
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="sr-only"
        />
        <Input
          value={inputValue}
          onChange={(e) => handleInputChange(e.target.value)}
          onBlur={() => setInputValue(value)}
          className="font-mono text-sm h-9 w-28"
          maxLength={7}
        />
      </div>
    </div>
  );
};
