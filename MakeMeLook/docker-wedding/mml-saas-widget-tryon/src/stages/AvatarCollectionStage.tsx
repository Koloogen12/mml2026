import { type FC, useState, useEffect } from 'react';
import { useWidgetStore } from '@/store';
import { StageLayout } from '@/components/StageLayout';
import { listAvatars } from '@/api';
import type { AvatarItem } from '@/types';
import { t } from '@/i18n';

export const AvatarCollectionStage: FC = () => {
  const goToStage = useWidgetStore((s) => s.goToStage);
  const bodyParams = useWidgetStore((s) => s.bodyParams);
  const setModelPhoto = useWidgetStore((s) => s.setModelPhoto);

  const [avatars, setAvatars] = useState<AvatarItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'gender'>('all');

  useEffect(() => {
    setLoading(true);
    listAvatars(bodyParams.gender ?? undefined)
      .then(setAvatars)
      .catch(() => setAvatars([]))
      .finally(() => setLoading(false));
  }, [bodyParams.gender]);

  const filteredAvatars =
    filter === 'all'
      ? avatars
      : avatars.filter((a) => a.gender === bodyParams.gender);

  const handleSelect = (avatar: AvatarItem) => {
    setModelPhoto(avatar.public_id, avatar.photo_url);
    goToStage('showroom');
  };

  return (
    <StageLayout heading={t('avatarCollection.heading')} showBack>
      <div className="mml-avatar-collection">
        <div className="mml-avatar-collection__filters">
          <div
            className={`mml-avatar-collection__filter ${filter === 'all' ? 'mml-avatar-collection__filter--active' : ''}`}
            onClick={() => setFilter('all')}
          >
            {t('common.all')}
          </div>
          <div
            className={`mml-avatar-collection__filter ${filter === 'gender' ? 'mml-avatar-collection__filter--active' : ''}`}
            onClick={() => setFilter('gender')}
          >
            {bodyParams.gender === 'male' ? t('common.male') : t('common.female')}
          </div>
        </div>

        <div className="mml-avatar-collection__grid">
          {loading && (
            <div className="mml-avatar-collection__loading">{t('common.loading')}</div>
          )}
          {!loading &&
            filteredAvatars.map((avatar) => (
              <div
                key={avatar.public_id}
                className="mml-avatar-collection__item"
                onClick={() => handleSelect(avatar)}
              >
                <img
                  src={avatar.thumbnail_url || avatar.photo_url}
                  alt="Avatar"
                />
              </div>
            ))}
          {!loading && filteredAvatars.length === 0 && (
            <div className="mml-avatar-collection__empty">
              {t('avatarCollection.noAvatars')}
            </div>
          )}
        </div>
      </div>
    </StageLayout>
  );
};
