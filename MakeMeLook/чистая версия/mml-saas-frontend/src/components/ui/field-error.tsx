import type { FC } from 'react';
import type { FieldError } from 'react-hook-form';

export const FieldErrorMessage: FC<{ error?: FieldError }> = ({ error }) => {
  return error ? (
    <p className="text-destructive text-xs">{error.message}</p>
  ) : null;
};
