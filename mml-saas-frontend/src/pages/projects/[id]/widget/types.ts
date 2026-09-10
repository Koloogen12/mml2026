export interface StageProps {
  config: WidgetConfig;
  fontFamily: string;
}

export interface StagesEnabled {
  intro: boolean;
  gender: boolean;
  height_weight: boolean;
  measurements: boolean;
  size: boolean;
  belly: boolean;
  figure: boolean;
}

export interface ElementsEnabled {
  favorites: boolean;
  cart: boolean;
  history: boolean;
  settings: boolean;
}

export interface ClothTypesEnabled {
  outerwear: boolean;
  tops: boolean;
  bottoms: boolean;
  shoes: boolean;
}

export type ButtonPosition =
  | 'bottom-right'
  | 'bottom-left'
  | 'top-right'
  | 'top-left';
export type ButtonType = 'circle' | 'rectangle' | 'pill';
export type ButtonAnimation = 'none' | 'pulse' | 'wobble' | 'glow';
export type ColorMode = 'light' | 'dark' | 'custom';
export type PhotoModeDefault = 'upload' | 'avatar' | 'both';
export type WidgetLanguage = 'ru' | 'en' | 'auto';

export interface WidgetConfig {
  // Button
  button_position: ButtonPosition;
  button_offset_x: number;
  button_offset_y: number;
  button_type: ButtonType;
  button_size: number;
  button_bg_color: string;
  button_icon_color: string;
  button_icon?: string;
  button_tooltip: string;
  button_shadow: boolean;
  button_animation: ButtonAnimation;
  button_delay: number;

  // Window
  color_mode: ColorMode;
  accent_color: string;
  accent_text_color: string;
  bg_color: string;
  text_color: string;
  secondary_text_color: string;
  font_family: string;
  border_radius: number;
  logo_url?: string;
  show_powered_by: boolean;

  // Elements
  stages_enabled: StagesEnabled;
  elements_enabled: ElementsEnabled;
  cloth_types_enabled: ClothTypesEnabled;

  // Avatars
  avatars_enabled: boolean;
  photo_mode_default: PhotoModeDefault;

  // Stage content
  intro_title: string;
  intro_description: string;
  intro_image: string;
  params_title: string;
  params_subtitle: string;
  measurements_title: string;
  measurements_subtitle: string;
  belly_title: string;
  belly_subtitle: string;
  figure_title: string;
  figure_subtitle: string;

  // Behavior
  auto_open: boolean;
  auto_open_delay: number;
  remember_progress: boolean;
  language: WidgetLanguage;
  monthly_tryon_limit: number;
}

// Default widget configuration values stored in the database per project.
// Stage titles/descriptions are in English as initial content that users
// can customize in the admin panel. Widget-side i18n handles runtime translation.
export const DEFAULT_CONFIG: WidgetConfig = {
  button_position: 'bottom-right',
  button_offset_x: 20,
  button_offset_y: 20,
  button_type: 'circle',
  button_size: 56,
  button_bg_color: '#000000',
  button_icon_color: '#FFFFFF',
  button_tooltip: 'Try on',
  button_shadow: true,
  button_animation: 'pulse',
  button_delay: 0,

  color_mode: 'light',
  accent_color: '#000000',
  accent_text_color: '#FFFFFF',
  bg_color: '#FFFFFF',
  text_color: '#1A1A1A',
  secondary_text_color: '#898989',
  font_family: 'Inter',
  border_radius: 12,
  show_powered_by: true,

  stages_enabled: {
    intro: true,
    gender: true,
    height_weight: true,
    measurements: true,
    size: true,
    belly: true,
    figure: true,
  },
  elements_enabled: {
    favorites: true,
    cart: true,
    history: true,
    settings: true,
  },
  cloth_types_enabled: {
    outerwear: true,
    tops: true,
    bottoms: true,
    shoes: false,
  },

  intro_title: 'Precise and comfortable fitting method',
  intro_description:
    'Upload your photo, enter your body measurements and get accurate sizing recommendations. Try on items or entire looks with a single tap in the virtual fitting room.',
  intro_image: '/widget-preview/intro-bg.png',
  params_title: 'Basic parameters',
  params_subtitle: 'Specify the main parameters',
  measurements_title: 'Your parameters',
  measurements_subtitle:
    'Please provide your parameters so we can find the right size of things for you.',
  belly_title: 'Your belly shape',
  belly_subtitle:
    'Choose the image that most resembles the shape of your belly',
  figure_title: 'Your figure type',
  figure_subtitle: 'Choose the image that best reflects your current figure',

  avatars_enabled: true,
  photo_mode_default: 'both',

  auto_open: false,
  auto_open_delay: 5,
  remember_progress: true,
  language: 'auto',
  monthly_tryon_limit: 10,
};

