'use client';

import { PLATFORM_LOGIN_URL } from '@/fsd/shared/config/platform';
import IconCode from '@/fsd/shared/icons/IconCode';
import IconSettings from '@/fsd/shared/icons/IconSettings';
import IconUpload from '@/fsd/shared/icons/IconUpload';
import Footer from '@/fsd/widgets/Footer/Footer';
import Header from '@/fsd/widgets/Header/Header';
import CtaSectionPlatform from '@/fsd/widgets/platform/CtaSectionPlatform/CtaSectionPlatform';
import FaqPlatform from '@/fsd/widgets/platform/FaqPlatform/FaqPlatform';
import {
  IconAI,
  IconConversion,
  IconIntegration,
  IconReturns
} from '@/fsd/widgets/platform/FeaturesPlatform/FeaturesPlatform';
import FeaturesPlatform from '@/fsd/widgets/platform/FeaturesPlatform/FeaturesPlatform';
import HeroPlatform from '@/fsd/widgets/platform/HeroPlatform/HeroPlatform';
import HowItWorksPlatform from '@/fsd/widgets/platform/HowItWorksPlatform/HowItWorksPlatform';
import PricingPlatform from '@/fsd/widgets/platform/PricingPlatform/PricingPlatform';

import s from './page.module.scss';

