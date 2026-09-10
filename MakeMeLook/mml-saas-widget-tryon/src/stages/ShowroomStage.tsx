import { type FC, useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { useWidgetStore } from '@/store';
import type { WidgetProduct } from '@/types';
import { t } from '@/i18n';
import type { TranslationKey } from '@/i18n';
import { requestTryOn, pollTryOnResult, addFavorite, deleteFavorite, addCartItem, recommendSize, getShareUrl, getTryOnHistory } from '@/api';
import type { SizeRecommendationResponse } from '@/api';
import toast from 'react-hot-toast';
import { TryOnLoader } from '@/components/TryOnLoader';
import type { AxiosError } from 'axios';

interface ProductGroup {
  baseSku: string;
  variants: WidgetProduct[];
}

function getBaseSku(sku: string): string {
  const slashIdx = sku.lastIndexOf('/');
  if (slashIdx > 0) return sku.substring(0, slashIdx);
  const dashIdx = sku.lastIndexOf('-');
  if (dashIdx > 0) return sku.substring(0, dashIdx);
  return sku;
}

const CLOTH_TYPE_KEYS = ['outerwear', 'tops', 'bottoms', 'shoes', 'accessories'] as const;

const CLOTH_TYPE_LABELS: Record<string, TranslationKey> = {
  outerwear: 'showroom.outerwear',
  tops: 'showroom.tops',
  bottoms: 'showroom.bottoms',
  shoes: 'showroom.shoes',
  accessories: 'showroom.accessories',
};


function isCSCartSite(): boolean {
  return !!(window as unknown as Record<string, unknown>).Tygh ||
    !!document.querySelector('script[src*="cs-cart"], script[src*="cscart"]');
}

function addToCSCart(productId: string): Promise<void> {
  return new Promise((resolve) => {
    const tygh = (window as unknown as Record<string, unknown>).Tygh as
      | { $?: { request?: (dispatch: string, data: Record<string, string>, cb: () => void) => void } }
      | undefined;

    if (tygh?.['$']?.request) {
      tygh['$'].request(
        'checkout.add',
        { [`product_data[${productId}][amount]`]: '1' },
        () => resolve(),
      );
    } else {
      const form = new FormData();
      form.append(`product_data[${productId}][amount]`, '1');
      fetch('/index.php?dispatch=checkout.add&is_ajax=1', {
        method: 'POST',
        body: form,
        credentials: 'include',
      }).finally(() => resolve());
    }
  });
}

export const ShowroomStage: FC = () => {
  const goToStage = useWidgetStore((s) => s.goToStage);
  const config = useWidgetStore((s) => s.config);
  const bodyParams = useWidgetStore((s) => s.bodyParams);
  const sessionToken = useWidgetStore((s) => s.sessionToken);
  const modelPhotoId = useWidgetStore((s) => s.modelPhotoId);
  const modelPhotoUrl = useWidgetStore((s) => s.modelPhotoUrl);
  const tryOnUrl = useWidgetStore((s) => s.tryOnUrl);
  const tryOnKey = useWidgetStore((s) => s.tryOnKey);
  const setTryOnUrl = useWidgetStore((s) => s.setTryOnUrl);
  const setTryOnKey = useWidgetStore((s) => s.setTryOnKey);
  const setLoading = useWidgetStore((s) => s.setLoading);
  const isLoading = useWidgetStore((s) => s.isLoading);
  const favorites = useWidgetStore((s) => s.favorites);
  const toggleFavorite = useWidgetStore((s) => s.toggleFavorite);
  const addTryOnHistory = useWidgetStore((s) => s.addTryOnHistory);
  const selectedProducts = useWidgetStore((s) => s.selectedProducts);
  const selectProduct = useWidgetStore((s) => s.selectProduct);
  const deselectProduct = useWidgetStore((s) => s.deselectProduct);
  const clearTryOn = useWidgetStore((s) => s.clearTryOn);
  const pendingTryOnId = useWidgetStore((s) => s.pendingTryOnId);
  const clearPendingTryOn = useWidgetStore((s) => s.clearPendingTryOn);
  const pendingProductExternalId = useWidgetStore((s) => s.pendingProductExternalId);
  const setPendingProductExternalId = useWidgetStore((s) => s.setPendingProductExternalId);

  const [activeClothType, setActiveClothType] = useState<string | null>(null);
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [showSubcategories, setShowSubcategories] = useState(false);
  const [showColors, setShowColors] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [isFullview, setIsFullview] = useState(false);
  const [favSnackbar, setFavSnackbar] = useState(false);
  const [activeGroup, setActiveGroup] = useState<ProductGroup | null>(null);
  const [showSizes, setShowSizes] = useState(false);
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [sizingProduct, setSizingProduct] = useState<WidgetProduct | null>(null);
  const [lastTryOnId, setLastTryOnId] = useState<string | null>(null);
  const tryOnEpoch = useRef(0);
  const pollAbortRef = useRef<AbortController | null>(null);
  const [addedToCart, setAddedToCart] = useState(false);
  // Map of image_url -> favorite server ID for deletion
  const [favoriteIds, setFavoriteIds] = useState<Record<string, string>>({});

  // Initialize try-on count from history (for auth gate after 3 try-ons)
  useEffect(() => {
    if (!sessionToken || tryOnCount > 0) return;
    getTryOnHistory(sessionToken)
      .then((history) => {
        if (history.length > 0) {
          for (let i = 0; i < history.length; i++) incrementTryOnCount();
        }
      })
      .catch(() => { /* ignore */ });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionToken]);

  // Size recommendation
  const [sizeRec, setSizeRec] = useState<SizeRecommendationResponse | null>(null);
  const [sizeRecLoading, setSizeRecLoading] = useState(false);
  const sizeRecCache = useRef<Map<string, SizeRecommendationResponse>>(new Map());

  // Resume polling for a try-on that was still processing when the page was refreshed
  useEffect(() => {
    if (!pendingTryOnId || !sessionToken) return;

    const abortCtrl = new AbortController();
    pollAbortRef.current = abortCtrl;
    setLoading(true);

    if (import.meta.env.DEV) console.log('[MML] resuming poll for pending try-on', pendingTryOnId);
    pollTryOnResult(sessionToken, pendingTryOnId, abortCtrl.signal)
      .then((result) => {
        if (result.result_url) {
          setTryOnUrl(result.result_url);
          setTryOnKey(result.result_key ?? null);
          setLastTryOnId(result.public_id);
          addTryOnHistory(result.result_url);
        }
      })
      .catch((err) => {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        if (import.meta.env.DEV) console.error('[MML] resumed try-on failed', err);
        toast.error(t('showroom.tryOnFailed'));
      })
      .finally(() => {
        setLoading(false);
        clearPendingTryOn();
      });

    return () => {
      abortCtrl.abort();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingTryOnId]);

  useEffect(() => {
    if (!pendingProductExternalId || !config) return;

    const product = config.products.find(
      (p) => p.externalId === pendingProductExternalId,
    );
    setPendingProductExternalId(null);
    if (!product) return;

    const baseSku = product.sku ? getBaseSku(product.sku) : product.id;
    const variants = config.products.filter((p) => {
      const pBase = p.sku ? getBaseSku(p.sku) : p.id;
      return pBase === baseSku && p.category === product.category;
    });
    const group: ProductGroup = { baseSku, variants };

    setActiveClothType(product.category);
    setActiveTag(product.subcategory);
    setAddedToCart(false);

    if (variants.length > 1 && variants.some((v) => v.color)) {
      setActiveGroup(group);
      setShowColors(true);
      setShowSizes(false);
    } else {
      selectProduct(product);
      setSizingProduct(product);
      setShowColors(false);
      setShowSizes(true);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingProductExternalId]);

  // Fetch size recommendation when sizing product changes
  useEffect(() => {
    if (!sizingProduct || !sessionToken) {
      setSizeRec(null);
      return;
    }

    const cached = sizeRecCache.current.get(sizingProduct.publicId);
    if (cached) {
      setSizeRec(cached);
      if (!selectedSize) setSelectedSize(cached.recommended_size);
      return;
    }

    const controller = new AbortController();
    setSizeRecLoading(true);
    setSizeRec(null);

    recommendSize(sessionToken, sizingProduct.publicId)
      .then((rec) => {
        if (!controller.signal.aborted) {
          sizeRecCache.current.set(sizingProduct.publicId, rec);
          setSizeRec(rec);
          if (!selectedSize) setSelectedSize(rec.recommended_size);
        }
      })
      .catch((err) => {
        if (!controller.signal.aborted && import.meta.env.DEV) console.warn('[MML] size rec failed', err);
      })
      .finally(() => {
        if (!controller.signal.aborted) setSizeRecLoading(false);
      });

    return () => controller.abort();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sizingProduct?.publicId, sessionToken]);

  const displayUrl = tryOnUrl || modelPhotoUrl;
  const isFavorite = displayUrl ? favorites.includes(displayUrl) : false;

  const products = config?.products ?? [];

  const tagsByCategory = useMemo(() =>
    products.reduce<Record<string, string[]>>((acc, p) => {
      if (p.category && p.subcategory) {
        if (!acc[p.category]) acc[p.category] = [];
        if (!acc[p.category].includes(p.subcategory)) acc[p.category].push(p.subcategory);
      }
      return acc;
    }, {}),
  [products]);

  const handleClothTypeClick = useCallback((key: string) => {
    setActiveClothType((prev) => {
      if (prev === key) {
        setActiveTag(null);
        return null;
      }
      const tags = tagsByCategory[key];
      setActiveTag(tags?.length ? tags[0] : null);
      return key;
    });
    setShowSizes(false);
    setShowColors(false);
    setActiveGroup(null);
  }, [tagsByCategory]);

  const filteredProducts = products.filter((p) => {
    if (!activeClothType) return false;
    if (p.category !== activeClothType) return false;
    if (activeTag && p.subcategory !== activeTag) return false;
    return true;
  });

  const productGroups = useMemo(() => {
    const map = new Map<string, WidgetProduct[]>();
    for (const p of filteredProducts) {
      const key = p.sku ? getBaseSku(p.sku) : p.id;
      const arr = map.get(key) ?? [];
      arr.push(p);
      map.set(key, arr);
    }
    const groups = Array.from(map.entries()).map(([baseSku, variants]) => ({
      baseSku,
      variants,
    }));
    // Smart sort: products with user's size available come first
    const userSize = bodyParams.euSize;
    if (userSize) {
      groups.sort((a, b) => {
        const aHas = a.variants.some(v => v.sizeVariants && userSize in v.sizeVariants) ? 0 : 1;
        const bHas = b.variants.some(v => v.sizeVariants && userSize in v.sizeVariants) ? 0 : 1;
        return aHas - bHas;
      });
    }
    return groups;
  }, [filteredProducts, bodyParams.euSize]);

  const handleGroupClick = (group: ProductGroup) => {
    setAddedToCart(false);
    if (group.variants.length > 1 && group.variants.some((v) => v.color)) {
      setActiveGroup(group);
      setShowColors(true);
      setShowSizes(false);
    } else {
      const product = group.variants[0];
      selectProduct(product);
      setSizingProduct(product);
      setShowColors(false);
      setShowSizes(true);
    }
  };

  const handleColorSelect = (product: WidgetProduct) => {
    setAddedToCart(false);
    selectProduct(product);
    setSizingProduct(product);
    setShowColors(false);
    setShowSizes(true);
  };

  const tryOnCount = useWidgetStore((s) => s.tryOnCount);
  const isAuthenticated = useWidgetStore((s) => s.isAuthenticated);
  const incrementTryOnCount = useWidgetStore((s) => s.incrementTryOnCount);

  const [tryOnDisabled, setTryOnDisabled] = useState(false);

  const handleTryOn = async () => {
    if (!sessionToken || !modelPhotoId || selectedProducts.length === 0 || tryOnDisabled) return;
    setTryOnDisabled(true);
    setTimeout(() => setTryOnDisabled(false), 2000); // 2s debounce

    // After N free try-ons, require auth (unless already authenticated)
    const freeLimit = Math.min(3, config?.monthlyTryOnLimit ?? 10);
    if (tryOnCount >= freeLimit && !isAuthenticated) {
      goToStage('auth');
      return;
    }

    if (pollAbortRef.current) {
      pollAbortRef.current.abort();
    }
    const abortCtrl = new AbortController();
    pollAbortRef.current = abortCtrl;

    const epoch = ++tryOnEpoch.current;
    setLoading(true);
    try {
      const productIds = selectedProducts.map((p) => p.publicId);
      if (import.meta.env.DEV) console.log('[MML] handleTryOn: requesting', productIds);
      const accepted = await requestTryOn(sessionToken, modelPhotoId, productIds);
      if (import.meta.env.DEV) console.log('[MML] handleTryOn: accepted', accepted, 'epoch match', epoch === tryOnEpoch.current);
      if (epoch !== tryOnEpoch.current) return;

      if (import.meta.env.DEV) console.log('[MML] handleTryOn: starting poll', accepted.public_id);
      const result = await pollTryOnResult(sessionToken, accepted.public_id, abortCtrl.signal);
      if (import.meta.env.DEV) console.log('[MML] handleTryOn: poll result', result);
      if (epoch !== tryOnEpoch.current) return;

      if (result.result_url) {
        setTryOnUrl(result.result_url);
        setTryOnKey(result.result_key ?? null);
        setLastTryOnId(result.public_id);
        addTryOnHistory(result.result_url);
        incrementTryOnCount();
      }
    } catch (err) {
      if (epoch !== tryOnEpoch.current) return;
      if (err instanceof DOMException && err.name === 'AbortError') return;
      const status = (err as AxiosError)?.response?.status;
      if (status === 429) {
        toast.error(t('showroom.limitExceeded'));
      } else {
        if (import.meta.env.DEV) console.error('[MML] try-on failed', err);
        toast.error(t('showroom.tryOnFailed'));
      }
    } finally {
      if (epoch === tryOnEpoch.current) setLoading(false);
    }
  };

  const handleToggleFavorite = async () => {
    if (!displayUrl || !sessionToken) return;

    if (isFavorite) {
      // Remove from favorites
      const favId = favoriteIds[displayUrl];
      if (favId) {
        try {
          await deleteFavorite(sessionToken, favId);
          setFavoriteIds((prev) => {
            const next = { ...prev };
            delete next[displayUrl];
            return next;
          });
        } catch {
          // ignore
        }
      }
      toggleFavorite(displayUrl);
    } else {
      try {
        const imageKey = tryOnKey ?? displayUrl.split('/').pop() ?? displayUrl;
        const fav = await addFavorite(
          sessionToken,
          imageKey,
          lastTryOnId ?? undefined,
        );
        setFavoriteIds((prev) => ({ ...prev, [displayUrl]: fav.public_id }));
        toggleFavorite(displayUrl);
        setFavSnackbar(true);
        setTimeout(() => setFavSnackbar(false), 3000);
      } catch {
        toast.error(t('common.error'));
      }
    }
  };

  const handleAddToCart = async () => {
    if (!sessionToken || selectedProducts.length === 0) return;

    for (const product of selectedProducts) {
      try {
        // Save to our backend cart
        await addCartItem(
          sessionToken,
          product.publicId,
          lastTryOnId ?? undefined,
        );

        if (product.externalId && isCSCartSite()) {
          const cartProductId =
            selectedSize && product.sizeVariants?.[selectedSize]
              ? product.sizeVariants[selectedSize]
              : product.externalId;
          try {
            await addToCSCart(cartProductId);
          } catch {
            // External cart add failed silently — item saved in our cart
          }
        }
      } catch {
        toast.error(t('common.error'));
      }
    }
    setAddedToCart(true);
  };

  const handleOpenInStore = () => {
    if (selectedProducts.length === 0) return;
    const url = selectedProducts[0].productUrl;
    if (url) {
      window.open(url, '_blank', 'noopener');
    }
  };

  const handleTakeOff = () => {
    if (!tryOnUrl && selectedProducts.length === 0) {
      toast(t('showroom.nothingWorn'));
      return;
    }
    tryOnEpoch.current++;
    if (pollAbortRef.current) {
      pollAbortRef.current.abort();
      pollAbortRef.current = null;
    }
    setLoading(false);
    clearTryOn();
    setLastTryOnId(null);
    setAddedToCart(false);
    setSelectedSize(null);
    setSizingProduct(null);
    setShowSizes(false);
    setShowColors(false);
    setActiveGroup(null);
  };

  return (
    <div className={`relative w-full h-full overflow-hidden rounded-[24px] bg-white ${isLoading ? 'mml-showroom--image-loading' : ''}`}>
      {/* Main image — full bleed */}
      <div
        className="absolute inset-0 bg-center bg-cover bg-no-repeat"
        style={displayUrl ? { backgroundImage: `url(${displayUrl})` } : undefined}
      />

      {/* Loader overlay */}
      {isLoading && (
        <>
          <TryOnLoader />
          <button
            className="absolute bottom-[24px] left-1/2 -translate-x-1/2 z-[9] bg-white/20 backdrop-blur-[5px] text-white rounded-full px-[24px] py-[10px] font-['Inter',sans-serif] text-[14px] font-medium cursor-pointer border border-white/30"
            onClick={handleTakeOff}
          >
            {t('common.close')}
          </button>
        </>
      )}

      {/* Left panel — outfit layers */}
      {!isFullview && <div className="absolute left-[16px] top-[16px] flex flex-col gap-[6px] z-[4]">
        {CLOTH_TYPE_KEYS.map((key) => {
          const selected = selectedProducts.find(p => p.category === key);
          return (
            <div
              key={key}
              className={`mml-layer-card ${activeClothType === key ? 'mml-layer-card--active' : ''} ${selected ? 'mml-layer-card--filled' : ''}`}
              onClick={() => handleClothTypeClick(key)}
              onPointerDown={(e) => {
                if (!selected) return;
                const startY = e.clientY;
                const el = e.currentTarget;
                const handleUp = (ev: PointerEvent) => {
                  const dy = startY - ev.clientY;
                  if (dy > 40) {
                    // Swipe up — remove this garment
                    const product = selectedProducts.find(p => p.category === key);
                    if (product) {
                      deselectProduct(product.id);
                      el.style.transform = '';
                      el.style.opacity = '';
                    }
                  } else {
                    el.style.transform = '';
                    el.style.opacity = '';
                  }
                  document.removeEventListener('pointerup', handleUp);
                  document.removeEventListener('pointermove', handleMove);
                };
                const handleMove = (ev: PointerEvent) => {
                  const dy = startY - ev.clientY;
                  if (dy > 0) {
                    el.style.transform = `translateY(-${Math.min(dy, 60)}px)`;
                    el.style.opacity = String(Math.max(0.3, 1 - dy / 80));
                  }
                };
                document.addEventListener('pointerup', handleUp);
                document.addEventListener('pointermove', handleMove);
              }}
            >
              <div className="absolute inset-0 bg-white rounded-[12px]" />
              {selected ? (
                <>
                  <img
                    src={selected.thumbnailUrl || selected.photoUrl}
                    alt=""
                    className="absolute inset-0 w-full h-full object-cover rounded-[12px]"
                  />
                  {/* Size badge on filled layer */}
                  {selectedSize && (
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[1] bg-[#1a1a1a] rounded-[24px] min-w-[32px] h-[24px] flex items-center justify-center px-[8px]">
                      <span className="font-['Inter',sans-serif] font-medium text-[15px] text-white leading-[20px] tracking-[-0.2px]">
                        {selectedSize}
                      </span>
                    </div>
                  )}
                </>
              ) : (
                <div className="absolute inset-0 z-[1] flex flex-col items-center justify-center gap-[4px]">
                  <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="#a5a7ad" strokeWidth="1.5" strokeLinecap="round">
                    <path d="M10 4v12M4 10h12" />
                  </svg>
                  <span className="font-['Inter',sans-serif] text-[8px] text-[#a5a7ad] font-medium uppercase tracking-[0.3px] text-center leading-[10px] px-[4px]">
                    {t(CLOTH_TYPE_LABELS[key])}
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>}

      {/* Right panel — action buttons (top-[80px] to avoid close button overlap) */}
      <div className="absolute right-[16px] top-[80px] flex flex-col gap-[8px] z-[4]">
        {/* Menu */}
        <button
          className="bg-white rounded-full size-[60px] flex items-center justify-center shadow-sm cursor-pointer"
          onClick={() => goToStage('settings')}
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <circle cx="10" cy="4" r="1.5" fill="#1a1a1a" />
            <circle cx="10" cy="10" r="1.5" fill="#1a1a1a" />
            <circle cx="10" cy="16" r="1.5" fill="#1a1a1a" />
          </svg>
        </button>
        {/* Expand / Minimize */}
        <button
          className="bg-white rounded-full size-[60px] flex items-center justify-center shadow-sm cursor-pointer"
          onClick={() => setIsFullview((v) => !v)}
        >
          {isFullview ? (
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="#1a1a1a" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 14h4v4M16 6h-4V2M14 14h4v-4M6 6H2v4" />
            </svg>
          ) : (
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="#1a1a1a" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2h4v4M6 18H2v-4M18 14v4h-4M2 6V2h4" />
            </svg>
          )}
        </button>
        {/* Favorite */}
        <button
          className={`rounded-full size-[60px] flex items-center justify-center shadow-sm cursor-pointer ${isFavorite ? 'bg-black' : 'bg-white'}`}
          onClick={handleToggleFavorite}
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill={isFavorite ? 'white' : 'none'} stroke={isFavorite ? 'white' : '#1a1a1a'} strokeWidth="1.5">
            <path d="M10 17.5s-7-4.5-7-9.5a4 4 0 017-2.5A4 4 0 0117 8c0 5-7 9.5-7 9.5z" />
          </svg>
        </button>
        {/* Share */}
        <button
          className="bg-white rounded-full size-[60px] flex items-center justify-center shadow-sm cursor-pointer"
          onClick={() => setShowShare(true)}
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="#1a1a1a" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="15" cy="4" r="2.5" />
            <circle cx="5" cy="10" r="2.5" />
            <circle cx="15" cy="16" r="2.5" />
            <path d="M7.5 11l5 4M12.5 5l-5 4" />
          </svg>
        </button>
      </div>

      {/* Bottom panel — category button + product cards */}
      {!isFullview && <div className="absolute bottom-[16px] left-[16px] right-[16px] flex flex-col gap-[10px] z-[4]">
        {/* Category button — opens subcategory popup */}
        {activeClothType && (
          <button
            className="bg-[#1a1a1a] rounded-[7px] flex items-center justify-between px-[14px] py-[10px] w-[180px] cursor-pointer"
            onClick={() => setShowSubcategories(true)}
          >
            <span className="font-['Inter',sans-serif] font-medium text-[14px] text-white leading-[20px] tracking-[-0.16px] pr-[10px]">
              {activeTag || t(CLOTH_TYPE_LABELS[activeClothType])}
            </span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M7 7h10M7 7v10" />
            </svg>
          </button>
        )}

        {/* Product cards scroll */}
        {activeClothType && (
          <div className="flex gap-[8px] overflow-x-auto pb-[4px] scrollbar-hide">
            {productGroups.map((group) => {
              const isSelected = selectedProducts.some(p => group.variants.some(v => v.id === p.id));
              return (
                <div
                  key={group.baseSku}
                  className={`relative flex flex-col items-center justify-between h-[130px] w-[98px] shrink-0 rounded-[9px] overflow-hidden cursor-pointer bg-[#f6f6f6] ${
                    isSelected ? 'shadow-[0px_4px_16px_0px_rgba(17,17,26,0.1),0px_8px_32px_0px_rgba(17,17,26,0.05)]' : ''
                  }`}
                  onClick={() => handleGroupClick(group)}
                >
                  <img
                    src={group.variants[0].thumbnailUrl || group.variants[0].photoUrl}
                    alt=""
                    className="absolute inset-0 w-full h-full object-cover mix-blend-multiply"
                  />
                  {isSelected && selectedSize && (
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                      <div className="bg-[#1a1a1a] rounded-[24px] min-w-[32px] h-[24px] flex items-center justify-center px-[8px]">
                        <span className="font-['Inter',sans-serif] font-medium text-[15px] text-white leading-[20px] tracking-[-0.2px]">
                          {selectedSize}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Try On button — always visible when products selected */}
        {selectedProducts.length > 0 && !isLoading && (
          <div className="flex justify-center gap-[8px]">
            <button
              className="bg-[#1a1a1a] text-white rounded-full h-[48px] px-[32px] font-['Inter',sans-serif] font-medium text-[15px] tracking-[-0.2px] cursor-pointer shadow-[0_4px_16px_rgba(0,0,0,0.2)]"
              onClick={handleTryOn}
            >
              {t('showroom.tryOn')} ({selectedProducts.length})
            </button>
            {tryOnUrl && (
              <button
                className="bg-white text-[#1a1a1a] rounded-full h-[48px] px-[24px] font-['Inter',sans-serif] font-medium text-[14px] cursor-pointer shadow-sm"
                onClick={handleTakeOff}
              >
                {t('showroom.takeItOff')}
              </button>
            )}
          </div>
        )}
      </div>}

      {/* Favorite snackbar */}
      {favSnackbar && (
        <div className="absolute bottom-[16px] left-1/2 -translate-x-1/2 bg-white rounded-[8px] flex items-center overflow-hidden shadow-[0_4px_16px_rgba(0,0,0,0.1)] z-[5]">
          <div className="pl-[12px] py-[14px]">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="#ef4444" stroke="#ef4444" strokeWidth="1.5">
              <path d="M10 17.5s-7-4.5-7-9.5a4 4 0 017-2.5A4 4 0 0117 8c0 5-7 9.5-7 9.5z" />
            </svg>
          </div>
          <div className="flex-1 px-[8px] py-[12px] font-['Inter',sans-serif] text-[14px] tracking-[-0.42px] text-black whitespace-nowrap">
            {t('showroom.addedToFavorites')}
          </div>
          <button
            className="bg-[#e9e9e9] rounded-[4px] px-[8px] py-[6px] mr-[8px] font-['Inter',sans-serif] font-medium text-[13px] text-[#2c2d2e] cursor-pointer whitespace-nowrap"
            onClick={() => { setFavSnackbar(false); goToStage('favorites'); }}
          >
            {t('showroom.goToFavorites')}
          </button>
        </div>
      )}

      {/* Share modal */}
      {showShare && (
        <div className="absolute inset-0 z-[7] backdrop-blur-[8px] bg-black/40 flex items-center justify-center" onClick={() => setShowShare(false)}>
          <div className="bg-white rounded-[20px] p-[24px] pt-[36px] pb-[42px] w-[428px] max-w-[calc(100%-48px)] flex flex-col items-center gap-[32px]" onClick={(e) => e.stopPropagation()}>
            <div className="flex flex-col items-center gap-[4px] py-[3px] text-center w-full">
              <h2 className="font-['Inter',sans-serif] font-semibold text-[20px] leading-[26px] tracking-[-0.6px] text-[#1a1a1a]">{t('showroom.shareTitle')}</h2>
              <p className="font-['Inter',sans-serif] text-[13px] leading-[18px] text-[#1a1a1a]">{t('showroom.shareSubtitle')}</p>
            </div>
            <div className="flex flex-col gap-[24px] w-full">
              <div className="flex items-center border border-[#c7c9d0]/50 rounded-[8px] px-[12px] py-[5px] w-full">
                <span className="flex-1 text-[15px] text-[#2c2d2e] truncate">{lastTryOnId ? getShareUrl(lastTryOnId) : ''}</span>
                <button
                  className="shrink-0 ml-[8px] p-[12px] cursor-pointer bg-transparent border-none"
                  onClick={async () => {
                    const url = lastTryOnId ? getShareUrl(lastTryOnId) : '';
                    try {
                      await navigator.clipboard.writeText(url);
                    } catch {
                      const ta = document.createElement('textarea');
                      ta.value = url;
                      ta.style.position = 'fixed';
                      ta.style.opacity = '0';
                      document.body.appendChild(ta);
                      ta.select();
                      document.execCommand('copy');
                      document.body.removeChild(ta);
                    }
                    toast(t('showroom.copied'));
                  }}
                >
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="#1a1a1a" strokeWidth="1.5" strokeLinecap="round"><path d="M8 12l4-4M7 10a3 3 0 01-3-3V6a3 3 0 013-3h1M13 10a3 3 0 003-3V6a3 3 0 00-3-3h-1M7 10v1a3 3 0 003 3h0a3 3 0 003-3v-1" /></svg>
                </button>
              </div>
              <div className="flex flex-col gap-[8px]">
                <button
                  className="w-full h-[60px] bg-[#e9e9e9] rounded-full font-['Inter',sans-serif] font-medium text-[15px] text-[#2c2d2e] cursor-pointer"
                  onClick={() => {
                    if (displayUrl) {
                      const a = document.createElement('a');
                      a.href = displayUrl;
                      a.download = 'makeme-look.jpg';
                      a.click();
                    }
                    setShowShare(false);
                  }}
                >
                  {t('showroom.save')}
                </button>
              </div>
            </div>
            <div className="flex flex-col items-center gap-[16px] w-full">
              <p className="font-['Inter',sans-serif] font-medium text-[15px] text-black">{t('showroom.shareIn')}</p>
              <div className="flex gap-[8px] justify-center">
                {/* Instagram — save image, then user shares manually */}
                <button
                  className="size-[60px] rounded-full border border-[#e9e9e9] flex items-center justify-center cursor-pointer bg-transparent"
                  onClick={() => {
                    if (displayUrl) {
                      const a = document.createElement('a');
                      a.href = displayUrl;
                      a.download = 'makeme-look-instagram.jpg';
                      a.click();
                      toast(t('showroom.savedForInstagram'));
                    }
                  }}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><rect x="2" y="2" width="20" height="20" rx="5" stroke="#E1306C" strokeWidth="1.5"/><circle cx="12" cy="12" r="5" stroke="#E1306C" strokeWidth="1.5"/><circle cx="18" cy="6" r="1" fill="#E1306C"/></svg>
                </button>
                {/* Telegram */}
                <a className="size-[60px] rounded-full border border-[#e9e9e9] flex items-center justify-center cursor-pointer" href={`https://t.me/share/url?url=${encodeURIComponent(lastTryOnId ? getShareUrl(lastTryOnId) : '')}`} target="_blank" rel="noopener">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="#229ED9"><path d="M12 0C5.37 0 0 5.37 0 12s5.37 12 12 12 12-5.37 12-12S18.63 0 12 0zm5.53 8.15l-1.86 8.77c-.14.63-.51.78-1.03.49l-2.85-2.1-1.37 1.32c-.15.15-.28.28-.57.28l.2-2.9 5.25-4.74c.23-.2-.05-.32-.36-.12L8.54 13.7l-2.82-.88c-.61-.19-.62-.61.13-.91l11.03-4.25c.51-.19.95.12.79.91l-.14-.42z"/></svg>
                </a>
                {/* VK */}
                <a className="size-[60px] rounded-full border border-[#e9e9e9] flex items-center justify-center cursor-pointer" href={`https://vk.com/share.php?url=${encodeURIComponent(lastTryOnId ? getShareUrl(lastTryOnId) : '')}`} target="_blank" rel="noopener">
                  <svg width="20" height="20" viewBox="0 0 20 20"><rect width="20" height="20" rx="10" fill="#07f"/><path d="M10.4 14.4c-4.7 0-7.4-3.2-7.5-8.5h2.4c.1 3.9 1.8 5.5 3.1 5.9V5.9h2.2v3.3c1.3-.1 2.7-1.7 3.1-3.3h2.2c-.3 2-1.8 3.6-2.8 4.2 1 .5 2.8 1.9 3.4 4.3h-2.4c-.5-1.5-1.7-2.7-3.5-2.9v2.9h-.2z" fill="#fff"/></svg>
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Colors panel (bottom sheet) */}
      {showColors && (
        <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-[20px] p-[24px] z-[5] shadow-[0_-4px_20px_rgba(0,0,0,0.1)]">
          <div className="flex items-center justify-between mb-[16px]">
            <h3 className="font-['Inter',sans-serif] font-semibold text-[17px] text-[#1a1a1a] truncate">
              {activeGroup?.variants[0].name || ''}
            </h3>
            <button className="p-[8px] cursor-pointer" onClick={() => setShowColors(false)}>
              <svg width="12" height="12" viewBox="0 0 12 12" stroke="#1a1a1a" strokeWidth="2" strokeLinecap="round">
                <line x1="1" y1="1" x2="11" y2="11" /><line x1="11" y1="1" x2="1" y2="11" />
              </svg>
            </button>
          </div>
          <div className="flex flex-wrap gap-[8px]">
            {activeGroup?.variants.map((variant) => (
              <div
                key={variant.id}
                className={`px-[16px] py-[10px] rounded-full text-[14px] font-medium cursor-pointer ${
                  selectedProducts.some(p => p.id === variant.id)
                    ? 'bg-[#1a1a1a] text-white'
                    : 'bg-[#f6f6f6] text-[#1a1a1a]'
                }`}
                onClick={() => handleColorSelect(variant)}
              >
                {variant.color || variant.name}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Sizes panel (bottom sheet) */}
      {showSizes && (
        <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-[20px] p-[24px] z-[5] shadow-[0_-4px_20px_rgba(0,0,0,0.1)]">
          <div className="flex items-center justify-between mb-[4px]">
            <h3 className="font-['Inter',sans-serif] font-semibold text-[17px] text-[#1a1a1a] truncate">
              {sizingProduct?.name || ''}
            </h3>
            <button className="p-[8px] cursor-pointer" onClick={() => setShowSizes(false)}>
              <svg width="12" height="12" viewBox="0 0 12 12" stroke="#1a1a1a" strokeWidth="2" strokeLinecap="round">
                <line x1="1" y1="1" x2="11" y2="11" /><line x1="11" y1="1" x2="1" y2="11" />
              </svg>
            </button>
          </div>
          <div className="text-[13px] text-[#a5a7ad] mb-[12px]">
            {sizeRecLoading
              ? t('showroom.calculatingSize')
              : sizeRec
                ? `${t('showroom.recommendedSize')}: ${sizeRec.recommended_size}`
                : null}
          </div>
          <div className="flex flex-wrap gap-[8px] mb-[16px]">
            {(sizingProduct?.sizeVariants
              ? Object.keys(sizingProduct.sizeVariants)
              : ['XXS', 'XS', 'S', 'M', 'L', 'XL', 'XXL']
            ).map((size) => {
              const disabled = false;
              const isRec = sizeRec?.recommended_size === size;
              return (
                <div
                  key={size}
                  className={`min-w-[48px] h-[40px] flex items-center justify-center rounded-full text-[14px] font-medium cursor-pointer px-[12px] ${
                    selectedSize === size
                      ? 'bg-[#1a1a1a] text-white'
                      : isRec
                        ? 'bg-[#e9f5e9] text-[#1a1a1a] ring-1 ring-green-400'
                        : 'bg-[#f6f6f6] text-[#1a1a1a]'
                  } ${disabled ? 'opacity-30 pointer-events-none' : ''}`}
                  onClick={disabled ? undefined : () => {
                    setSelectedSize(size);
                    setShowSizes(false);
                    setActiveClothType(null);
                  }}
                >
                  {size}
                </div>
              );
            })}
          </div>
          <div className="flex flex-col gap-[8px]">
            {/* Try on button inside size sheet */}
            {selectedProducts.length > 0 && !isLoading && (
              <button
                className="w-full h-[48px] rounded-full font-medium text-[15px] bg-[#1a1a1a] text-white cursor-pointer shadow-[0_4px_16px_rgba(0,0,0,0.2)]"
                onClick={() => {
                  setShowSizes(false);
                  setActiveClothType(null);
                  handleTryOn();
                }}
              >
                {t('showroom.tryOn')} ({selectedProducts.length})
              </button>
            )}
            <div className="flex gap-[8px]">
              <button
                className={`flex-1 h-[48px] rounded-full font-medium text-[14px] cursor-pointer ${
                  addedToCart ? 'bg-[#e9e9e9] text-[#1a1a1a]' : 'bg-[#f6f6f6] text-[#1a1a1a]'
                }`}
                onClick={addedToCart ? undefined : handleAddToCart}
              >
                {addedToCart ? t('showroom.addedToCart') : t('showroom.addToCart')}
              </button>
              <button
                className="flex-1 h-[48px] rounded-full font-medium text-[14px] bg-[#f6f6f6] text-[#1a1a1a] cursor-pointer"
                onClick={handleOpenInStore}
              >
                {t('showroom.openInStore')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Subcategories bottom-sheet */}
      {showSubcategories && activeClothType && (
        <div
          className="absolute inset-0 z-[6] backdrop-blur-[8px] bg-black/40"
          onClick={() => setShowSubcategories(false)}
        >
          <div
            className="absolute bottom-[10px] left-[10px] right-[10px] bg-white rounded-[20px] px-[24px] pt-[24px] pb-[42px]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex flex-col gap-[12px] max-h-[60vh] overflow-y-auto">
              <div
                className={`cursor-pointer font-['Inter',sans-serif] font-bold text-[24px] leading-[28px] tracking-[-0.8px] ${
                  !activeTag ? 'text-[#1a1a1a]' : 'text-[#87898f]'
                }`}
                onClick={() => {
                  setActiveTag(null);
                  setShowSubcategories(false);
                }}
              >
                {t(CLOTH_TYPE_LABELS[activeClothType])} ({products.filter(p => p.category === activeClothType).length})
              </div>
              {tagsByCategory[activeClothType]?.map((tag) => {
                const count = products.filter(p => p.category === activeClothType && p.subcategory === tag).length;
                return (
                  <div
                    key={tag}
                    className={`cursor-pointer font-['Inter',sans-serif] font-semibold text-[17px] leading-[22px] tracking-[-0.4px] ${
                      activeTag === tag ? 'text-[#1a1a1a]' : 'text-[#87898f]'
                    }`}
                    onClick={() => {
                      setActiveTag(tag);
                      setShowSubcategories(false);
                    }}
                  >
                    {tag} ({count})
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
