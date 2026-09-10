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
export default function PlatformPageEn() {
  return (
    <main className={s.main}>
      <Header
        className={s.header}
        btnText="Sign in"
        onClick={() => {
          window.location.href = PLATFORM_LOGIN_URL;
        }}
      />

      <HeroPlatform
        content={{
          badge: 'AI Virtual Try-On SaaS',
          title: 'Embeddable virtual try-on widget for online stores',
          subtitle: 'Connect in 5 minutes. Increase conversion by 50%. Reduce returns by 25%.',
          ctaText: 'Try for free',
          signInText: 'Already have an account?',
          signInLinkText: 'Sign in',
          stats: [
            { value: '500+', label: 'stores' },
            { value: '+40%', label: 'conversion' },
            { value: '−25%', label: 'returns' }
          ]
        }}
      />

      <FeaturesPlatform
        content={{
          sectionLabel: 'Benefits',
          title: 'Why MakeMeLook',
          features: [
            {
              icon: <IconConversion />,
              metric: '+40%',
              title: 'Conversion',
              description:
                '40% conversion increase through interactive try-on directly on your product pages.'
            },
            {
              icon: <IconReturns />,
              metric: '−25%',
              title: 'Returns',
              description:
                '25% fewer returns through accurate size recommendations and visual outfit preview before purchase.'
            },
            {
              icon: <IconIntegration />,
              metric: '5 min',
              title: 'Integration',
              description:
                'One script tag on any website or CMS — WordPress, Shopify, Tilda, or custom-built.'
            },
            {
              icon: <IconAI />,
              metric: 'AI',
              title: 'Generative AI',
              description:
                "Generative AI dresses real clothes from your catalog onto the buyer's uploaded photo."
            }
          ]
        }}
      />

      <HowItWorksPlatform
        content={{
          sectionLabel: 'Process',
          title: 'How it works',
          subtitle: 'Three steps from registration to a working widget on your website.',
          steps: [
            {
              num: '01',
              icon: <IconUpload />,
              title: 'Upload your product catalog',
              description:
                'Import products via CSV or add them manually. Upload clothing photos — the widget uses them for virtual try-on.'
            },
            {
              num: '02',
              icon: <IconSettings />,
              title: 'Configure the widget',
              description:
                'Use the visual configurator to set colors, fonts, try-on stages, and avatar collection. See changes in real time.'
            },
            {
              num: '03',
              icon: <IconCode />,
              title: 'Embed on your website',
              description:
                'Copy one script tag and paste it into your product page or site template. The widget activates automatically.'
            }
          ]
        }}
      />

      <PricingPlatform
        content={{
          sectionLabel: 'Pricing',
          title: 'Transparent pricing',
          popularLabel: 'Most popular',
          plans: {
            starter: {
              name: 'Starter',
              price: 'Free',
              period: '/ month',
              desc: 'For testing. 100 try-ons per month, 1 project.',
              cta: 'Start for free'
            },
            growth: {
              name: 'Growth',
              price: '$59',
              period: '/ month',
              desc: '2,000 try-ons, 5 projects, email support, analytics.',
              cta: 'Get Growth'
            },
            enterprise: {
              name: 'Enterprise',
              price: 'Custom',
              period: '',
              desc: 'Unlimited, white-label, SLA, dedicated support.',
              cta: 'Contact us'
            }
          },
          features: [
            {
              label: 'Try-ons per month',
              starter: '100',
              growth: '2,000',
              enterprise: 'Unlimited'
            },
            { label: 'Projects', starter: '1', growth: '5', enterprise: 'Unlimited' },
            { label: 'Photo upload', starter: true, growth: true, enterprise: true },
            { label: 'Avatar collection', starter: true, growth: true, enterprise: true },
            { label: 'Analytics', starter: false, growth: true, enterprise: true },
            { label: 'White-label', starter: false, growth: false, enterprise: true },
            { label: 'SLA / dedicated support', starter: false, growth: false, enterprise: true },
            { label: 'CSV catalog import', starter: true, growth: true, enterprise: true }
          ]
        }}
      />

      <FaqPlatform
        content={{
          sectionLabel: 'FAQ',
          title: 'Frequently asked questions',
          items: [
            {
              question: 'How quickly can I connect the widget?',
              answer:
                'In 5 minutes. Register, create a project, upload a few products, copy the script tag, and paste it on your website. The widget works immediately.'
            },
            {
              question: 'Do I need technical knowledge to install it?',
              answer:
                "No. All you need to do is copy one line of code and paste it into your website's HTML. Step-by-step instructions are available for WordPress, Shopify, Tilda, and other popular platforms."
            },
            {
              question: 'What CMS and platforms are supported?',
              answer:
                'WordPress, WooCommerce, Shopify, Tilda, Bitrix, OpenCart, PrestaShop, and any custom website — the widget works on any page that supports JavaScript.'
            },
            {
              question: 'How does the AI try-on work?',
              answer:
                'The buyer uploads their photo or selects an avatar from the collection. Generative AI places the selected clothing from your catalog onto the photo, creating a realistic try-on result in seconds.'
            },
            {
              question: 'Is there a free trial?',
              answer:
                'Yes. The Starter plan includes 100 try-ons per month for free with no time limit. The Growth plan comes with a 14-day free trial with all features included.'
            },
            {
              question: 'How are try-on limits counted?',
              answer:
                "One try-on equals one AI image generation (buyer's photo + selected clothing item). Viewing a previously generated result does not count toward the limit."
            }
          ]
        }}
      />

      <CtaSectionPlatform
        content={{
          title: 'Start free today',
          subtitle: 'Create an account, upload your catalog, and install the widget in 5 minutes.',
          ctaText: 'Create free account',
          secondaryText: 'No credit card required · 100 try-ons free forever'
        }}
      />

      <Footer privacyText="Privacy Policy" termsText="Terms of Service" />
    </main>
  );
}