// eslint-disable-next-line import/no-unused-modules
export default function PlatformPageRu() {
  return (
    <main className={s.main}>
      <Header
        className={s.header}
        btnText="Войти в кабинет"
        onClick={() => {
          window.location.href = PLATFORM_LOGIN_URL;
        }}
      />

      <HeroPlatform
        content={{
          badge: 'AI Virtual Try-On SaaS',
          title: 'Встраиваемый виджет виртуальной примерки для интернет-магазинов',
          subtitle: 'Подключите за 5 минут. Увеличьте конверсию до 50%. Снизьте возвраты на 25%.',
          ctaText: 'Попробовать бесплатно',
          signInText: 'Уже есть аккаунт?',
          signInLinkText: 'Войти',
          stats: [
            { value: '500+', label: 'магазинов' },
            { value: '40%', label: 'рост конверсии' },
            { value: '25%', label: 'меньше возвратов' }
          ]
        }}
      />

      <FeaturesPlatform
        content={{
          sectionLabel: 'Преимущества',
          title: 'Почему MakeMeLook',
          features: [
            {
              icon: <IconConversion />,
              metric: '+40%',
              title: 'Конверсия',
              description:
                'Увеличение конверсии заказа благодаря интерактивной примерке прямо на сайте магазина.'
            },
            {
              icon: <IconReturns />,
              metric: '−25%',
              title: 'Возвраты',
              description:
                'Снижение возвратов за счёт точного подбора размера и визуализации образа до покупки.'
            },
            {
              icon: <IconIntegration />,
              metric: '5 мин',
              title: 'Интеграция',
              description:
                'Один script-тег на любой сайт или CMS — WordPress, Shopify, Tilda, собственный движок.'
            },
            {
              icon: <IconAI />,
              metric: 'AI',
              title: 'Генеративный AI',
              description:
                'Генеративный AI примеряет реальную одежду из каталога на загруженное фото покупателя.'
            }
          ]
        }}
      />

      <HowItWorksPlatform
        content={{
          sectionLabel: 'Процесс',
          title: 'Как это работает',
          subtitle: 'Три шага от регистрации до работающего виджета на вашем сайте.',
          steps: [
            {
              num: '01',
              icon: <IconUpload />,
              title: 'Загрузите каталог товаров',
              description:
                'Импортируйте товары через CSV или добавьте вручную. Загрузите фотографии одежды — виджет использует их для примерки.'
            },
            {
              num: '02',
              icon: <IconSettings />,
              title: 'Настройте виджет',
              description:
                'В визуальном конфигураторе настройте цвета, шрифты, стадии примерки и аватаров. Видите результат в реальном времени.'
            },
            {
              num: '03',
              icon: <IconCode />,
              title: 'Встройте на сайт',
              description:
                'Скопируйте один script-тег и вставьте на страницу товара или в шаблон сайта. Виджет заработает автоматически.'
            }
          ]
        }}
      />

      <PricingPlatform
        content={{
          sectionLabel: 'Тарифы',
          title: 'Прозрачные цены',
          popularLabel: 'Популярный',
          plans: {
            starter: {
              name: 'Starter',
              price: '0 ₽',
              period: '/ месяц',
              desc: 'Для тестирования. 100 примерок в месяц, 1 проект.',
              cta: 'Начать бесплатно'
            },
            growth: {
              name: 'Growth',
              price: '4 990 ₽',
              period: '/ месяц',
              desc: '2 000 примерок, 5 проектов, email-поддержка, аналитика.',
              cta: 'Подключить Growth'
            },
            enterprise: {
              name: 'Enterprise',
              price: 'По запросу',
              period: '',
              desc: 'Безлимит, white-label, SLA, выделенная поддержка.',
              cta: 'Связаться с нами'
            }
          },
          features: [
            { label: 'Примерок в месяц', starter: '100', growth: '2 000', enterprise: 'Безлимит' },
            { label: 'Проектов', starter: '1', growth: '5', enterprise: 'Безлимит' },
            { label: 'Загрузка фото покупателя', starter: true, growth: true, enterprise: true },
            { label: 'Коллекция аватаров', starter: true, growth: true, enterprise: true },
            { label: 'Аналитика', starter: false, growth: true, enterprise: true },
            { label: 'White-label', starter: false, growth: false, enterprise: true },
            {
              label: 'SLA / выделенная поддержка',
              starter: false,
              growth: false,
              enterprise: true
            },
            { label: 'CSV-импорт каталога', starter: true, growth: true, enterprise: true }
          ]
        }}
      />

      <FaqPlatform
        content={{
          sectionLabel: 'FAQ',
          title: 'Частые вопросы',
          items: [
            {
              question: 'Как быстро можно подключить виджет?',
              answer:
                'За 5 минут. Зарегистрируйтесь, создайте проект, загрузите несколько товаров, скопируйте один script-тег и вставьте его на страницу сайта. Виджет заработает сразу.'
            },
            {
              question: 'Нужны ли технические знания для подключения?',
              answer:
                'Нет. Всё, что нужно — скопировать одну строку кода и вставить её в HTML вашего сайта. Если вы пользуетесь WordPress, Shopify или Tilda — есть пошаговые инструкции для каждой платформы.'
            },
            {
              question: 'Какие CMS и платформы поддерживаются?',
              answer:
                'WordPress, WooCommerce, Shopify, Tilda, Битрикс, OpenCart, PrestaShop, а также любой кастомный сайт — виджет работает на любой странице с поддержкой JavaScript.'
            },
            {
              question: 'Как работает AI-примерка?',
              answer:
                'Покупатель загружает своё фото или выбирает аватара из коллекции. Генеративный AI накладывает выбранную одежду из каталога магазина на фото, создавая реалистичный результат примерки за секунды.'
            },
            {
              question: 'Есть ли бесплатный период?',
              answer:
                'Да. Тариф Starter включает 100 примерок в месяц бесплатно без ограничений по времени. Для тарифа Growth доступен 14-дневный пробный период со всеми функциями.'
            },
            {
              question: 'Как считается лимит примерок?',
              answer:
                'Одна примерка — это одна генерация AI-изображения (фото покупателя + выбранная одежда). Повторный просмотр уже сгенерированного результата лимит не расходует.'
            }
          ]
        }}
      />

      <CtaSectionPlatform
        content={{
          title: 'Начните бесплатно сегодня',
          subtitle: 'Создайте аккаунт, загрузите каталог и установите виджет на сайт за 5 минут.',
          ctaText: 'Создать аккаунт бесплатно',
          secondaryText: 'Не нужна кредитная карта · 100 примерок бесплатно'
        }}
      />

      <Footer privacyText="Политика конфиденциальности" termsText="Условия использования" />
    </main>
  );
}
