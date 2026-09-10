export interface WidgetConfig {
  projectId: string;
  apiBaseUrl: string;
  /** База ассетов виджета. Отдельно от apiBaseUrl: файлы вправе переехать на
   *  CDN, не утаскивая за собой адрес API. */
  assetsBaseUrl?: string;

  // Button
  buttonPosition:
    | 'bottom-right'
    | 'bottom-left'
    | 'center-right'
    | 'center-left';
  buttonOffsetX: number;
  buttonOffsetY: number;
  buttonType: string;
  buttonSize: number;
  buttonColor: string;
  buttonTextColor: string;
  buttonText: string;
  buttonShadow: boolean;
  buttonAnimation: 'pulse' | 'bounce' | 'none';

  // Modal
  modalWidth: number;
  modalHeight: number;

  // Colors
  primaryColor: string;
  secondaryColor: string;
  backgroundColor: string;
  textColor: string;
  accentColor: string;
  fontFamily: string;
  borderRadius: number;

  // Stages toggles
  stages: StagesConfig;

  // Products
  products: WidgetProduct[];

  // Avatars
  avatarsEnabled: boolean;
  avatarsMode: 'upload' | 'collection' | 'both';

  // Branding
  logoUrl: string | null;
  poweredByEnabled: boolean;

  // Behavior
  rememberProgress: boolean;
  autoOpen: boolean;
  autoOpenDelay: number;

  // i18n
  language: string;

  // Limits
  monthlyTryOnLimit: number;

  // Elements & cloth types (admin toggles)
  elementsEnabled: ElementsConfig;
  clothTypesEnabled: ClothTypesConfig;

  // Stage content (custom text from admin)
  introTitle: string;
  introDescription: string;
  introImage: string;
  paramsTitle: string;
  paramsSubtitle: string;
  measurementsTitle: string;
  measurementsSubtitle: string;
  bellyTitle: string;
  bellySubtitle: string;
  figureTitle: string;
  figureSubtitle: string;
}

export interface ElementsConfig {
  favorites: boolean;
  cart: boolean;
  history: boolean;
  settings: boolean;
}

export interface ClothTypesConfig {
  outerwear: boolean;
  tops: boolean;
  bottoms: boolean;
  shoes: boolean;
}

export interface StagesConfig {
  intro: boolean;
  gender: boolean;
  parameters: boolean;
  measurements: boolean;
  bellyShape: boolean;
  figureType: boolean;
  privacyPolicy: boolean;
  photoUpload: boolean;
}

export interface WidgetProduct {
  id: string;
  publicId: string;
  name: string;
  photoUrl: string;
  thumbnailUrl: string;
  category: string;
  subcategory: string;
  // Marketing tag (Новинки, Sale, Скидки …) when the product belongs to a
  // merchandising category. Empty string when the product has no
  // marketing membership. Widget surfaces these as priority chips at the
  // top of each layer.
  marketingTag: string;
  sku: string;
  color: string | null;
  price: number | null;
  currency: string | null;
  productUrl: string | null;
  externalId: string | null;
  // Gender tag from the shop feed (female / male / unisex / kids). Used in
  // ShowroomStage to hide opposite-gender items based on the user's
  // onboarding choice. Missing / unrecognised values are treated as neutral
  // and remain visible to everyone.
  gender: string | null;
  sizeVariants: Record<string, string> | null; // normalizedSize → CS-Cart child product_id
}

export type Platform = 'tilda' | 'cscart' | null;

export type Gender = 'male' | 'female';

export interface BodyParameters {
  gender: Gender | null;
  height: number;
  weight: number;
  chest: number;
  waist: number;
  hip: number;
  euSize: string | null;
  bellyShape: string | null;
  figureType: string | null;
}

export type StageName =
  | 'intro'
  | 'gender'
  | 'parameters'
  | 'measurements'
  | 'bellyShape'
  | 'figureType'
  | 'privacyPolicy'
  | 'photoUpload'
  | 'photoChoice'
  | 'avatarCollection'
  | 'showroom'
  | 'tryonResult'
  | 'settings'
  | 'favorites'
  | 'cart'
  | 'account'
  | 'accountEmail'
  | 'history'
  | 'myPurchases'
  | 'deleteAccount'
  | 'photoRecommendations'
  | 'auth';

