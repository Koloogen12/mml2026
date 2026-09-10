'use client';

import { motion } from 'framer-motion';

import { PLATFORM_LOGIN_URL, PLATFORM_REGISTER_URL } from '@/fsd/shared/config/platform';
import Button from '@/fsd/shared/ui/Button/Button';

import s from './HeroPlatform.module.scss';

interface IStat {
  value: string;
  label: string;
}

interface IContent {
  badge: string;
  title: string;
  subtitle: string;
  ctaText: string;
  signInText: string;
  signInLinkText: string;
  stats: IStat[];
}

interface IProps {
  className?: string;
  content: IContent;
}

export default function HeroPlatform({ className, content }: IProps) {
  return (
    <section className={`${className || ''} ${s.container}`}>
      <div className={s.grid} aria-hidden="true" />

      <div className={s.inner}>
        <motion.div
          className={s.left}
          initial={{ opacity: 0, y: 48 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.25, 0.1, 0.25, 1] }}
        >
          <span className={s.badge}>{content.badge}</span>

          <h1 className={s.title}>{content.title}</h1>

          <p className={s.subtitle}>{content.subtitle}</p>

          <div className={s.actions}>
            <Button element="a" href={PLATFORM_REGISTER_URL} className={s.ctaBtn}>
              {content.ctaText}
            </Button>

            <div className={s.signIn}>
              <span>{content.signInText}</span>

              <a href={PLATFORM_LOGIN_URL} className={s.signInLink}>
                {content.signInLinkText}
              </a>
            </div>
          </div>

          <div className={s.stats}>
            {content.stats.map((stat, i) => (
              <motion.div
                key={i}
                className={s.stat}
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.45 + i * 0.12 }}
              >
                <span className={s.statValue}>{stat.value}</span>

                <span className={s.statLabel}>{stat.label}</span>
              </motion.div>
            ))}
          </div>
        </motion.div>

        <motion.div
          className={s.right}
          initial={{ opacity: 0, x: 56 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.85, delay: 0.25, ease: [0.25, 0.1, 0.25, 1] }}
        >
          <div className={s.browserFrame}>
            <div className={s.browserBar}>
              <div className={s.browserDots}>
                <span />

                <span />

                <span />
              </div>

              <div className={s.browserUrl}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z"
                    stroke="currentColor"
                    strokeWidth="1.5"
                  />

                  <path
                    d="M2 12h20M12 2c-2.8 3.3-4 7-4 10s1.2 6.7 4 10"
                    stroke="currentColor"
                    strokeWidth="1.5"
                  />
                </svg>
                your-shop.com
              </div>
            </div>

            <div className={s.browserContent}>
              <div className={s.shopPage}>
                <div className={s.shopHeader}>
                  <div className={s.shopLogo} />

                  <div className={s.shopNav}>
                    <span />

                    <span />

                    <span />
                  </div>
                </div>

                <div className={s.shopHero}>
                  <div className={s.shopProduct}>
                    <div className={s.shopProductImg} />

                    <div className={s.shopProductInfo}>
                      <div className={s.shopLine} style={{ width: '70%', height: '10px' }} />

                      <div className={s.shopLine} style={{ width: '45%', height: '8px' }} />

                      <div className={s.shopLine} style={{ width: '30%', height: '16px' }} />

                      <div className={s.shopBtn} />
                    </div>
                  </div>
                </div>
              </div>

              <motion.div
                className={s.widgetModal}
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.5, delay: 0.9 }}
              >
                <div className={s.widgetModalHeader}>
                  <div className={s.widgetBrand}>
                    <div className={s.widgetBrandDot} />

                    <span>MakeMeLook</span>
                  </div>

                  <button className={s.widgetClose}>
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                      <path
                        d="M1 1l10 10M11 1L1 11"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                      />
                    </svg>
                  </button>
                </div>

                <div className={s.widgetModalBody}>
                  <div className={s.widgetPhotoCol}>
                    <div className={s.widgetPhotoFrame}>
                      <div className={s.widgetFigureSilhouette} />

                      <div className={s.widgetOverlayItem} />
                    </div>

                    <div className={s.widgetPhotoLabel}>Ваше фото</div>
                  </div>

                  <div className={s.widgetCatalogCol}>
                    <div className={s.widgetCatalogTitle}>Выберите одежду</div>

                    <div className={s.widgetItems}>
                      {[0, 1, 2, 3].map((i) => (
                        <div
                          key={i}
                          className={`${s.widgetItem} ${i === 1 ? s.widgetItemActive : ''}`}
                        >
                          <div className={s.widgetItemImg} />
                        </div>
                      ))}
                    </div>

                    <div className={s.widgetTryBtn}>Примерить →</div>
                  </div>
                </div>
              </motion.div>

              <motion.div
                className={s.fabBtn}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.4, delay: 0.7, type: 'spring', stiffness: 200 }}
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                  <rect x="3" y="6" width="18" height="13" rx="2" stroke="white" strokeWidth="2" />

                  <path d="M8 6V4a4 4 0 018 0v2" stroke="white" strokeWidth="2" />

                  <circle cx="12" cy="12" r="2" fill="white" />
                </svg>
              </motion.div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
