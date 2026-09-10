import type { WidgetConfig } from '@/types';

// Default widget config — matches widgetfit visual style
export const DEFAULT_CONFIG: Omit<
  WidgetConfig,
  'projectId' | 'apiBaseUrl' | 'products'
> = {
  buttonPosition: 'bottom-right',
  buttonOffsetX: 20,
  buttonOffsetY: 20,
  buttonType: 'circle',
  buttonSize: 60,
  buttonColor: '#1a1a1a',
  buttonTextColor: '#ffffff',
  buttonText: 'Try On',
  buttonShadow: true,
  buttonAnimation: 'pulse',

  modalWidth: 542,
  modalHeight: 658,

  primaryColor: '#1a1a1a',
  secondaryColor: '#454545',
  backgroundColor: '#ffffff',
  textColor: '#1a1a1a',
  accentColor: '#898989',
  fontFamily: 'Inter, sans-serif',
  borderRadius: 12,

  stages: {
    intro: true,
    gender: true,
    parameters: true,
    measurements: true,
    bellyShape: true,
    figureType: true,
    privacyPolicy: true,
    photoUpload: true,
  },

  avatarsEnabled: true,
  avatarsMode: 'both',

  logoUrl: null,
  poweredByEnabled: true,

  rememberProgress: true,
  autoOpen: false,
  autoOpenDelay: 5,

  language: 'ru',

  monthlyTryOnLimit: 10,

  elementsEnabled: {
    favorites: true,
    cart: true,
    history: true,
    settings: true,
  },
  clothTypesEnabled: {
    outerwear: true,
    tops: true,
    bottoms: true,
    shoes: true,
  },

  introTitle: '',
  introDescription: '',
  introImage: '',
  paramsTitle: '',
  paramsSubtitle: '',
  measurementsTitle: '',
  measurementsSubtitle: '',
  bellyTitle: '',
  bellySubtitle: '',
  figureTitle: '',
  figureSubtitle: '',
};