// Raw API response from GET /api/widget/v1/config/:projectId (snake_case from Go backend)
export interface ApiWidgetConfigResponse {
  button_position: WidgetConfig['buttonPosition'];
  button_offset_x: number;
  button_offset_y: number;
  button_type: string;
  button_size: number;
  button_color: string;
  button_text_color: string;
  button_text: string;
  button_shadow: boolean;
  button_animation: WidgetConfig['buttonAnimation'];
  modal_width: number;
  modal_height: number;
  primary_color: string;
  secondary_color: string;
  background_color: string;
  text_color: string;
  accent_color: string;
  font_family: string;
  border_radius?: number;
  stages: {
    intro: boolean;
    gender: boolean;
    parameters: boolean;
    measurements: boolean;
    belly_shape: boolean;
    figure_type: boolean;
    privacy_policy: boolean;
    photo_upload: boolean;
  };
  products: Array<{
    id: string;
    public_id: string;
    name: string;
    photo_url: string;
    thumbnail_url: string;
    category: string;
    subcategory: string;
    marketing_tag?: string;
    sku: string;
    color: string | null;
    price: number | null;
    currency: string | null;
    product_url: string | null;
    external_id: string | null;
    size_variants: Record<string, string> | null;
  }>;
  avatars_enabled: boolean;
  avatars_mode: WidgetConfig['avatarsMode'];
  logo_url: string | null;
  powered_by_enabled: boolean;
  remember_progress: boolean;
  auto_open?: boolean;
  auto_open_delay?: number;
  language: string;
  monthly_tryon_limit?: number;
  elements_enabled?: {
    favorites: boolean;
    cart: boolean;
    history: boolean;
    settings: boolean;
  };
  cloth_types_enabled?: {
    outerwear: boolean;
    tops: boolean;
    bottoms: boolean;
    shoes: boolean;
  };
  intro_title?: string;
  intro_description?: string;
  intro_image?: string;
  params_title?: string;
  params_subtitle?: string;
  measurements_title?: string;
  measurements_subtitle?: string;
  belly_title?: string;
  belly_subtitle?: string;
  figure_title?: string;
  figure_subtitle?: string;
  // Added by loader before passing to initWidget
  projectId: string;
  apiBaseUrl: string;
  assetsBaseUrl?: string;
}

// --- API response types ---

export interface SessionResponse {
  session_token: string;
  gender?: string;
  height?: number;
  weight?: number;
  chest?: number;
  waist?: number;
  hip?: number;
  size?: string;
  belly_shape?: string;
  figure_type?: string;
  email?: string;
  phone?: string;
  model_photo_id?: string;
  model_photo_url?: string;
  last_try_on?: TryOnStatusResponse;
  is_authenticated?: boolean;
}

// Returned by POST /sessions and GET /sessions/{token} — session + config in one request.
export interface SessionWithConfigResponse extends SessionResponse {
  config: ApiWidgetConfigResponse;
}

export interface UploadPhotoResponse {
  id: string;
  public_id: string;
  url: string;
}

export interface TryOnAcceptedResponse {
  public_id: string;
  status: 'processing' | 'done' | 'error';
}

export interface TryOnStatusResponse {
  public_id: string;
  status: 'processing' | 'done' | 'error';
  result_url?: string;
  result_key?: string;
  products?: TryOnProductInfo[];
}

export interface TryOnResponse {
  id: string;
  public_id: string;
  result_url: string;
  products: TryOnProductInfo[];
}

export interface TryOnProductInfo {
  id: string;
  name: string;
  category: string;
}

export interface TryOnHistoryItem {
  id: string;
  public_id: string;
  result_url: string;
  products: TryOnProductInfo[];
  created_at: string;
}

export interface AvatarItem {
  id: string;
  public_id: string;
  gender: string;
  figure_type: string;
  height_min?: number;
  height_max?: number;
  weight_min?: number;
  weight_max?: number;
  size_eu?: string;
  photo_url: string;
  thumbnail_url: string;
}

export interface FavoriteItem {
  id: string;
  public_id: string;
  try_on_id?: string;
  image_url: string;
  created_at: string;
}

export interface CartItemResponse {
  id: string;
  public_id: string;
  product: WidgetProduct;
  try_on_id?: string;
  created_at: string;
}
