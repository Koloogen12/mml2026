import { create } from 'zustand';
import type {
  BodyParameters,
  StageName,
  WidgetConfig,
  WidgetProduct,
  Gender,
  SessionWithConfigResponse,
} from '@/types';
import { createSession, updateSession } from '@/api';
import { trackEvent } from '@/lib/events';
import { generateSessionToken } from '@/lib/utils';

// Linear stage order for the onboarding flow.
// Stages after photoUpload (showroom, etc.) are navigated explicitly, not linearly.
const LINEAR_STAGES: StageName[] = [
  'intro',
  'parameters',
  'measurements',
  'bellyShape',
  'figureType',
  'privacyPolicy',
  'photoUpload',
];

// Stage names that are toggleable via StagesConfig
type ToggleableStageName = keyof import('@/types').StagesConfig;

function isStageEnabled(
  stage: StageName,
  config: WidgetConfig | null,
): boolean {
  if (!config) return true;
  if (stage in config.stages) {
    return config.stages[stage as ToggleableStageName];
  }
  return true;
}

function getFirstEnabledStage(config: WidgetConfig | null): StageName {
  for (const stage of LINEAR_STAGES) {
    if (isStageEnabled(stage, config)) return stage;
  }
  return 'intro';
}

function getNextEnabledStage(
  current: StageName,
  config: WidgetConfig | null,
): StageName | null {
  const idx = LINEAR_STAGES.indexOf(current);
  if (idx === -1) return null;
  for (let i = idx + 1; i < LINEAR_STAGES.length; i++) {
    if (isStageEnabled(LINEAR_STAGES[i], config)) {
      return LINEAR_STAGES[i];
    }
  }
  return 'photoChoice';
}

function getPrevEnabledStage(
  current: StageName,
  config: WidgetConfig | null,
): StageName | null {
  const idx = LINEAR_STAGES.indexOf(current);
  if (idx === -1) return null;
  for (let i = idx - 1; i >= 0; i--) {
    if (isStageEnabled(LINEAR_STAGES[i], config)) {
      return LINEAR_STAGES[i];
    }
  }
  return null;
}

interface TryOnHistoryEntry {
  timestamp: number;
  url: string;
}

interface CartItem {
  garmentUrl: string;
  tryOnUrl: string;
}

interface WidgetState {
  // Core
  config: WidgetConfig | null;
  isOpen: boolean;
  isLoading: boolean;
  currentStage: StageName;
  stageHistory: StageName[];
  sessionToken: string | null;
  backTo: StageName | null;

  // Body parameters
  bodyParams: BodyParameters;

  // Selected products for try-on
  selectedProducts: WidgetProduct[];

  // Model photo
  modelPhotoId: string | null;
  modelPhotoUrl: string | null;

  // ShowRoom state
  clothType: string | null;
  selectedOuterwear: string | null;
  selectedTops: string | null;
  selectedBottoms: string | null;
  tryOnUrl: string | null;
  tryOnKey: string | null;
  pendingTryOnId: string | null;
  pendingProductExternalId: string | null;

  // User data
  favorites: string[];
  cart: CartItem[];
  tryOnHistory: TryOnHistoryEntry[];
  email: string | null;
  phone: string | null;

  // Auth
  tryOnCount: number;
  isAuthenticated: boolean;

  // Actions
  setConfig: (config: WidgetConfig) => void;
  open: () => void;
  close: () => void;
  setLoading: (loading: boolean) => void;
  goToStage: (stage: StageName, backTo?: StageName | null) => void;
  goBack: () => void;
  setSessionToken: (token: string) => void;
  updateBodyParams: (params: Partial<BodyParameters>) => void;
  selectProduct: (product: WidgetProduct) => void;
  deselectProduct: (productId: string) => void;
  clearTryOn: () => void;
  setModelPhoto: (id: string, url: string) => void;
  setClothType: (type: string | null) => void;
  setSelectedGarment: (type: string, url: string | null) => void;
  setTryOnUrl: (url: string | null) => void;
  setTryOnKey: (key: string | null) => void;
  clearPendingTryOn: () => void;
  setPendingProductExternalId: (id: string | null) => void;
  toggleFavorite: (url: string) => void;
  addToCart: (garmentUrl: string, tryOnUrl: string) => void;
  removeFromCart: (garmentUrl: string) => void;
  addTryOnHistory: (url: string) => void;
  setEmail: (email: string) => void;
  setPhone: (phone: string) => void;
  incrementTryOnCount: () => void;
  setAuthenticated: (value: boolean) => void;
  goNext: () => void;
  goBackLinear: () => void;
  applySession: (data: SessionWithConfigResponse) => void;
  reset: () => void;
}

const initialBodyParams: BodyParameters = {
  gender: 'female' as Gender,
  height: 165,
  weight: 58,
  chest: 88,
  waist: 68,
  hip: 96,
  euSize: 'M',
  bellyShape: 'flat',
  figureType: 'hourglass',
};

// Only the session token is persisted locally. All session data lives on the backend.
const STORAGE_SESSION_KEY = 'mml_session_token';

