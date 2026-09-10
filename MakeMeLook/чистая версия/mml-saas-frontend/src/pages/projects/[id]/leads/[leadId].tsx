import { useState } from 'react';
import type { FC } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useLocale } from '@/shared/lib/locale';
import { t } from '@/shared/lib/i18n';
import {
  ChevronLeft,
  User,
  Camera,
  Shirt,
  Heart,
  ShoppingCart,
  Monitor,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { PageHeader } from '@/shared/ui/page-header';
import { useLead } from '@/shared/api';
import type { LeadTryOnResponse, LeadTryOnProductResponse } from '@/shared/api';
import { formatDate, formatDateTime } from '@/shared/lib/formatDate';

// ─── Try-on product thumbnail ────────────────────────────────────────────────

interface ProductThumbProps {
  product?: LeadTryOnProductResponse;
  label: string;
}

const ProductThumb: FC<ProductThumbProps> = ({ product, label }) => {
  if (!product) return null;
  return (
    <div className="flex flex-col items-center gap-1 w-20">
      {product.photo_url ? (
        <img
          src={product.photo_url}
          alt={product.name}
          className="w-16 h-16 rounded-lg object-cover border"
        />
      ) : (
        <div className="w-16 h-16 rounded-lg bg-muted flex items-center justify-center border">
          <Shirt className="h-5 w-5 text-muted-foreground" />
        </div>
      )}
      <span className="text-xs text-muted-foreground text-center truncate w-full">
        {product.name}
      </span>
      <span className="text-[10px] text-muted-foreground/60">{label}</span>
    </div>
  );
};

// ─── Main Component ──────────────────────────────────────────────────────────

export const Component: FC = () => {
  const navigate = useNavigate();
  const { id, leadId } = useParams<{ id: string; leadId: string }>();
  const locale = useLocale();
  const lp = (path: string) => `/${locale}${path}`;
  const projectId = parseInt(id!);
  const leadIdNum = parseInt(leadId!);

  const { data: lead, isLoading } = useLead(projectId, leadIdNum);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const formatGender = (gender?: string) => {
    if (!gender) return '—';
    if (gender === 'female') return t(locale, 'leads.genderFemaleLabel');
    if (gender === 'male') return t(locale, 'leads.genderMaleLabel');
    return gender;
  };

  const formatBellyShape = (shape?: string) => {
    if (!shape) return '—';
    const map: Record<string, string> = {
      flat: t(locale, 'leads.bellyFlat'),
      medium: t(locale, 'leads.bellyMedium'),
      gross: t(locale, 'leads.bellyLarge'),
    };
    return map[shape] ?? shape;
  };

  const formatFigureType = (type?: string) => {
    if (!type) return '—';
    const map: Record<string, string> = {
      pear: t(locale, 'leads.figurePear'),
      'a-line': t(locale, 'leads.figureALine'),
      rectangle: t(locale, 'leads.figureRectangle'),
      triangle: t(locale, 'leads.figureTriangle'),
      hourglass: t(locale, 'leads.figureHourglass'),
      apple: t(locale, 'leads.figureApple'),
    };
    return map[type] ?? type;
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader
          title={t(locale, 'leads.leadDetails')}
          actions={
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(lp(`/projects/${id}/leads`))}
            >
              <ChevronLeft className="mr-1 h-4 w-4" />
              {t(locale, 'leads.backToLeads')}
            </Button>
          }
        />
        <div className="flex items-center justify-center py-20 text-muted-foreground text-sm">
          {t(locale, 'leads.loadingDetails')}
        </div>
      </div>
    );
  }

  if (!lead) {
    return (
      <div className="space-y-6">
        <PageHeader
          title={t(locale, 'leads.leadDetails')}
          actions={
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(lp(`/projects/${id}/leads`))}
            >
              <ChevronLeft className="mr-1 h-4 w-4" />
              {t(locale, 'leads.backToLeads')}
            </Button>
          }
        />
        <div className="flex items-center justify-center py-20 text-muted-foreground text-sm">
          {t(locale, 'leads.notFound')}
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6">
        <PageHeader
          title={`Lead #${lead.id}`}
          description={formatDate(lead.created_at, locale)}
          actions={
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(lp(`/projects/${id}/leads`))}
            >
              <ChevronLeft className="mr-1 h-4 w-4" />
              {t(locale, 'leads.backToLeads')}
            </Button>
          }
        />

        {/* Body Parameters */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <User className="h-4 w-4" />
              {t(locale, 'leads.bodyParameters')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              <ParamItem label={t(locale, 'leads.paramGender')} value={formatGender(lead.gender)} />
              <ParamItem
                label={t(locale, 'leads.paramHeight')}
                value={lead.height ? `${lead.height} cm` : '—'}
              />
              <ParamItem
                label={t(locale, 'leads.paramWeight')}
                value={lead.weight ? `${lead.weight} kg` : '—'}
              />
              <ParamItem label={t(locale, 'leads.paramSize')} value={lead.size ?? '—'} />
              <ParamItem
                label={t(locale, 'leads.paramChest')}
                value={lead.chest ? `${lead.chest} cm` : '—'}
              />
              <ParamItem
                label={t(locale, 'leads.paramWaist')}
                value={lead.waist ? `${lead.waist} cm` : '—'}
              />
              <ParamItem
                label={t(locale, 'leads.paramHip')}
                value={lead.hip ? `${lead.hip} cm` : '—'}
              />
              <ParamItem
                label={t(locale, 'leads.paramFigureType')}
                value={formatFigureType(lead.figure_type)}
              />
              <ParamItem
                label={t(locale, 'leads.paramBellyShape')}
                value={formatBellyShape(lead.belly_shape)}
              />
              {lead.email && <ParamItem label={t(locale, 'leads.paramEmail')} value={lead.email} />}
            </div>
          </CardContent>
        </Card>

        {/* Uploaded Photos */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Camera className="h-4 w-4" />
              {t(locale, 'leads.uploadedPhotos')}
              {lead.photos.length > 0 && (
                <Badge variant="secondary" className="ml-1">
                  {lead.photos.length}
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {lead.photos.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {t(locale, 'leads.noPhotos')}
              </p>
            ) : (
              <div className="flex gap-3 flex-wrap">
                {lead.photos.map((photo) => (
                  <div
                    key={photo.id}
                    className="flex flex-col items-center gap-1"
                  >
                    <img
                      src={photo.url}
                      alt=""
                      className="w-24 h-32 rounded-lg object-cover border cursor-pointer hover:ring-2 hover:ring-primary transition-all"
                      onClick={() => setPreviewImage(photo.url)}
                    />
                    <span className="text-xs text-muted-foreground">
                      {formatDate(photo.created_at, locale)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Try-on History */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Shirt className="h-4 w-4" />
              {t(locale, 'leads.tryOnHistory')}
              {lead.try_ons.length > 0 && (
                <Badge variant="secondary" className="ml-1">
                  {lead.try_ons.length}
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {lead.try_ons.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t(locale, 'leads.noTryOns')}</p>
            ) : (
              <div className="space-y-4">
                {lead.try_ons.map((tryon, idx) => (
                  <TryOnCard
                    key={tryon.id}
                    tryon={tryon}
                    locale={locale}
                    onImageClick={setPreviewImage}
                    showSeparator={idx < lead.try_ons.length - 1}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Favorites */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Heart className="h-4 w-4" />
              {t(locale, 'leads.favorites')}
              {lead.favorites.length > 0 && (
                <Badge variant="secondary" className="ml-1">
                  {lead.favorites.length}
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {lead.favorites.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {t(locale, 'leads.noFavorites')}
              </p>
            ) : (
              <div className="flex gap-3 flex-wrap">
                {lead.favorites.map((fav) => (
                  <div
                    key={fav.id}
                    className="flex flex-col items-center gap-1"
                  >
                    <img
                      src={fav.image_url}
                      alt=""
                      className="w-24 h-32 rounded-lg object-cover border cursor-pointer hover:ring-2 hover:ring-primary transition-all"
                      onClick={() => setPreviewImage(fav.image_url)}
                    />
                    <span className="text-xs text-muted-foreground">
                      {formatDate(fav.created_at, locale)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Cart */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <ShoppingCart className="h-4 w-4" />
              {t(locale, 'leads.cart')}
              {lead.cart_items.length > 0 && (
                <Badge variant="secondary" className="ml-1">
                  {lead.cart_items.length}
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {lead.cart_items.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t(locale, 'leads.cartEmpty')}</p>
            ) : (
              <div className="space-y-2">
                {lead.cart_items.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50"
                  >
                    {item.product.photo_url ? (
                      <img
                        src={item.product.photo_url}
                        alt={item.product.name}
                        className="w-10 h-10 rounded-lg object-cover border"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center border">
                        <Shirt className="h-4 w-4 text-muted-foreground" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {item.product.name}
                      </p>
                      {item.product.category && (
                        <p className="text-xs text-muted-foreground capitalize">
                          {item.product.category}
                        </p>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {formatDate(item.created_at, locale)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Technical Information */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Monitor className="h-4 w-4" />
              {t(locale, 'leads.technicalInfo')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <ParamItem
                label={t(locale, 'leads.session')}
                value={lead.session_token.slice(0, 8) + '...'}
              />
              <ParamItem label={t(locale, 'leads.ipAddress')} value={lead.ip ?? '—'} />
              <ParamItem
                label={t(locale, 'leads.firstVisit')}
                value={formatDate(lead.first_visit_at, locale)}
              />
              <ParamItem
                label={t(locale, 'leads.lastVisit')}
                value={formatDate(lead.last_visit_at, locale)}
              />
              <ParamItem
                label={t(locale, 'leads.totalVisits')}
                value={String(lead.visit_count)}
              />
              <ParamItem
                label={t(locale, 'leads.userAgent')}
                value={lead.user_agent ? truncateUA(lead.user_agent) : '—'}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Image preview modal */}
      <Dialog open={!!previewImage} onOpenChange={() => setPreviewImage(null)}>
        <DialogContent className="max-w-2xl p-0 overflow-hidden">
          <button
            onClick={() => setPreviewImage(null)}
            className="absolute right-3 top-3 z-10 rounded-full bg-black/50 p-1.5 text-white hover:bg-black/70 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
          {previewImage && (
            <img
              src={previewImage}
              alt=""
              className="w-full h-auto max-h-[80vh] object-contain"
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

interface ParamItemProps {
  label: string;
  value: string;
}

const ParamItem: FC<ParamItemProps> = ({ label, value }) => (
  <div>
    <p className="text-xs text-muted-foreground mb-0.5">{label}</p>
    <p className="text-sm font-medium">{value}</p>
  </div>
);

interface TryOnCardProps {
  tryon: LeadTryOnResponse;
  locale: 'en' | 'ru';
  onImageClick: (url: string) => void;
  showSeparator: boolean;
}

const TryOnCard: FC<TryOnCardProps> = ({
  tryon,
  locale,
  onImageClick,
  showSeparator,
}) => {
  return (
    <>
      <div className="flex gap-4">
        {/* Result image */}
        <img
          src={tryon.result_url}
          alt=""
          className="w-28 h-36 rounded-lg object-cover border cursor-pointer hover:ring-2 hover:ring-primary transition-all flex-shrink-0"
          onClick={() => onImageClick(tryon.result_url)}
        />
        <div className="flex-1 min-w-0">
          <p className="text-sm text-muted-foreground mb-2">
            {formatDateTime(tryon.created_at, locale)}
          </p>
          <p className="text-xs text-muted-foreground mb-1.5">{t(locale, 'leads.components')}</p>
          <div className="flex gap-3 flex-wrap">
            {tryon.model_photo && (
              <div className="flex flex-col items-center gap-1 w-20">
                <img
                  src={tryon.model_photo.url}
                  alt=""
                  className="w-16 h-16 rounded-lg object-cover border cursor-pointer hover:ring-2 hover:ring-primary transition-all"
                  onClick={() => onImageClick(tryon.model_photo!.url)}
                />
                <span className="text-[10px] text-muted-foreground/60">
                  {t(locale, 'leads.modelLabel')}
                </span>
              </div>
            )}
            <ProductThumb product={tryon.outerwear_product} label={t(locale, 'leads.outerwearLabel')} />
            <ProductThumb product={tryon.tops_product} label={t(locale, 'leads.topLabel')} />
            <ProductThumb product={tryon.bottoms_product} label={t(locale, 'leads.bottomLabel')} />
          </div>
        </div>
      </div>
      {showSeparator && <Separator />}
    </>
  );
};

const truncateUA = (ua: string) => {
  if (ua.length <= 40) return ua;
  return ua.slice(0, 40) + '...';
};
