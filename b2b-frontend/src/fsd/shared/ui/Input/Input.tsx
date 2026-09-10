'use client';

import { forwardRef, InputHTMLAttributes } from 'react';
import { FieldError, FieldErrorsImpl, Merge } from 'react-hook-form';

import { errorCatch } from '@/fsd/shared/utils/errorCatch';

import s from './Input.module.scss';

interface IInputProps {
  isChanged: string | null;
  label?: string;
  classNameLabel?: string;
  error?: FieldError | Merge<FieldError, FieldErrorsImpl<any>> | undefined;
}

type TInputProps = InputHTMLAttributes<HTMLInputElement> & IInputProps;

interface IProps extends TInputProps {}

const Input = forwardRef<HTMLInputElement, IProps>(
  (
    { isChanged, value, onChange, placeholder, label, className, error, disabled, ...otherProps },
    ref
  ) => {
    return (
      <div className={`${s.container} ${className || ''}`}>
        <label>
          <p className={s.label}>{label}</p>

          <div className={`${s.inputGroup} ${disabled ? s.disabled : ''} ${error ? s.error : ''}`}>
            <input
              autoComplete="off"
              value={value}
              onChange={onChange}
              type="text"
              disabled={disabled}
              className={s.input}
              ref={ref}
              {...otherProps}
            />

            <span className={`${s.placeholder} ${!!isChanged ? s.placeholderTop : ''}`}>
              {placeholder}

              {error && <div className={s.errorMessage}>{errorCatch(error)}</div>}
            </span>
          </div>
        </label>
      </div>
    );
  }
);

Input.displayName = 'Input';

export default Input;
