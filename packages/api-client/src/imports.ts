import { apiClient } from './assets'

export interface ImportRunDto {
  id: string
  organizationId: string
  sourceSystem: string
  sourceFileName: string
  sourceFileHash: string
  status: string
  startedAt: string | null
  completedAt: string | null
  totalRecords: number
  readyRecords: number
  importedRecords: number
  updatedRecords: number
  skippedRecords: number
  warningRecords: number
  failedRecords: number
  createdAt: string
}

export interface ImportIssueDto {
  id: string
  importRecordId?: string | null
  severity: 'INFO' | 'WARNING' | 'ERROR' | string
  code: string
  message: string
  entityType?: string | null
  sourceExternalId?: string | null
}

export interface ImportValidationDto {
  run: ImportRunDto
  ready: number
  reviewRequired: number
  failed: number
  warnings: number
  recordTypeCounts?: Record<string, number>
}

export interface ImportReconciliationDto {
  run: ImportRunDto
  sourceRows: number
  mappedTargets: number
  imported: number
  updated: number
  skipped: number
  unresolved: number
  failed: number
  reconciled: boolean
}

export interface ImportMappingGroupDto {
  kind: 'SITE' | 'ASSET' | 'PERSON' | 'PM_PLAN' | 'METER' | string
  sourceKey: string
  sourceExternalId: string | null
  sourceDisplayName: string
  roles: string[]
  occurrenceCount: number
  affectedRecordCount: number
  issueRecordCount: number
  blocking: boolean
  mapped: boolean
  resolution: 'MAP' | 'PRESERVE' | null
  currentTargetType: string | null
  currentTargetId: string | null
  currentTargetLabel: string | null
  suggestedTargetType: string | null
  suggestedTargetId: string | null
  suggestedTargetLabel: string | null
  suggestionReason: string | null
  canAutoApply: boolean
  apiMatchCount: number
  apiExternalId: string | null
  apiLabel: string | null
  apiEmail: string | null
  needsMapping: boolean
}

export interface ImportMappingTargetDto {
  kind: string
  targetType: string
  id: string
  label: string
  secondary: string | null
  parentId: string | null
}

export interface ImportMappingWorkspaceDto {
  groups: ImportMappingGroupDto[]
  targets: ImportMappingTargetDto[]
  totalOccurrences: number
  needsMapping: number
  blockingGroups: number
}

export interface ImportMappingDecisionDto {
  kind: string
  sourceKey: string
  resolution: 'MAP' | 'PRESERVE'
  targetId: string | null
}

export interface ImportMappingApplyDto extends ImportValidationDto {
  mappingsSaved: number
  recordsUpdated: number
}

export interface ImportKindDto {
  runId: string
  sourceSystem: string
  entityType: 'WORK_ORDER' | 'PM_PLAN' | 'ASSET' | 'CMMS-V2' | string | null
  entityTypes: string[]
  cmmsV2DestinationRequired?: boolean
  assetSetupRequired: boolean
}

export interface ImportHistoryDto {
  lastSuccessful: ImportRunDto | null
  items: ImportRunDto[]
}

export interface ImportSiteDto {
  id: string
  organizationId: string
  code: string
  name: string
  timeZone: string
  isActive: boolean
  vesselName?: string | null
  siteType: string
}

export interface CreateImportSiteRequest {
  code: string
  name: string
  timeZone: string
  siteType: 'BASE' | 'VESSEL' | 'OFFSHORE' | 'WAREHOUSE' | 'WORKSHOP'
  vesselName?: string | null
}

export type AssetImportMode = 'NEW' | 'RECONCILE'

export async function getImportHistory(
  sourceSystem: string,
  entityType: string,
  limit = 50
): Promise<ImportHistoryDto> {
  return apiClient.get(`/imports/history?sourceSystem=${sourceSystem}&entityType=${entityType}&limit=${limit}`).then((r) => r.data)
}

