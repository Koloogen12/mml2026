export { apiClient } from './client';
export { useReference } from './reference';
export type { ReferenceData, ReferenceItem, ColorItem } from './reference';
export { authApi } from './auth';
export { usersApi } from './users';
export { projectsApi, dashboardApi } from './projects';
export { domainsApi } from './domains';
export { productsApi, productGroupsApi } from './products';
export { widgetConfigApi } from './widget-config';
export { installationApi } from './installation';
export { leadsApi } from './leads';
export { getApiError } from './error';

// Query hooks & key factories
export {
  dashboardKeys,
  useDashboardStats,
  useRecentProjects,
} from './dashboard.queries';
export {
  projectKeys,
  useProjects,
  useProject,
  useProjectOnboarding,
  useProjectStats,
  useProjectDomains,
} from './projects.queries';
export {
  productKeys,
  groupKeys,
  useProducts,
  useProduct,
  useProductGroups,
  useAllProducts,
  useGroupProducts,
} from './products.queries';
export {
  widgetConfigKeys,
  useWidgetConfig,
  useWidgetConfigPresets,
  useUpdateWidgetConfig,
  useApplyPreset,
  useDeleteWidgetLogo,
  useUploadWidgetLogo,
} from './widget-config.queries';
export {
  installationKeys,
  useWidgetCode,
  useReadiness,
  useDiagnostics,
  useRunDiagnostics,
} from './installation.queries';
export { leadKeys, useLeads, useLead } from './leads.queries';
export type {
  AuthResponse,
  UserResponse,
  MeResponse,
  MessageResponse,
  RegisterRequest,
  LoginRequest,
  VerifyEmailRequest,
  ResendVerificationRequest,
  PasswordResetRequest,
  PasswordResetVerifyRequest,
  PasswordResetCompleteRequest,
} from './auth';
export type {
  UpdateProfileRequest,
  ChangePasswordRequest,
  ProfileResponse,
} from './users';
export type {
  CreateProjectRequest,
  UpdateProjectRequest,
  ProjectResponse,
  ProjectListResponse,
  ProjectStatsResponse,
  OnboardingStatusResponse,
  DashboardStatsResponse,
} from './projects';
export type { DomainResponse, DomainsListResponse } from './domains';
export type {
  ProductResponse,
  ProductListResponse,
  ProductListFilter,
  ProductPhotoResponse,
  CreateProductRequest,
  BulkProductActionRequest,
  BulkActionResponse,
  PhotoOrderItem,
  ImportValidateResponse,
  ImportExecuteResponse,
  ImportStatusResponse,
  ParseHeadersResponse,
  ProductGroupResponse,
  ProductGroupListResponse,
  CreateProductGroupRequest,
} from './products';
export type {
  WidgetConfigResponse,
  PresetResponse,
  PresetConfigPartial,
} from './widget-config';
export type {
  WidgetCodeResponse,
  ReadinessResponse,
  DiagnosticCheck,
  DomainDiagnostics,
  DiagnosticsResponse,
} from './installation';
export type {
  LeadResponse,
  LeadListResponse,
  LeadListFilter,
  LeadDetailResponse,
  LeadPhotoResponse,
  LeadTryOnResponse,
  LeadTryOnProductResponse,
  LeadFavoriteResponse,
  LeadCartItemResponse,
} from './leads';
