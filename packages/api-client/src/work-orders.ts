export interface WorkOrderMeasurementEvidence {
  id: string
  workOrderTaskId?: string | null
  taskResponseVersion?: number | null
  supersedesReadingId?: string | null
  kind: 'CONDITION' | 'METER'
  assetId: string
  targetId: string
  value?: number | null
  unit?: string | null
  recordedAt: string
  recordedBy?: string | null
  source?: string | null
  note?: string | null
}

import { apiClient } from './assets'

export type TaskAttachmentDto = CapturedMediaAttachmentDto

export interface CapturedMediaAttachmentDto {
  id: string
  fileName: string
  contentType?: string | null
  fileSize?: number | null
  checksumSha256?: string | null
  contentUrl: string
}

export interface CapturedLimbleActivityDto {
  id: string
  sourceTaskId: number
  sourceCommentId: number
  sourceUserId?: number | null
  actorDisplayName?: string | null
  occurredAt?: string | null
  message: string
  attachments: CapturedMediaAttachmentDto[]
}

export interface InstructionMediaDto {
  taskId: string
  sourceInstructionId?: number | null
  attachments: CapturedMediaAttachmentDto[]
}

export interface WorkOrderImportEvidenceDto {
  rawSource?: Record<string, string | null>
  sourceSystem: string
  sourceExternalId: string
  sourceChecksum?: string | null
  sourceStatus?: string | null
  sourceType?: string | null
  requestedBy?: string | null
  assignedTo?: string | null
  completedBy?: string | null
  completionNotes?: string | null
  comments?: string | null
  actualHours?: string | null
  laborCost?: string | null
  partsCost?: string | null
  downtime?: string | null
  pmExternalId?: string | null
  pmName?: string | null
  meterExternalId?: string | null
  meterName?: string | null
  meterTriggerValue?: string | null
  locationName?: string | null
  assetName?: string | null
  capturedActivities?: CapturedLimbleActivityDto[]
  instructionMedia?: InstructionMediaDto[]
}

export interface WorkOrderPmOriginDto {
  occurrenceId: string
  pmPlanId: string
  pmPlanName: string
  cycleNumber: number
}

export interface WorkOrderHistoryEntryDto {
  id: string
  comment: string
  createdAt: string
  authorId?: string | null
  authorDisplayName?: string | null
  kind?: string | null
  attachments?: CapturedMediaAttachmentDto[]
}

export interface CreateWorkRequest {
  siteId: string
  requestedBy: string
  assetId?: string
  title: string
  description?: string
  priority: string
  dueAt?: string
}

export interface WorkOrderDto {
  id: string
  number: string
  status: string
  priority: string
  workType: string
  title: string
  scheduledStart?: string | null
  scheduledEnd?: string | null
  dueDate?: string | null
  actualStart?: string | null
  source?: string
  latestActivity?: { at: string; label: string } | null
  siteId: string
  assetId: string | null
  assetName?: string | null
  failureCodeId: string | null
  totalLaborHours: number
  description?: string
  version: number
  allowedTransitions: string[]
  verifiedByUserId?: string | null
  closedByUserId?: string | null
  closureReason?: string | null
  assignees: { userId: string; displayName: string }[]
  measurementEvidence?: WorkOrderMeasurementEvidence[]
  tasks: { measurementRecords?: WorkOrderMeasurementEvidence[]; id: string; description: string; status: string; responseType: 'CHECKBOX' | 'NUMBER' | 'TEXT' | 'SELECT' | 'DATE' | 'PHOTO' | 'INFORMATION' | 'GROUP'; assetLinkMode: 'NONE' | 'TRIGGER_ASSET' | 'ASSET'; minimumPhotoCount: number; instructionReferenceKey?: string | null; parentInstructionReferenceKey?: string | null; unit?: string | null; minimumValue?: number | null; maximumValue?: number | null; responseValue?: string | null; sourceInstructionId?: number | null; parentSourceInstructionId?: number | null; sourceInstructionType?: number | null; responseOptions?: string | null; linkedAsset?: { id: string; assetCode: string; name: string } | null; linkedMeter?: { id: string; name: string; unit: string } | null; linkedMeasurementPoint?: { id: string; name: string; measurementType: string; unit: string; normalMinimum?: number | null; normalMaximum?: number | null } | null; attachments: CapturedMediaAttachmentDto[]; referenceAttachments: CapturedMediaAttachmentDto[] }[]
  materials: { id: string; externalKey: string; requestType: string; state: string; sourceUpdatedAt: string }[]
  labor: { id: string; hours: number; workedAt: string; notes?: string }[]
  comments: { id: string; comment: string; createdAt: string }[]
  usage: { sparePartId?: string; partNumber?: string; quantity: number }[]
}