export interface DuplicateImportFileError {
  code: 'DUPLICATE_IMPORT_FILE'
  message: string
  previousRun: ImportRunDto
}

export async function uploadImport(
  file: File,
  entityType = 'AUTO',
  sourceSystem = 'LIMBLE',
  force = false,
  targetSiteId?: string | null,
  assetImportMode: AssetImportMode = 'RECONCILE'
): Promise<ImportRunDto> {
  const formData = new FormData()
  formData.append('file', file)
  const params = new URLSearchParams({ entityType, sourceSystem })
  if (force) params.set('force', 'true')
  if (targetSiteId) params.set('targetSiteId', targetSiteId)
  if (entityType === 'ASSET') params.set('assetImportMode', assetImportMode)
  return apiClient.post(`/imports?${params.toString()}`, formData).then((r) => r.data)
}

export async function enrichImport(id: string, sourceSystem = 'LIMBLE'): Promise<{ importRunId: string; snapshots: number }> {
  const source = await apiClient.post<{ importRunId: string; snapshots: number }>(`/imports/${id}/enrich`).then((r) => r.data)
  if (sourceSystem.toUpperCase() === 'CMMS-V2') return source
  const relationships = await apiClient.post<{ importRunId: string; snapshots: number }>(`/imports/${id}/mappings/enrich`).then((r) => r.data)
  return { importRunId: id, snapshots: source.snapshots + relationships.snapshots }
}

export async function reuseImportMappings(id: string): Promise<{ importRunId: string; mappingsApplied: number; recordsUpdated: number }> {
  return apiClient.post(`/imports/${id}/mappings/reuse`).then((r) => r.data)
}

export async function validateImport(id: string, sourceSystem = 'LIMBLE'): Promise<ImportValidationDto> {
  if (sourceSystem.toUpperCase() !== 'CMMS-V2') {
    await reuseImportMappings(id)
    // Unsupported Limble PM schedules are intentionally staged as row-level review items.
    // Do not let the generic validator clear that explicit schedule-review marker before the
    // administrator has chosen a native calendar schedule or opted to import without a trigger.
    const review = await apiClient.get<ImportReviewDto>(`/imports/${id}/review?page=1`).then(r => r.data)
    const scheduleReviewCount = review.records.filter(record => record.errorCode === 'PM_SCHEDULE_REVIEW_REQUIRED').length
    if (scheduleReviewCount > 0) {
      const run = await getImportRun(id)
      return {
        run,
        ready: run.readyRecords,
        reviewRequired: scheduleReviewCount,
        failed: run.failedRecords,
        warnings: Math.max(run.warningRecords, scheduleReviewCount),
      }
    }
  }
  return apiClient.post(`/imports/${id}/validate`).then((r) => r.data)
}

export async function commitImport(id: string): Promise<ImportRunDto> {
  return apiClient.post(`/imports/${id}/commit`).then((r) => r.data)
}

export async function getImportIssues(id: string): Promise<ImportIssueDto[]> {
  return apiClient.get(`/imports/${id}/issues`).then((r) => r.data)
}

export async function getImportReconciliation(id: string): Promise<ImportReconciliationDto> {
  return apiClient.get(`/imports/${id}/reconciliation`).then((r) => r.data)
}

export async function getImportRun(id: string): Promise<ImportRunDto> {
  return apiClient.get(`/imports/${id}`).then((r) => r.data)
}

export async function listImportRuns(page = 1, pageSize = 50): Promise<ImportRunDto[]> {
  return apiClient.get(`/imports?page=${page}&pageSize=${pageSize}`).then((r) => r.data)
}

export async function getImportMappingWorkspace(id: string): Promise<ImportMappingWorkspaceDto> {
  return apiClient.get(`/imports/${id}/mappings/workspace`).then((r) => r.data)
}

