import { forwardRef } from "react";
import type { InputHTMLAttributes } from "react";
import clsx from "clsx";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  /** Состояние ошибки: бордер #C0392B + фон #FDEEEC */
  error?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ error = false, className, ...rest }, ref) => (
    <input
      ref={ref}
      aria-invalid={error || undefined}
      className={clsx("mml-input", error && "mml-input--error", className)}
      {...rest}
    />
  ),
);

Input.displayName = "Input";
