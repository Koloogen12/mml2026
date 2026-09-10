import { type FC, useState, useEffect } from 'react';
import { useWidgetStore } from '@/store';
import { getTryOnHistory } from '@/api';
import type { TryOnHistoryItem } from '@/types';
import { t } from '@/i18n';
import toast from 'react-hot-toast';

const MONTHS = [
  'january',
  'february',
  'march',
  'april',
  'may',
  'june',
  'july',
  'august',
  'september',
  'october',
  'november',
  'december',
];

function getOrdinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return `${getOrdinal(d.getDate())} ${MONTHS[d.getMonth()]}`;
}

const BackArrow: FC = () => (
  <svg
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="#1a1a1a"
    strokeWidth="2"
    strokeLinecap="round"
  >
    <path d="M15 4L7 12L15 20" />
  </svg>
);

export const FittingHistoryStage: FC = () => {
  const goBack = useWidgetStore((s) => s.goBack);
  const sessionToken = useWidgetStore((s) => s.sessionToken);

  const [items, setItems] = useState<TryOnHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!sessionToken) return;
    setLoading(true);
    getTryOnHistory(sessionToken)
      .then(setItems)
      .catch(() => { setItems([]); toast.error(t('common.errorLoading')); })
      .finally(() => setLoading(false));
  }, [sessionToken]);

  // Group by date
  const groups: Record<string, TryOnHistoryItem[]> = {};
  for (const item of items) {
    const dateKey = formatDate(item.created_at);
    if (!groups[dateKey]) groups[dateKey] = [];
    groups[dateKey].push(item);
  }

  return (
    <div className="mml-fitting-history">
      <div className="mml-fitting-history__back" onClick={goBack}>
        <BackArrow />
      </div>
      <div className="mml-fitting-history__slides">
        {loading && (
          <div className="mml-fitting-history__loading">{t('common.loading')}</div>
        )}
        {!loading &&
          Object.entries(groups).map(([date, entries]) => (
            <div key={date}>
              <div className="mml-fitting-history__slides-group-heading">
                <span>{date}</span>
              </div>
              {entries.map((entry) => (
                <div key={entry.id} className="mml-fitting-history__slide">
                  <img src={entry.result_url} alt={`Try-on ${date}`} />
                </div>
              ))}
            </div>
          ))}
        {!loading && items.length === 0 && (
          <div className="mml-fitting-history__empty">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" strokeWidth="1.5" strokeLinecap="round">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 6v6l4 2" />
            </svg>
            <p>{t('fittingHistory.empty')}</p>
          </div>
        )}
      </div>
    </div>
  );
};
