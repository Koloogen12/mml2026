import { type FC, useState, useEffect } from 'react';
import { useWidgetStore } from '@/store';
import { StageLayout } from '@/components/StageLayout';
import { listCartItems, deleteCartItem } from '@/api';
import type { CartItemResponse } from '@/types';
import { t } from '@/i18n';
import toast from 'react-hot-toast';

export const MyPurchasesStage: FC = () => {
  const sessionToken = useWidgetStore((s) => s.sessionToken);

  const [items, setItems] = useState<CartItemResponse[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!sessionToken) return;
    setLoading(true);
    listCartItems(sessionToken)
      .then(setItems)
      .catch(() => { setItems([]); toast.error(t('common.errorLoading')); })
      .finally(() => setLoading(false));
  }, [sessionToken]);

  const handleRemove = async (item: CartItemResponse) => {
    if (!sessionToken) return;
    try {
      await deleteCartItem(sessionToken, item.public_id);
      setItems((prev) => prev.filter((c) => c.id !== item.id));
    } catch {
      toast.error(t('common.error'));
    }
  };

  return (
    <StageLayout heading={t('myPurchases.heading')} showBack>
      <div className="mml-my-purchases__items">
        {loading && <div className="mml-my-purchases__loading">{t('common.loading')}</div>}
        {!loading &&
          items.map((item) => (
            <div key={item.id} className="mml-my-purchases__item">
              <div className="mml-my-purchases__item-img">
                {item.product?.photoUrl && (
                  <img src={item.product.photoUrl} alt={item.product.name} />
                )}
              </div>
              <div className="mml-my-purchases__item-info">
                <div className="mml-my-purchases__item-title">
                  {item.product?.name ?? t('myPurchases.product')}
                </div>
                <div className="mml-my-purchases__item-desc">
                  {item.product?.category ?? ''}
                </div>
                {item.product?.price != null && (
                  <div className="mml-my-purchases__item-price">
                    {item.product.currency ?? ''} {item.product.price}
                  </div>
                )}
              </div>
              <div
                className="mml-my-purchases__item-remove"
                onClick={() => handleRemove(item)}
              >
                &times;
              </div>
            </div>
          ))}
        {!loading && items.length === 0 && (
          <div className="mml-my-purchases__empty" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, color: '#a5a7ad', padding: 24, minHeight: 200, justifyContent: 'center' }}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" strokeWidth="1.5" strokeLinecap="round"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4zM3 6h18M16 10a4 4 0 01-8 0" /></svg>
            <p style={{ margin: 0 }}>{t('myPurchases.empty')}</p>
          </div>
        )}
      </div>
    </StageLayout>
  );
};