export const useWidgetStore = create<WidgetState>((set) => ({
  config: null,
  isOpen: false,
  isLoading: false,
  currentStage: 'intro',
  stageHistory: [],
  sessionToken: null,
  backTo: null,
  bodyParams: { ...initialBodyParams },
  selectedProducts: [],
  modelPhotoId: null,
  modelPhotoUrl: null,
  tryOnCount: 0,
  isAuthenticated: false,
  clothType: null,
  selectedOuterwear: null,
  selectedTops: null,
  selectedBottoms: null,
  tryOnUrl: null,
  tryOnKey: null,
  pendingTryOnId: null,
  pendingProductExternalId: null,
  favorites: [],
  cart: [],
  tryOnHistory: [],
  email: null,
  phone: null,

  setConfig: (config) => set({ config }),
  open: () => set({ isOpen: true }),
  close: () => set({ isOpen: false }),
  setLoading: (isLoading) => set({ isLoading }),

  goToStage: (stage, backTo) =>
    set((state) => ({
      currentStage: stage,
      stageHistory: [...state.stageHistory, state.currentStage],
      backTo: backTo !== undefined ? backTo : state.backTo,
    })),

  goBack: () =>
    set((state) => {
      const history = [...state.stageHistory];
      const prev = history.pop();
      return prev
        ? { currentStage: prev, stageHistory: history, backTo: null }
        : state;
    }),

  goNext: () =>
    set((state) => {
      const next = getNextEnabledStage(state.currentStage, state.config);
      if (!next) return state;
      return {
        currentStage: next,
        stageHistory: [...state.stageHistory, state.currentStage],
      };
    }),

  goBackLinear: () =>
    set((state) => {
      const prev = getPrevEnabledStage(state.currentStage, state.config);
      if (!prev) return state;
      return {
        currentStage: prev,
        stageHistory: [...state.stageHistory, state.currentStage],
      };
    }),

  setSessionToken: (sessionToken) => set({ sessionToken }),

  updateBodyParams: (params) =>
    set((state) => {
      const next = { ...state.bodyParams, ...params };
      // Soft validation: warn if BMI is extreme
      if (params.height || params.weight) {
        const h = next.height / 100;
        const bmi = next.weight / (h * h);
        if ((bmi < 12 || bmi > 55) && typeof window !== 'undefined') {
          import('@/i18n').then(({ t }) => {
            import('react-hot-toast').then(({ default: toast }) => {
              toast(t('common.unrealisticParams'), { icon: '⚠️', duration: 3000 });
            });
          });
        }
      }
      return { bodyParams: next };
    }),

  selectProduct: (product) =>
    set((state) => {
      if (state.selectedProducts.some((p) => p.id === product.id)) return state;
      // Replace existing product of the same category, or append if new category
      const filtered = state.selectedProducts.filter(
        (p) => p.category !== product.category,
      );
      if (filtered.length >= 3) return state;
      return { selectedProducts: [...filtered, product] };
    }),

  deselectProduct: (productId) =>
    set((state) => ({
      selectedProducts: state.selectedProducts.filter(
        (p) => p.id !== productId,
      ),
    })),

  setModelPhoto: (id, url) => set({ modelPhotoId: id, modelPhotoUrl: url }),
  setClothType: (clothType) => set({ clothType }),

  setSelectedGarment: (type, url) => {
    if (type === 'outerwear') set({ selectedOuterwear: url });
    else if (type === 'tops') set({ selectedTops: url });
    else if (type === 'bottoms') set({ selectedBottoms: url });
  },

  setTryOnUrl: (tryOnUrl) => set({ tryOnUrl }),

  setTryOnKey: (tryOnKey) => set({ tryOnKey }),

  clearPendingTryOn: () => set({ pendingTryOnId: null }),
  setPendingProductExternalId: (pendingProductExternalId) => set({ pendingProductExternalId }),

  clearTryOn: () =>
    set({
      selectedProducts: [],
      tryOnUrl: null,
      tryOnKey: null,
      selectedOuterwear: null,
      selectedTops: null,
      selectedBottoms: null,
    }),

  toggleFavorite: (url) =>
    set((state) => ({
      favorites: state.favorites.includes(url)
        ? state.favorites.filter((f) => f !== url)
        : [...state.favorites, url],
    })),

  addToCart: (garmentUrl, tryOnUrl) =>
    set((state) => ({
      cart: [...state.cart, { garmentUrl, tryOnUrl }],
    })),

  removeFromCart: (garmentUrl) =>
    set((state) => ({
      cart: state.cart.filter((c) => c.garmentUrl !== garmentUrl),
    })),

  addTryOnHistory: (url) =>
    set((state) => ({
      tryOnHistory: [...state.tryOnHistory, { timestamp: Date.now(), url }],
    })),

  setEmail: (email) => set({ email }),
  setPhone: (phone) => set({ phone }),
  incrementTryOnCount: () => set((s) => ({ tryOnCount: s.tryOnCount + 1 })),
  setAuthenticated: (value) => set({ isAuthenticated: value }),

  // Restore full session state from the combined response returned by the loader.
  // If the session has a model photo, skip onboarding and go straight to showroom.
  applySession: (data) => {
    const lastTryOn = data.last_try_on;
    const { config } = useWidgetStore.getState();

    // If certain onboarding stages are disabled in admin config, discard any
    // stale values the backend may have persisted from an older session where
    // those stages WERE enabled. Otherwise the size-recommendation algorithm
    // uses phantom measurements the user never entered.
    const measurementsEnabled = config?.stages?.measurements ?? false;
    const sizeEnabled = config?.stages?.size ?? false;

    set({
      sessionToken: data.session_token,
      bodyParams: {
        gender: (data.gender as Gender) || initialBodyParams.gender,
        height: data.height || initialBodyParams.height,
        weight: data.weight || initialBodyParams.weight,
        chest: measurementsEnabled ? (data.chest || initialBodyParams.chest) : 0,
        waist: measurementsEnabled ? (data.waist || initialBodyParams.waist) : 0,
        hip: measurementsEnabled ? (data.hip || initialBodyParams.hip) : 0,
        euSize: sizeEnabled ? (data.size || initialBodyParams.euSize) : '',
        bellyShape: data.belly_shape || initialBodyParams.bellyShape,
        figureType: data.figure_type || initialBodyParams.figureType,
      },
      modelPhotoId: data.model_photo_id ?? null,
      modelPhotoUrl: data.model_photo_url ?? null,
      email: data.email || null,
      phone: data.phone || null,
      isAuthenticated: data.is_authenticated ?? false,
      currentStage: data.model_photo_id ? 'showroom' : getFirstEnabledStage(config),
      tryOnUrl: lastTryOn?.status === 'done' ? (lastTryOn.result_url ?? null) : null,
      tryOnKey: lastTryOn?.status === 'done' ? (lastTryOn.result_key ?? null) : null,
      pendingTryOnId: lastTryOn?.status === 'processing' ? (lastTryOn.public_id ?? null) : null,
    });
  },

  reset: () =>
    set({
      isOpen: false,
      isLoading: false,
      currentStage: 'intro',
      stageHistory: [],
      backTo: null,
      bodyParams: { ...initialBodyParams },
      selectedProducts: [],
      modelPhotoId: null,
      modelPhotoUrl: null,
      clothType: null,
      selectedOuterwear: null,
      selectedTops: null,
      selectedBottoms: null,
      tryOnUrl: null,
      tryOnKey: null,
      favorites: [],
      cart: [],
      tryOnHistory: [],
      email: null,
      phone: null,
    }),
}));