export interface CreateWorkOrderRequest { siteId: string; assetId: string | null; title: string; description?: string; priority: string; scheduledEnd?: string; assigneeIds?: string[]; instructions?: InstructionDefinition[]; saveAsTemplateName?: string }
export interface GetWorkOrdersParams {
  view?: string
  search?: string
  siteId?: string
  assetId?: string
  status?: string
  priority?: string
  assigneeId?: string
  overdue?: boolean
  page?: number
  pageSize?: number
  sortBy?: 'number' | 'title' | 'status' | 'priority' | 'scheduledEnd'
  sortDirection?: 'asc' | 'desc'
}
export interface GetWorkOrdersResponse { items: WorkOrderDto[]; totalCount: number; openCount: number; totalLaborHours: number; page: number; pageSize: number }

export interface InstructionDefinition { description: string; responseType: 'CHECKBOX' | 'NUMBER' | 'TEXT' | 'SELECT' | 'DATE' | 'PHOTO' | 'INFORMATION'; unit?: string; minimumValue?: number; maximumValue?: number; responseOptions?: string; minimumPhotoCount?: number; assetLinkMode?: 'NONE' | 'TRIGGER_ASSET' }
export interface WorkOrderDefinition { assetId: string | null; title: string; description?: string; priority: string; assigneeIds: string[]; instructions: InstructionDefinition[]; dueOffsetDays?: number | null }
export interface WorkOrderTemplate { id: string; siteId: string; name: string; definition: WorkOrderDefinition }

export type ConditionRuleScope = 'ASSET' | 'ASSET_CATEGORY' | 'SITE'
export type ConditionRuleMode = 'LEGACY' | 'BANDED' | 'FRESHNESS_ONLY'
export interface ConditionRule {
  id: string
  siteId: string
  assetId?: string | null
  scopeType: ConditionRuleScope
  scopeId: string
  conditionPointKey?: string | null
  instructionDescription: string
  unit: string
  minimumValue?: number | null
  maximumValue?: number | null
  breachState: string
  ruleMode: ConditionRuleMode
  warningMinimumValue?: number | null
  warningMaximumValue?: number | null
  criticalMinimumValue?: number | null
  criticalMaximumValue?: number | null
  maxAgeDays: number
}
export interface ConditionRuleInput {
  instructionDescription: string
  unit?: string
  minimumValue: number | null
  maximumValue: number | null
  breachState: string
  maxAgeDays: number
  scopeType: ConditionRuleScope
  conditionPointKey?: string
  ruleMode?: ConditionRuleMode
  warningMinimumValue?: number | null
  warningMaximumValue?: number | null
  criticalMinimumValue?: number | null
  criticalMaximumValue?: number | null
}
export interface ConditionAssessment {
  state: string
  incomplete: boolean
  evaluatedAt: string
  basis: string
  availableScopes: ConditionRuleScope[]
  assetCategoryId?: string | null
  assetCategoryName?: string | null
  drivers: {
    rule: ConditionRule
    state: string
    scope: { type: ConditionRuleScope; id: string; label: string; inherited: boolean }
    evidence: { workOrderId: string; number: string; completedAt: string; taskId: string; responseValue: string | null } | null
  }[]
}
export interface BulkAcceptResult {
  requested: number
  verified: number
  closed: number
  skippedCount: number
  skipped: { id: string; reason: string }[]
}

