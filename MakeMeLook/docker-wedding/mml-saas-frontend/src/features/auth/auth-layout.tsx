import type { FC, PropsWithChildren } from 'react';
import logoSvg from '@/shared/assets/logo-original.svg';
import { useLocale } from '@/shared/lib/locale';
import { t } from '@/shared/lib/i18n';

export const AuthLayout: FC<PropsWithChildren> = ({ children }) => {
  const locale = useLocale();

  return (
    <div className="grid min-h-svh lg:grid-cols-2">
      {/* Branding Panel */}
      <div className="relative hidden lg:flex flex-col justify-between overflow-hidden bg-[oklch(0.25_0.12_275)]">
        {/* Geometric pattern overlay */}
        <div className="absolute inset-0 opacity-[0.07]">
          <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern
                id="grid"
                width="60"
                height="60"
                patternUnits="userSpaceOnUse"
              >
                <path
                  d="M 60 0 L 0 60"
                  stroke="white"
                  strokeWidth="0.5"
                  fill="none"
                />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>
        </div>

        {/* Gradient overlay for depth */}
        <div className="absolute inset-0 bg-gradient-to-br from-[oklch(0.30_0.15_275)] via-[oklch(0.22_0.12_275)] to-[oklch(0.15_0.08_280)]" />

        {/* Diagonal accent lines */}
        <div className="absolute -right-20 top-1/3 h-px w-80 rotate-45 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
        <div className="absolute -left-10 bottom-1/4 h-px w-60 rotate-45 bg-gradient-to-r from-transparent via-white/10 to-transparent" />

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-between h-full p-12">
          <div>
            <img
              src={logoSvg}
              alt="MakeMeLook"
              className="h-6 brightness-0 invert opacity-90"
            />
          </div>

          <div className="max-w-md">
            <p className="text-white/40 text-xs font-medium tracking-[0.3em] uppercase mb-4">
              {t(locale, 'authLayout.badge')}
            </p>
            <h1 className="text-white text-4xl font-light leading-tight tracking-tight">
              {t(locale, 'authLayout.heroLine1')}
              <br />
              <span className="font-semibold">{t(locale, 'authLayout.heroLine2')}</span>
            </h1>
            <p className="text-white/50 mt-6 text-sm leading-relaxed max-w-sm">
              {t(locale, 'authLayout.heroDesc')}
            </p>
          </div>

          <div className="flex gap-12">
            <div>
              <p className="text-white/80 text-2xl font-semibold tabular-nums">
                40%
              </p>
              <p className="text-white/35 text-xs tracking-wide mt-1">
                {t(locale, 'authLayout.statReturns')}
              </p>
            </div>
            <div>
              <p className="text-white/80 text-2xl font-semibold tabular-nums">
                3.2x
              </p>
              <p className="text-white/35 text-xs tracking-wide mt-1">
                {t(locale, 'authLayout.statConversion')}
              </p>
            </div>
            <div>
              <p className="text-white/80 text-2xl font-semibold tabular-nums">
                5 min
              </p>
              <p className="text-white/35 text-xs tracking-wide mt-1">
                {t(locale, 'authLayout.statIntegration')}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Form Panel */}
      <div className="flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="lg:hidden mb-10">
            <img src={logoSvg} alt="MakeMeLook" className="h-5" />
          </div>

          {children}
        </div>
      </div>
    </div>
  );
};