// Dev debug helper
if (import.meta.env.DEV) {
  (window as any).__MML_STORE__ = useWidgetStore;
}

// Sync body params to backend when they change (debounced)
let syncTimer: ReturnType<typeof setTimeout> | null = null;
useWidgetStore.subscribe((state, prevState) => {
  if (state.bodyParams === prevState.bodyParams) return;
  if (!state.sessionToken) return;

  if (syncTimer) clearTimeout(syncTimer);
  syncTimer = setTimeout(() => {
    const { sessionToken, bodyParams, config } = useWidgetStore.getState();
    if (!sessionToken) return;

    // Only sync fields whose onboarding stage is enabled; otherwise we'd
    // persist stale/default values that confuse the size-rec algorithm.
    const measurementsOn = config?.stages?.measurements ?? false;
    const sizeOn = config?.stages?.size ?? false;

    updateSession(sessionToken, {
      gender: bodyParams.gender,
      height: bodyParams.height,
      weight: bodyParams.weight,
      chest: measurementsOn ? bodyParams.chest : 0,
      waist: measurementsOn ? bodyParams.waist : 0,
      hip: measurementsOn ? bodyParams.hip : 0,
      size: sizeOn ? bodyParams.euSize : '',
      belly_shape: bodyParams.bellyShape,
      figure_type: bodyParams.figureType,
    }).catch((err) => {
      // Session not found — create a new one and update the token
      if (err?.response?.status === 404 && config?.projectId) {
        localStorage.removeItem(STORAGE_SESSION_KEY);
        Promise.all([import('react-hot-toast'), import('@/i18n')]).then(([{ default: toast }, { t }]) => {
          toast(t('common.sessionRefreshed'), { icon: 'ℹ️', duration: 2000 });
        });
        createSession(config.projectId)
          .then((resp) => {
            localStorage.setItem(STORAGE_SESSION_KEY, resp.session_token);
            useWidgetStore.setState({ sessionToken: resp.session_token });
          })
          .catch(() => {
            const token = generateSessionToken();
            localStorage.setItem(STORAGE_SESSION_KEY, token);
            useWidgetStore.setState({ sessionToken: token });
          });
      }
    });
  }, 1000);
});

// Track stage navigation events
useWidgetStore.subscribe((state, prevState) => {
  if (state.currentStage !== prevState.currentStage) {
    trackEvent('stage_view', { stage: state.currentStage });
  }
  if (state.isOpen !== prevState.isOpen) {
    trackEvent(state.isOpen ? 'widget_open' : 'widget_close');
  }
});
