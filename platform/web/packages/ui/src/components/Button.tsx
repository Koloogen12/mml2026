import { forwardRef } from "react";
import type { ButtonHTMLAttributes } from "react";
import clsx from "clsx";

export type ButtonVariant = "primary" | "accent" | "ghost" | "text";
export type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** primary — ink; accent — ТОЛЬКО примерка и AI-действия; ghost — белый с бордером; text — без фона */
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Показывает спиннер и блокирует кнопку */
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = "primary",
      size = "md",
      loading = false,
      disabled,
      type = "button",
      className,
      children,
      ...rest
    },
    ref,
  ) => (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={clsx(
        "mml-btn",
        `mml-btn--${variant}`,
        `mml-btn--${size}`,
        className,
      )}
      {...rest}
    >
      {loading && <span className="mml-btn__spinner" aria-hidden="true" />}
      {children}
    </button>
  ),
);

Button.displayName = "Button";
