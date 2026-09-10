'use client';

import { useState } from 'react';
import Script from 'next/script';

import { chat } from '@/fsd/__mocks__/ai-agent/mocks-en';
import IconChat from '@/fsd/shared/icons/IconChat';
import IconHanger from '@/fsd/shared/icons/IconHanger';
import IconTShirt from '@/fsd/shared/icons/IconTShirt';
import Modal from '@/fsd/shared/ui/Modal/Modal';
import Paragraph from '@/fsd/shared/ui/Word/Paragraph';
import AgentChat from '@/fsd/widgets/ai-agent/AgentChat/AgentChat';
import Contacts from '@/fsd/widgets/ai-agent/Contacts/Contacts';
import Faq from '@/fsd/widgets/ai-agent/Faq/Faq';
import Footer from '@/fsd/widgets/ai-agent/Footer/Footer';
import Header from '@/fsd/widgets/ai-agent/Header/Header';
import ImageCardFeature from '@/fsd/widgets/ai-agent/ImageCardFeature/ImageCardFeature';
import ImageCardPossibility from '@/fsd/widgets/ai-agent/ImageCardPossibility/ImageCardPossibility';
import InfoBlock from '@/fsd/widgets/ai-agent/InfoBlock/InfoBlock';
import { Promo } from '@/fsd/widgets/ai-agent/Promo/Promo';

import 'swiper/css';
import 'swiper/css/effect-coverflow';

import s from './page.module.css';

// eslint-disable-next-line import/no-unused-modules
export default function AIAgent() {
  const [openModal, setOpenModal] = useState<boolean>(false);

  const handleModalOpen = () => {
    setOpenModal(true);
  };

  return (
    <main className={s.main}>
      <Script strategy="lazyOnload" id="mmlb2b" src="/widget.js?v2" />

      <Header className={s.header} btnText="Get a demo" onClick={handleModalOpen} />

      <Promo
        className={s.section}
        content={{
          titleSection: 'AI-Stylist for your store',
          titleDesktop: 'Transform Your Online Fashion Store with AI-Powered Styling',
          titleMobile: 'Transform Your Online Fashion Store with AI-Powered Styling',
          subTitle:
            'Increase conversions, boost average order value, and reduce returns with personalized outfit recommendations tailored for your customers',
          btnText: 'Get a demo',
          image: '/assets/images/ai-agent/promo/1.png'
        }}
        onClick={handleModalOpen}
      />

      <InfoBlock
        className={s.section}
        content={{
          textBlocks: [
            <Paragraph key={1}>
              <span>
                Eliminate guesswork for shoppers who struggle to envision full outfits with
                impersonal search
              </span>
            </Paragraph>,

            <Paragraph key={2}>
              <span>MakeMeLook curates complete, tailored looks</span>

              <IconTShirt className={`${s.infoIcon} ${s.infoIconTShirt}`} />

              <span> that perfectly match each customer’s style</span>
            </Paragraph>,

            <Paragraph key={3}>
              <span>Let every visitor enjoy a personal stylist </span>

              <IconHanger className={`${s.infoIcon} ${s.infoIconHanger}`} />

              <span> experience right on your website with the MakeMeLook </span>

              <IconChat className={`${s.infoIcon} ${s.infoIconChat}`} />

              <span> widget</span>
            </Paragraph>
          ]
        }}
      />

      <ImageCardFeature
        className={s.section}
        content={{
          cardMain: {
            text: 'Sell a whole look rather than a single item - add value to the shopping cart',
            image1: '/assets/images/ai-agent/en/features/phone-1.png',
            image2: '/assets/images/ai-agent/en/features/phone-2.png',
            image3: '/assets/images/ai-agent/en/features/phone-3.png'
          },
          cards: [
            {
              text: 'Get a 22% increase in order conversion',
              imagePathDesktop: '/assets/images/ai-agent/en/features/feature-1.svg',
              customImageDesktopClassName: 'imageFeature1',
              customTextClassName: 'textFeature1',
              imageSizeDesktop: 'cover',
              imageSizeMobile: 'contain'
            },
            {
              text: 'Shoppers spend twice as much time on the your site',
              imagePathDesktop: '/assets/images/ai-agent/en/features/feature-3.svg',
              imagePathMobile: '/assets/images/ai-agent/en/features/feature-3.svg',
              imageSizeDesktop: 'cover',
              imageSizeMobile: 'contain'
            },
            {
              text: 'A few lines of code',
              comment:
                'Our widget is suitable for integration with all technologies. Just a few lines of code - and the widget is already on your website',
              imagePathDesktop: '/assets/images/ai-agent/en/features/feature-2.png',
              customImageDesktopClassName: 'imageFeature2',
              imageSizeDesktop: 'contain',
              imageSizeMobile: 'contain'
            },
            {
              text: 'ROI Focus',
              comment:
                'Proven to increase average order value by up to 25%, boost conversions by 22%, and reduce returns by 25%',
              imagePathDesktop: '/assets/images/ai-agent/en/features/feature-4.svg',
              imageSizeDesktop: 'cover',
              imageSizeMobile: 'cover',
              customImageMobileClassName: 'imageFeature4'
            }
          ]
        }}
      />

      <AgentChat
        className={s.section}
        content={{
          chat: chat,
          titleSection: 'How it works',
          title: 'Precise recommendations in a dialog format',
          textBtn: 'book a demo'
        }}
        onClick={handleModalOpen}
      />

      <ImageCardPossibility
        className={s.section}
        content={{
          cards: [
            {
              text: 'Size recommendations',
              comment:
                'Our neural network analyzes the size grid of each product, as well as the parameters and figure type of each customer',
              imageSize: 'cover',
              imagePathDesktop: '/assets/images/ai-agent/en/possibilities/1.png'
            },
            {
              text: 'Search by photo',
              comment:
                'The user can upload a favorite item or an entire look and the widget will find the most suitable items ones among your assortment',
              imageSize: 'cover',
              imagePathDesktop: '/assets/images/ai-agent/en/possibilities/2.png',
              customImageClassName: 'imagePossibilities2',
              onClick: handleModalOpen
            },
            {
              text: 'Personalization 24/7: AI-stylist is available around the clock ',
              comment: '',
              imageSize: 'cover',
              imagePathDesktop: '/assets/images/ai-agent/en/possibilities/3.png',
              customImageClassName: 'imagePossibilities3'
            },
            {
              text: 'Fewer returns - customers buy what they really want ',
              comment: '',
              imageSize: 'cover',
              imagePathDesktop: '/assets/images/ai-agent/en/possibilities/4.png',
              customImageClassName: 'imagePossibilities4',
              onClick: handleModalOpen
            }
          ]
        }}
      />

      <Faq className={s.faqSection} />

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

      {/*<FixedBtn onClick={handleModalOpen} className={s.fixedBtn} visible />*/}

      <Modal lang="en" onClose={() => setOpenModal(false)} opened={openModal} />
    </main>
  );
}
