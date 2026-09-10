import { type FC, useState, useEffect } from 'react';
import { useWidgetStore } from '@/store';
import { listFavorites, deleteFavorite } from '@/api';
import type { FavoriteItem } from '@/types';
import { t } from '@/i18n';
import toast from 'react-hot-toast';

const BackArrow: FC = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#1a1a1a" strokeWidth="2" strokeLinecap="round">
    <path d="M15 4L7 12L15 20" />
  </svg>
);

export const FavoritesStage: FC = () => {
  const goBack = useWidgetStore((s) => s.goBack);
  const sessionToken = useWidgetStore((s) => s.sessionToken);

  const [items, setItems] = useState<FavoriteItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!sessionToken) return;
    setLoading(true);
    setError(false);
    listFavorites(sessionToken)
      .then(setItems)
      .catch(() => {
        setItems([]);
        setError(true);
        toast.error(t('common.errorLoading'));
      })
      .finally(() => setLoading(false));
  }, [sessionToken]);

  const handleDelete = async (item: FavoriteItem) => {
    if (!sessionToken) return;
    try {
      await deleteFavorite(sessionToken, item.public_id);
      setItems((prev) => prev.filter((f) => f.id !== item.id));
    } catch {
      toast.error(t('common.error'));
    }
  };

  return (
    <div className="mml-favorites">
      <div className="mml-favorites__back" onClick={goBack}>
        <BackArrow />
      </div>
      <div className="mml-favorites__slides">
        {loading && <div className="mml-favorites__loading">{t('common.loading')}</div>}
        {!loading &&
          items.map((item) => (
            <div key={item.id} className="mml-favorites__slide">
              <img src={item.image_url} alt="Favorite" />
              <div
                className="mml-favorites__slide-remove"
                onClick={() => handleDelete(item)}
              >
                &times;
              </div>
            </div>
          ))}
        {!loading && !error && items.length === 0 && (
          <div className="mml-favorites__empty">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" strokeWidth="1.5">
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
            </svg>
            <p>{t('favorites.empty')}</p>
          </div>
        )}
        {!loading && error && (
          <div className="mml-favorites__empty">
            <p>{t('common.errorLoading')}</p>
          </div>
        )}
      </div>
    </div>
  );
};