export const workOrderService = {
  async getTemplates(siteId: string): Promise<WorkOrderTemplate[]> { return (await apiClient.get('/work-orders/templates', { params: { siteId } })).data },
  async saveTemplate(siteId: string, name: string, definition: WorkOrderDefinition): Promise<{ id: string }> { return (await apiClient.post('/work-orders/templates', { siteId, name, definition })).data },
  async replaceAssignees(id: string, userIds: string[], version: number): Promise<void> { await apiClient.put(`/work-orders/${id}/assignees`, { userIds, version }) },
  async getCondition(assetId: string): Promise<ConditionAssessment> { return (await apiClient.get(`/assets/${assetId}/condition`)).data },
  async addConditionRule(assetId: string, rule: ConditionRuleInput): Promise<void> { await apiClient.post(`/assets/${assetId}/condition/rules`, rule) },
  async disableConditionRule(assetId: string, ruleId: string): Promise<void> { await apiClient.delete(`/assets/${assetId}/condition/rules/${ruleId}`) },
  async bulkAccept(workOrderIds: string[], mode: 'VERIFY' | 'VERIFY_AND_CLOSE', reason?: string): Promise<BulkAcceptResult> {
    return (await apiClient.post<BulkAcceptResult>('/work-orders/bulk/accept', { workOrderIds, mode, reason })).data
  },
  async getWorkOrders(params: GetWorkOrdersParams = {}): Promise<GetWorkOrdersResponse> {
    const {
      siteId,
      assetId,
      status,
      priority,
      assigneeId,
      overdue,
      view,
      search,
      page = 1,
      pageSize = 25,
      sortBy,
      sortDirection = 'desc',
    } = params
    const requestPage = async (pageNumber: number) => (await apiClient.get<GetWorkOrdersResponse>('/work-orders/query', {
      params: { siteId, assetId, status, priority, assigneeId, overdue, view, search, page: pageNumber, pageSize, sortBy, sortDirection }
    })).data

    const first = await requestPage(page)
    if (page !== 1 || first.totalCount <= first.items.length || first.items.length >= pageSize) return first

    const pages = Math.ceil(first.totalCount / pageSize)
    const remaining = await Promise.all(Array.from({ length: Math.max(0, pages - 1) }, (_, index) => requestPage(index + 2)))
    return {
      ...first,
      items: [...first.items, ...remaining.flatMap(result => result.items)],
    }
  },
  async getWorkOrderById(id: string): Promise<WorkOrderDto> { return (await apiClient.get<WorkOrderDto>(`/work-orders/${id}`)).data },
  async getPmOrigin(id: string): Promise<WorkOrderPmOriginDto | null> {
    const response = await apiClient.get<WorkOrderPmOriginDto>(`/work-orders/${id}/pm-origin`, { validateStatus: status => status === 200 || status === 204 })
    return response.status === 204 ? null : response.data
  },
  async getImportEvidence(id: string): Promise<WorkOrderImportEvidenceDto | null> {
    const response = await apiClient.get<WorkOrderImportEvidenceDto>(`/work-orders/${id}/import-evidence`, { validateStatus: (status) => status === 200 || status === 204 })
    return response.status === 204 ? null : response.data
  },
  async createWorkOrder(request: CreateWorkOrderRequest): Promise<{ id: string }> { return (await apiClient.post<{ id: string }>('/work-orders', request)).data },
  async assign(id: string, userId: string): Promise<void> { await apiClient.post(`/work-orders/${id}/assign`, { userId }) },
  async setTaskCompleted(id: string, taskId: string, completed: boolean, responseValue?: string): Promise<void> { await apiClient.post(`/work-orders/${id}/tasks/${taskId}`, { completed, responseValue }) },
  async getTaskAttachments(id: string, taskId: string): Promise<CapturedMediaAttachmentDto[]> {
    return (await apiClient.get<CapturedMediaAttachmentDto[]>(`/work-orders/${id}/tasks/${taskId}/attachments`)).data
  },
  async uploadTaskPhoto(id: string, taskId: string, file: File): Promise<CapturedMediaAttachmentDto> {
    const body = new FormData()
    body.append('file', file)
    return (await apiClient.post<CapturedMediaAttachmentDto>(`/work-orders/${id}/tasks/${taskId}/attachments`, body)).data
  },
  async changeStatus(id: string, newStatus: string): Promise<void> { await apiClient.post(`/work-orders/${id}/status`, { newStatus }) },
  async recordLabor(id: string, hours: number, workedAt: string, note?: string): Promise<void> { await apiClient.post(`/work-orders/${id}/labor`, { hours, workedAt, note }) },
  async complete(id: string, completionNotes: string, allowPendingInstructions = false): Promise<void> { await apiClient.post(`/work-orders/${id}/complete`, { completionNotes, allowPendingInstructions }) },
  async getHistory(id: string): Promise<WorkOrderHistoryEntryDto[]> { return (await apiClient.get<WorkOrderHistoryEntryDto[]>(`/work-orders/${id}/history`)).data },
  async postComment(id: string, comment: string, images: File[] = []): Promise<void> {
    const form = new FormData()
    form.append('comment', comment)
    images.forEach(image => form.append('images', image))
    await apiClient.post('/work-orders/' + id + '/comments', form)
  },
  async uploadTaskAttachment(workOrderId: string, taskId: string, file: Blob, fileName: string): Promise<void> {
    const form = new FormData()
    form.append('file', file, fileName)
    // Let the browser set the multipart boundary.
    await apiClient.post(`/work-orders/${workOrderId}/tasks/${taskId}/attachments`, form, { headers: { 'Content-Type': undefined } })
  },
  async getAttachmentBlob(attachmentId: string): Promise<Blob> {
    return (await apiClient.get<Blob>(`/attachments/${attachmentId}/content`, { responseType: 'blob', transformResponse: [data => data] })).data
  },
  async createWorkRequest(request: CreateWorkRequest): Promise<{ id: string }> { return (await apiClient.post<{ id: string }>('/work-requests', request)).data },
}
