import { forwardRef } from "react";
import type { CSSProperties, HTMLAttributes } from "react";
import clsx from "clsx";

export interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {
  width?: CSSProperties["width"];
  height?: CSSProperties["height"];
}

export const Skeleton = forwardRef<HTMLDivElement, SkeletonProps>(
  ({ width, height, style, className, ...rest }, ref) => (
    <div
      ref={ref}
      aria-hidden="true"
      className={clsx("mml-skeleton", className)}
      style={{ width, height, ...style }}
      {...rest}
    />
  ),
);

Skeleton.displayName = "Skeleton";
