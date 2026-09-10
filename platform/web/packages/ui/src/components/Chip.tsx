import { forwardRef } from "react";
import type { ButtonHTMLAttributes } from "react";
import clsx from "clsx";

export interface ChipProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** selected = ink-фон + ivory-текст */
  selected?: boolean;
}

export const Chip = forwardRef<HTMLButtonElement, ChipProps>(
  ({ selected = false, type = "button", className, children, ...rest }, ref) => (
    <button
      ref={ref}
      type={type}
      aria-pressed={selected}
      className={clsx("mml-chip", selected && "mml-chip--selected", className)}
      {...rest}
    >
      {children}
    </button>
  ),
);

Chip.displayName = "Chip";
