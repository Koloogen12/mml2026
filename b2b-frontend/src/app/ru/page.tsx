'use client';

import Script from 'next/script';
import { useMemo, useState } from 'react';

import { barChart1, barChart2, chat, slider } from '@/fsd/__mocks__/mocks-ru';
import IconPhoto from '@/fsd/shared/icons/IconPhoto';
import IconPlanet from '@/fsd/shared/icons/IconPlanet';
import IconShop from '@/fsd/shared/icons/IconShop';
import IconSofa from '@/fsd/shared/icons/IconSofa';
import IconTShirt from '@/fsd/shared/icons/IconTShirt';
import { FixedBtn } from '@/fsd/shared/ui/FixedBtn/FixedBtn';
import Modal from '@/fsd/shared/ui/Modal/Modal';
import { IStep } from '@/fsd/shared/ui/Steps/Steps';
import Paragraph from '@/fsd/shared/ui/Word/Paragraph';
import { Calc } from '@/fsd/widgets/Calc/Calc';
import Chat from '@/fsd/widgets/Chat/Chat';
import Contacts from '@/fsd/widgets/Contacts/Contacts';
import { Dressing } from '@/fsd/widgets/Dressing/Dressing';
import Examples from '@/fsd/widgets/Examples/Examples';
import Footer from '@/fsd/widgets/Footer/Footer';
import Header from '@/fsd/widgets/Header/Header';
import { ImageCardAdvantage } from '@/fsd/widgets/ImageCardAdvantage/ImageCardAdvantage';
import ImageCardFeature from '@/fsd/widgets/ImageCardFeature/ImageCardFeature';
import ImageCardPossibility from '@/fsd/widgets/ImageCardPossibility/ImageCardPossibility';
import InfoBlock from '@/fsd/widgets/InfoBlock/InfoBlock';
import { VideoIntro } from '@/fsd/widgets/VideoIntro';
import { BlogTeaser } from '@/components/blog/BlogTeaser';

import 'swiper/css';
import 'swiper/css/effect-coverflow';

import s from '../page.module.css';

