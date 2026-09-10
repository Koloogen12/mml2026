'use client';

import Script from 'next/script';
import { useMemo, useState } from 'react';

import { barChart1, barChart2, chat, slider } from '@/fsd/__mocks__/mocks-en';
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

import 'swiper/css';
import 'swiper/css/effect-coverflow';

import s from '../page.module.css';

// eslint-disable-next-line import/no-unused-modules
export default function HomeEn() {
  const [activeStep, setActiveStep] = useState(0);
  const [openModal, setOpenModal] = useState<boolean>(false);

  const steps = useMemo<IStep[]>((): IStep[] => {
    return [
      {
        content: 'Marketing',
        active: activeStep === 0
      },
      {
        content: 'Economics',
        active: activeStep === 1
      },
      {
        content: 'Sustainable',
        active: activeStep === 2
      }
    ];
  }, [activeStep]);

  const handleModalOpen = () => {
    setOpenModal(true);
  };

  return (
    <main className={s.main}>
      <Header className={s.header} btnText={'Get a demo'} onClick={handleModalOpen} />

      <Dressing
        className={s.section}
        content={{
          titleSection: 'Virtual fitting room',
          titleDesktop:
            'Increase the conversion rate online sales up to 50% with MakeMeLook widget',
          titleMobile: 'Increase the conversion rate online sales up to 50% with MakeMeLook widget',
          subTitle: 'Turn visitors into buyers',
          btnText: 'Get a demo',
          slider: {
            imagePreview: '/assets/images/en/slider/preview.png',
            title: 'Upload a photo',
            text: 'try the item on and find out what size you need',
            slides: slider
          }
        }}
        onClick={handleModalOpen}
      />

      <VideoIntro lang="en" onClick={handleModalOpen} />

      <InfoBlock
        className={s.section}
        content={{
          textBlocks: [
            <Paragraph key={1}>
              <span>
                Take the stress out of your customers when selecting the right items and size
              </span>
            </Paragraph>,
            <Paragraph key={2}>
              <span>Customers will be able to try on</span>

              <IconTShirt className={s.infoIcon} />

              <span>clothes using an AI-powered widget without getting of the</span>

              <IconSofa className={s.infoIcon} />

              <span>couch</span>
            </Paragraph>,
            <Paragraph key={3}>
              <span>
                Give users the opportunity to create outfit and try on right away in their photos
              </span>

              <IconPhoto className={s.infoIcon} />

              <span>with the MakeMeLook widget</span>
            </Paragraph>
          ]
        }}
      />

      <ImageCardFeature
        className={s.section}
        content={{
          cardMain: {
            text: 'Deliver a unique user experience with the virtual fitting room widget',
            image1: '/assets/images/en/features/phone-1.png',
            image2: '/assets/images/en/features/phone-2.png',
            image3: '/assets/images/en/features/phone-3.png'
          },
          cards: [
            {
              text: 'Get a 40% increase in order conversion',
              imagePathDesktop: '/assets/images/en/features/feature-1.svg',
              customImageDesktopClassName: 'imageFeature1',
              customTextClassName: 'textFeature1',
              imageSizeDesktop: 'cover'
            },
            {
              text: 'Get reduction of returns of purchased goods by 25%',
              imagePathDesktop: '/assets/images/en/features/feature-2.png',
              imagePathMobile: '/assets/images/features/feature-2-m.png',
              customImageDesktopClassName: 'imageFeature2',
              imageSizeDesktop: 'cover'
            },
            {
              text: 'Get an increase in session duration on your website',
              imagePathDesktop: '/assets/images/en/features/feature-3.svg',
              imagePathMobile: '/assets/images/features/feature-3-m.svg',
              imageSizeDesktop: 'cover',
              imageSizeMobile: 'contain'
            },
            {
              text: 'Reduce additional costs by 25%',
              imagePathDesktop: '/assets/images/en/features/feature-4.svg',
              imagePathMobile: '/assets/images/en/features/feature-4-m.svg',
              imageSizeDesktop: 'cover',
              imageSizeMobile: 'contain',
              customImageMobileClassName: 'imageFeature4'
            }
          ]
        }}
      />

      <InfoBlock
        className={s.section}
        content={{
          textBlocks: [
            <Paragraph key={1}>
              <span>We took an in-depth look at the top reasons clothing orders and found</span>

              <IconPlanet className={s.infoIcon} />

              <span>a way to solve them</span>
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
              text: '68% of shoppers say size recommendations will help avoid returns',
              comment: 'Get to know your customers better and reduce additional costs',
              imagePathDesktop: '/assets/images/en/advantages/1.png',
              imageSize: 'cover'
            },
            {
              title: 'MakeMeLook.TryOn',
              text: '42% of returns are due to inappropriate fit, style or color of the garment',
              comment: 'Increase shopper confidence with a virtual fitting experience',
              imagePathDesktop: '/assets/images/en/advantages/2.svg',
              imagePathMobile: '/assets/images/en/advantages/2-m.svg',
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
          titleSection: 'Examples of use',
          title: 'Improving business efficiency',
          steps: steps,
          slide1: {
            chartData: barChart1,
            title: 'Increase marketing effectiveness through creating a unique user experience'
          },
          slide2: {
            chartData: barChart2,
            title: 'Increase ROI by reducing returns and increasing key conversions'
          },
          slide3: {
            title: 'Reducing your carbon footprint by picking things up more accurately'
          }
        }}
      />

      <Calc className={s.section} lang="en" />

      <Chat
        className={s.section}
        content={{
          chat: chat,
          titleSection: 'Widget integration',
          title: 'Quickly and easily customize the widget',
          textBtn: 'book a demo'
        }}
        onClick={handleModalOpen}
      />

      <InfoBlock
        className={s.section}
        content={{
          textBlocks: [
            <Paragraph key={1}>
              <span>
                Integrate the MakeMeLook web widget into the product pages on your website
              </span>

              <IconShop className={s.infoIcon} />

              <span>here are some user cases</span>
            </Paragraph>
          ]
        }}
      />

      <ImageCardPossibility
        className={s.section}
        content={{
          cards: [
            {
              text: 'Buying clothes for kids',
              comment:
                'Kids grow quickly and it&apos;s not always easy to guess on size. We allow shoppers to see exactly what size will fit their child',
              imageSize: 'cover',
              imagePathDesktop: '/assets/images/en/possibilities/1.png',
              imagePathMobile: '/assets/images/en/possibilities/1-m.png'
            },
            {
              text: 'Try-on fatigue',
              comment:
                'You don&apos;t always have the time or desire to try on clothes. Give you the opportunity to upload your photo and see how the image will look like',
              imageSize: 'cover',
              imagePathDesktop: '/assets/images/en/possibilities/2.png',
              customImageClassName: 'imagePossibilities2',
              onClick: handleModalOpen
            },
            {
              text: 'Gifts for special occasions',
              comment:
                'A visitor wants to give a gift but doesn&apos;t know what to choose. Virtual fitting will help to find the perfect gift for a loved one or family member',
              imageSize: 'cover',
              imagePathDesktop: '/assets/images/en/possibilities/3.png',
              customImageClassName: 'imagePossibilities3'
            },
            {
              text: 'Need to try on before buying',
              comment:
                'Waiting for a courier or having to try on at a drop-off point can be a barrier to ordering',
              imageSize: 'cover',
              imagePathDesktop: '/assets/images/en/possibilities/4.png',
              customImageClassName: 'imagePossibilities4',
              onClick: handleModalOpen
            }
          ]
        }}
      />

      <Contacts
        className={s.contactSection}
        onClickBtnApplication={handleModalOpen}
        content={{
          title: 'Sign up for a demo by selecting a convenient slot on the calendar',
          textBtnApplication: 'Leave a request',
          textBtnTime: 'Choose a time'
        }}
      />

      <Footer
        className={s.footer}
        privacyText="Privacy Policy"
        termsText="Terms of use of the service"
      />

      <FixedBtn onClick={handleModalOpen} className={s.fixedBtn} />

      <Modal lang="en" onClose={() => setOpenModal(false)} opened={openModal} />

      <Script
        strategy="afterInteractive"
        id="mmlb2b"
        src={'https://b2b.makemelook.ai/widgetfit/widget.js?v' + Date.now()}
      />
    </main>
  );
}
