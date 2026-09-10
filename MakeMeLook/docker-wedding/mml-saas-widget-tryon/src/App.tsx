import type { FC } from 'react';
import { useWidgetStore } from '@/store';
import { WidgetButton } from '@/components/WidgetButton';
import { WidgetModal } from '@/components/WidgetModal';
import { WidgetToaster } from '@/components/WidgetToaster';
import {
  IntroStage,
  BasicParametersStage,
  MeasurementsStage,
  BellyShapeStage,
  FigureTypeStage,
  PrivacyPolicyStage,
  PhotoUploadStage,
  PhotoChoiceStage,
  AvatarCollectionStage,
  ShowroomStage,
  SettingsStage,
  FavoritesStage,
  AccountStage,
  AccountEmailStage,
  FittingHistoryStage,
  MyPurchasesStage,
  DeleteAccountStage,
  PhotoRecommendationsStage,
  AuthStage,
} from '@/stages';
import type { StageName } from '@/types';
import { ErrorBoundary } from '@/components/ErrorBoundary';

const STAGE_COMPONENTS: Record<StageName, FC | null> = {
  intro: IntroStage,
  gender: BasicParametersStage, // legacy route, kept for Settings "Основные параметры"
  parameters: BasicParametersStage,
  measurements: MeasurementsStage,
  bellyShape: BellyShapeStage,
  figureType: FigureTypeStage,
  privacyPolicy: PrivacyPolicyStage,
  photoUpload: PhotoUploadStage,
  photoChoice: PhotoChoiceStage,
  avatarCollection: AvatarCollectionStage,
  showroom: ShowroomStage,
  tryonResult: null,
  settings: SettingsStage,
  favorites: FavoritesStage,
  cart: MyPurchasesStage,
  account: AccountStage,
  accountEmail: AccountEmailStage,
  history: FittingHistoryStage,
  myPurchases: MyPurchasesStage,
  deleteAccount: DeleteAccountStage,
  photoRecommendations: PhotoRecommendationsStage,
  auth: AuthStage,
};

// Stages that render fullscreen (no modal header/footer)
const FULLSCREEN_STAGES = new Set<StageName>([
  'intro',
  'gender',
  'parameters',
  'measurements',
  'bellyShape',
  'figureType',
  'privacyPolicy',
  'photoUpload',
  'photoRecommendations',
  'auth',
  'showroom',
  'favorites',
  'history',
  'myPurchases',
  'cart',
  'accountEmail',
  'deleteAccount',
]);

const StageRenderer: FC = () => {
  const currentStage = useWidgetStore((s) => s.currentStage);

  const Component = STAGE_COMPONENTS[currentStage];

  if (!Component) {
    return (
      <div className="mml-stage">
        <h3 className="mml-stage__title">Coming Soon</h3>
        <p className="mml-stage__subtitle">
          This stage is not yet implemented.
        </p>
      </div>
    );
  }

  return <Component />;
};

export const App: FC = () => {
  const config = useWidgetStore((s) => s.config);
  const currentStage = useWidgetStore((s) => s.currentStage);
  const isFullscreen = FULLSCREEN_STAGES.has(currentStage);

  if (!config) return null;

  return (
    <>
      <WidgetButton />
      <WidgetModal hideChrome={isFullscreen}>
        <WidgetToaster />
        <ErrorBoundary>
          <StageRenderer />
        </ErrorBoundary>
      </WidgetModal>
    </>
  );
};