// eslint-disable-next-line import/no-unused-modules
export default function Home() {
  const [activeStep, setActiveStep] = useState(0);
  const [openModal, setOpenModal] = useState<boolean>(false);

  const steps = useMemo<IStep[]>((): IStep[] => {
    return [
      {
        content: 'Маркетинг',
        active: activeStep === 0
      },
      {
        content: 'Экономика',
        active: activeStep === 1
      },
      {
        content: 'Устойчивость',
        active: activeStep === 2
      }
    ];
  }, [activeStep]);

  const handleModalOpen = () => {
    setOpenModal(true);
  };

  return (
    <main className={s.main}>
      <Header className={s.header} onClick={handleModalOpen} />

      <Dressing
        className={s.section}
        content={{
          titleSection: 'Виртуальная примерочная',
          titleDesktop: 'Увеличьте конверсию онлайн-продаж до 50% с виджетом makemelook',
          titleMobile: (
            <>
              <p>Увеличьте конверсию онлайн-продаж</p>

              <p>до 50% с виджетом makemelook</p>
            </>
          ),
          subTitle: 'Превращайте посетителей в покупателей',
          btnText: 'Получить демо',
          slider: {
            imagePreview: '/assets/images/slider/preview.png',
            title: 'Загрузите фотографию',
            text: 'примерьте вещь и узнайте нужный размер',
            slides: slider
          }
        }}
        onClick={handleModalOpen}
      />

      <VideoIntro lang="ru" onClick={handleModalOpen} />

      <InfoBlock
        className={s.section}
        content={{
          textBlocks: [
            <Paragraph key={1}>
              <span>Избавьте покупателей от стресса при выборе подходящих вещей и размера</span>
            </Paragraph>,
            <Paragraph key={2}>
              <span>Покупатели смогут примерять</span>

              <IconTShirt className={s.infoIcon} />

              <span>одежду с помощью виртуального помощника не вставая со своего</span>

              <IconSofa className={s.infoIcon} />

              <span>дивана</span>
            </Paragraph>,

            <Paragraph key={3}>
              <span>
                Дайте возможность пользователям создавать образы и примерять вещи сразу на своих
              </span>

              <IconPhoto className={s.infoIcon} />

              <span>фотографиях с виджетом makemelook</span>
            </Paragraph>
          ]
        }}
      />

      <ImageCardFeature
        className={s.section}
        content={{
          cardMain: {
            text: 'Дарите уникальный опыт пользователям с помощью виджета виртуального помощника',
            image1: '/assets/images/features/phone-1-1.png',
            image2: '/assets/images/features/phone-2.png',
            image3: '/assets/images/features/phone-3.png'
          },
          cards: [
            {
              text: 'увеличение конверсии заказа на 40%',
              imagePathDesktop: '/assets/images/features/feature-1.svg',
              customImageDesktopClassName: 'imageFeature1',
              customTextClassName: 'textFeature1',
              imageSizeDesktop: 'cover'
            },
            {
              text: 'снижение возвратов купленных товаров на 25 %',
              imagePathDesktop: '/assets/images/features/feature-2.png',
              imagePathMobile: '/assets/images/features/feature-2-m.png',
              customImageDesktopClassName: 'imageFeature2',
              customImageMobileClassName: 'imageFeature2',
              imageSizeDesktop: 'cover',
              imageSizeMobile: 'cover'
            },
            {
              text: 'увеличение продолжительности сессии на вашем ресурсе',
              imagePathDesktop: '/assets/images/features/feature-3.svg',
              imagePathMobile: '/assets/images/features/feature-3-m.svg',
              imageSizeDesktop: 'cover',
              imageSizeMobile: 'contain'
            },
            {
              text: 'сокращение дополнительных расходов на 25%',
              imagePathDesktop: '/assets/images/features/feature-4.svg',
              imagePathMobile: '/assets/images/features/feature-4-m.svg',
              imageSizeDesktop: 'cover',
              imageSizeMobile: 'contain',
              customImageDesktopClassName: 'imageFeature4',
              customImageMobileClassName: 'imageFeature4Mobile'
            }
          ]
        }}
      />

      <InfoBlock
        className={s.section}
        content={{
          textBlocks: [
            <Paragraph key={1}>
              <span>
                Мы подробно изучили основные причины, по которым покупатели возвращают заказы и
                нашли способ их решения
              </span>

              <IconPlanet className={s.infoIcon} />
            </Paragraph>
          ]
        }}
      />

      <ImageCardAdvantage
        className={s.section}
        content={{
          cards: [
            {
              title: 'MakeMeLook.Fit',
              text: '68% покупателей утверждают, что рекомендации размера помогут избежать возврата товара',
              comment: 'Узнайте лучше своих покупателей и сократите дополнительные расходы',
              imagePathDesktop: '/assets/images/advantages/1.png',
              imageSize: 'cover'
            },
            {
              title: 'MakeMeLook.TryOn',
              text: '42% возвратов связаны с неподходящим фасоном, стилем или цветом одежды',
              comment: 'Повысьте уверенность покупателей, с помощью виртуальной примерки',
              imagePathDesktop: '/assets/images/advantages/2.svg',
              imagePathMobile: '/assets/images/advantages/2-m.svg',
              imageSize: 'contain'
            }
          ]
        }}
      />

      <Examples
        className={s.section}
        setActiveStep={setActiveStep}
        activeStep={activeStep}
        content={{
          titleSection: 'Примеры использования',
          title: 'Повышение эффективности бизнеса',
          steps: steps,
          slide1: {
            chartData: barChart1,
            title:
              'Увеличьте эффективность маркетинга через создание уникального пользовательского опыта'
          },
          slide2: {
            chartData: barChart2,
            title: 'Повысьте ROI за счет снижения возвратов и повышения ключевых конверсий'
          },
          slide3: {
            title: 'Снижение углеродного следа, благодаря более точному подбору вещей'
          }
        }}
      />

      <Calc className={s.section} lang="ru" />

      <Chat
        className={s.section}
        content={{
          chat: chat,
          titleSection: 'Интеграция виджета',
          title: 'Быстро и легко настроим работу виджета',
          textBtn: 'Записаться на демонстрацию'
        }}
        onClick={handleModalOpen}
      />

      <InfoBlock
        className={s.section}
        content={{
          textBlocks: [
            <Paragraph key={1}>
              <span>Интегрируйте веб-виджет MakeMeLook на свою целевую страницу или веб-сайт</span>

              <IconShop className={s.infoIcon} />

              <span>чтобы учесть все сценарии использования</span>
            </Paragraph>
          ]
        }}
        style={{
          maxWidth: '680px'
        }}
      />

      <ImageCardPossibility
        className={s.section}
        content={{
          cards: [
            {
              text: 'Детская одежда',
              comment:
                'Дети быстро растут и не всегда просто угадать с размером. Мы позволяем вам увидеть, как одежда будет смотреться на вашем ребенке',
              imageSize: 'cover',
              imagePathDesktop: '/assets/images/possibilities/1.png',
              imagePathMobile: '/assets/images/possibilities/1-m.png'
            },
            {
              text: 'Усталость от примерок',
              comment:
                'Не всегда есть время и желание примерять одежду. Дайте возможность загрузить свою фотографию и увидеть как будет смотреться образ',
              imageSize: 'cover',
              imagePathDesktop: '/assets/images/possibilities/2.png',
              customImageClassName: 'imagePossibilities2',
              onClick: handleModalOpen
            },
            {
              text: 'Особые случаи',
              comment:
                'Пользователь хочет сделать подарок, но не знает, что выбрать. Виртуальная примерка поможет найти идеальный подарок для вашего близкого человека или члена семьи',
              imageSize: 'cover',
              imagePathDesktop: '/assets/images/possibilities/3.png',
              customImageClassName: 'imagePossibilities3'
            },
            {
              text: 'Покупки для близких',
              comment:
                'Пользователь хочет найти одежду для своих друзей или семьи. Наша технология даст точную рекомендацию по размеру, стилю и возрасту',
              imageSize: 'cover',
              imagePathDesktop: '/assets/images/possibilities/4.png',
              customImageClassName: 'imagePossibilities4',
              onClick: handleModalOpen
            }
          ]
        }}
      />

      {/* Blog teaser — 3 latest posts above the final CTA.
          Wrapped in .blog-root so Tailwind + brand tokens apply without
          leaking, and in <section className={s.section}> so it honors the
          landing's standard 140/110px inter-section rhythm. */}
      <section className={s.section}>
        <div className="blog-root">
          <BlogTeaser />
        </div>
      </section>

      <Contacts
        className={s.contactSection}
        onClickBtnApplication={handleModalOpen}
        content={{
          title: (
            <>
              <p>Запишитесь</p>

              <p>на демонстрацию,</p>

              <p>выбрав удобный слот в календаре</p>
            </>
          ),
          textBtnApplication: 'Оставить заявку',
          textBtnTime: 'Выбрать время'
        }}
      />

      <Footer />

      <FixedBtn onClick={handleModalOpen} className={s.fixedBtn} visible />

      <Modal lang="ru" onClose={() => setOpenModal(false)} opened={openModal} />

      <Script
        strategy="afterInteractive"
        id="mmlb2b"
        src={'https://b2b.makemelook.ai/widgetfit/widget.js?v' + Date.now()}
      />
    </main>
  );
}