export async function enrichImportMappings(id: string): Promise<{ importRunId: string; snapshots: number }> {
  return apiClient.post(`/imports/${id}/mappings/enrich`).then((r) => r.data)
}

export async function applyImportMappings(id: string, mappings: ImportMappingDecisionDto[]): Promise<ImportMappingApplyDto> {
  return apiClient.post(`/imports/${id}/mappings/bulk`, { mappings }).then((r) => r.data)
}

export interface CmmsV2SitePackage {
  siteCode: string; siteName: string; timeZone: string; siteType: string; vesselName: string | null
  warnings: string[]
  sheets: { name: string; rows: Record<string, string | null>[] }[]
}

export const importService = {
  exportCmmsV2Site: (siteId: string): Promise<CmmsV2SitePackage> => apiClient.get(`/imports/cmms-v2/sites/${siteId}/export`).then(r => r.data),
  cmmsV2Destination: (id: string, targetSiteId: string, codePrefix: string): Promise<ImportRunDto> => apiClient.post(`/imports/${id}/cmms-v2-destination`, { targetSiteId, codePrefix }).then(r => r.data),
  review: (id: string, page = 1): Promise<ImportReviewDto> => apiClient.get(`/imports/${id}/review?page=${page}`).then(r => r.data),
  kind: (id: string): Promise<ImportKindDto> => apiClient.get(`/imports/${id}/kind`).then(r => r.data),
  assetSetup: (id: string, targetSiteId: string, assetImportMode: AssetImportMode): Promise<ImportRunDto> => apiClient.post(`/imports/${id}/asset-setup`, { targetSiteId, assetImportMode }).then(r => r.data),
  cancel: (id: string): Promise<{ cancelled: boolean; archiveRemoved: boolean }> => apiClient.post(`/imports/${id}/discard`).then(r => r.data),
  relationships: (id: string, recordId: string, body: { siteId: string; assetId: string | null; assigneeIds: string[] }): Promise<ImportRunDto> => apiClient.put(`/imports/${id}/records/${recordId}/relationships`, body).then(r => r.data),
  pmSchedule: (id: string, recordId: string, body: { intervalValue?: number | null; intervalUnit?: string | null; scheduleStartDate?: string | null; importWithoutSchedule?: boolean }): Promise<{ ready: number; reviewRequired: number; failed: number; warnings: number; message: string }> => apiClient.put(`/imports/${id}/records/${recordId}/pm-schedule`, body).then(r => r.data),
  updateV2Record: (id: string, recordId: string, values: Record<string, string | null>): Promise<ImportValidationDto> => apiClient.put(`/imports/${id}/records/${recordId}/v2`, { values }).then(r => r.data),
  skipRecord: (id: string, recordId: string, reason?: string): Promise<ImportValidationDto> => apiClient.post(`/imports/${id}/records/${recordId}/skip`, { reason: reason || null }).then(r => r.data),
  mappingWorkspace: getImportMappingWorkspace,
  mappingEnrich: enrichImportMappings,
  reuseMappings: reuseImportMappings,
  bulkMappings: applyImportMappings,
  upload: uploadImport,
  enrich: enrichImport,
  validate: validateImport,
  commit: commitImport,
  issues: getImportIssues,
  reconciliation: getImportReconciliation,
  get: getImportRun,
  list: listImportRuns,
  history: getImportHistory,
  sites: (): Promise<ImportSiteDto[]> => apiClient.get('/sites?page=1&pageSize=500').then(r => r.data),
  createSite: (body: CreateImportSiteRequest): Promise<ImportSiteDto> => apiClient.post('/sites', body).then(r => r.data),
}

export interface ImportReviewDto {
  records: { id: string; entityType: string; sourceExternalId: string | null; errorCode: string; errorMessage: string; normalizedPayloadJson: string }[]
  sites: { id: string; name: string }[]
  assets: { id: string; name: string; siteId: string }[]
  people: { id: string; name: string }[]
}