export interface PresetConfig {
  id: string;
  name: string;
  description: string;
  preview_colors: { accent: string; bg: string; text: string };
  config: Partial<WidgetConfig>;
}

export const PRESETS: PresetConfig[] = [
  {
    id: 'minimalist',
    name: 'Minimalist',
    description: 'Clean black & white, rounded elements, Inter font',
    preview_colors: { accent: '#000000', bg: '#FFFFFF', text: '#1A1A1A' },
    config: {
      color_mode: 'light',
      accent_color: '#000000',
      accent_text_color: '#FFFFFF',
      bg_color: '#FFFFFF',
      text_color: '#1A1A1A',
      secondary_text_color: '#898989',
      font_family: 'Inter',
      border_radius: 12,
      button_bg_color: '#000000',
      button_icon_color: '#FFFFFF',
      button_type: 'circle',
      button_shadow: true,
      button_animation: 'pulse',
    },
  },
  {
    id: 'fashion',
    name: 'Fashion',
    description: 'Bold colors, high contrast, modern look',
    preview_colors: { accent: '#E91E63', bg: '#FAFAFA', text: '#212121' },
    config: {
      color_mode: 'custom',
      accent_color: '#E91E63',
      accent_text_color: '#FFFFFF',
      bg_color: '#FAFAFA',
      text_color: '#212121',
      secondary_text_color: '#757575',
      font_family: 'Montserrat',
      border_radius: 8,
      button_bg_color: '#E91E63',
      button_icon_color: '#FFFFFF',
      button_type: 'pill',
      button_shadow: true,
      button_animation: 'glow',
    },
  },
  {
    id: 'elegant',
    name: 'Elegant',
    description: 'Grey & gold palette, serif font, soft shadows',
    preview_colors: { accent: '#B8860B', bg: '#F5F5F0', text: '#2C2C2C' },
    config: {
      color_mode: 'custom',
      accent_color: '#B8860B',
      accent_text_color: '#FFFFFF',
      bg_color: '#F5F5F0',
      text_color: '#2C2C2C',
      secondary_text_color: '#8C8C8C',
      font_family: 'Playfair Display',
      border_radius: 16,
      button_bg_color: '#B8860B',
      button_icon_color: '#FFFFFF',
      button_type: 'circle',
      button_shadow: true,
      button_animation: 'glow',
    },
  },
  {
    id: 'sporty',
    name: 'Sporty',
    description: 'Bright colors, bold elements, energetic feel',
    preview_colors: { accent: '#FF5722', bg: '#FFFFFF', text: '#1A1A1A' },
    config: {
      color_mode: 'custom',
      accent_color: '#FF5722',
      accent_text_color: '#FFFFFF',
      bg_color: '#FFFFFF',
      text_color: '#1A1A1A',
      secondary_text_color: '#666666',
      font_family: 'Roboto',
      border_radius: 4,
      button_bg_color: '#FF5722',
      button_icon_color: '#FFFFFF',
      button_type: 'rectangle',
      button_shadow: true,
      button_animation: 'wobble',
    },
  },
];
