export function cn(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(' ');
}

export function generateSessionToken(): string {
  return crypto.randomUUID();
}

let _assetsBase = 'https://mml-saas.quantimo.ru';

export function setAssetsBase(apiBaseUrl: string): void {
  _assetsBase = apiBaseUrl.replace(/\/+$/, '');
}

export function assetUrl(path: string): string {
  return `${_assetsBase}/s3/widget-assets/${path}`;
}
