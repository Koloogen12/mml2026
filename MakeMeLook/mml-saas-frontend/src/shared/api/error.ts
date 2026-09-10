import { AxiosError } from 'axios';

interface ApiErrorBody {
  error: {
    code: string;
    message: string;
  };
}

export function getApiError(error: unknown): { code: string; message: string } {
  if (error instanceof AxiosError && error.response?.data) {
    const body = error.response.data as ApiErrorBody;
    if (body.error?.code) {
      return body.error;
    }
  }
  return { code: 'unknown', message: 'Something went wrong' };
}
