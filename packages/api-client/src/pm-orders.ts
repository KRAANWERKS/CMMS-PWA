import { apiClient } from './assets'

// ── Domain model: multi-trigger PM plan ──

export type TriggerType = 'TIME' | 'METER'
export type TriggerLogic = 'ALL' | 'ANY'
export type ResetPolicy = 'ON_COMPLETION' | 'FIXED'
export type OverlapPolicy = 'PREVENT'

export interface PmTriggerDto {
  id: string
  pmPlanId: string
  type: TriggerType
  intervalValue: number
  generateAheadValue: number
  generateAheadMode: 'ABSOLUTE' | 'PERCENT'
  generateAheadUnit?: string | null
  intervalUnit: string
  sourceAnchorAt?: string
  sourceStartValue?: number
  sequenceNo: number
  isActive: boolean
  standardRuleId?: string
  standardRuleCode?: string
  standardRuleReviewStatus?: string
  standardSourcePageOrSection?: string
}

export interface PmPlanAssetDto {
  id: string
  pmPlanId: string
  assetId: string
  isActive: boolean
  baselineStatus?: string
  currentCycleNumber: number
  lastCompletedAt?: string
  triggerStates: { pmTriggerId: string; meterId?: string; baselineAt?: string; baselineValue?: number; nextDueAt?: string; nextDueValue?: number; baselineSource: string }[]
}

export interface PmTaskDataBindingDto {
  assetId: string
  meterId?: string
  measurementPointId?: string
}

export type InstructionAssetLinkMode = 'NONE' | 'TRIGGER_ASSET' | 'ASSET'

export interface PmTaskDto {
  id: string
  pmPlanId: string
  referenceKey: string
  parentReferenceKey?: string | null
  description: string
  responseType: string
  assetLinkMode: InstructionAssetLinkMode
  minimumPhotoCount: number
  unit?: string
  minimumValue?: number
  maximumValue?: number
  responseOptions?: string
  sequenceNo: number
  isActive: boolean
  appliesToAllAssets: boolean
  applicableAssetIds: string[]
  linkedAssetIds: string[]
  dataBindings: PmTaskDataBindingDto[]
  expectedValue?: number
  standardRuleId?: string
  standardRuleCode?: string
  standardRuleReviewStatus?: string
  standardSourcePageOrSection?: string
}

export interface PmPlanDto {
  id: string
  code: string
  name: string
  description?: string
  source: string
  triggerLogic: TriggerLogic
  resetPolicy: ResetPolicy
  overlapPolicy: OverlapPolicy
  maintenanceBasis?: string
  referenceText?: string
  defaultAssigneeUserId?: string | null
  defaultAssigneeUserIds?: string[]
  isActive: boolean
  siteId: string
  createdAt: string
  updatedAt: string
  assetCount?: number
  taskCount?: number
  standardProfileId?: string
  standardProfileCode?: string
  standardProfileName?: string
  standardManualReference?: string
  standardManualRevision?: string
  standardReviewStatus?: string
  triggers?: PmTriggerDto[]
  assets?: PmPlanAssetDto[]
  tasks?: PmTaskDto[]
}

export interface PmOccurrenceDto {
  id: string
  pmPlanId: string
  assetId: string
  scheduledAt: string
  status: string
  workOrderId?: string
  completedAt?: string
  assetName?: string | null
  assetCode?: string | null
  workOrderNumber?: string | null
  cycleNumber?: number
}

export interface PmGenerationResult {
  occurrenceId: string
  workOrderId: string
  cycleNumber: number
}

export interface GetPmPlansParams {
  siteId?: string
  code?: string
  isActive?: boolean
  page?: number
  pageSize?: number
}

export interface GetPmPlansResponse {
  items: PmPlanDto[]
  totalCount: number
  page: number
  pageSize: number
}

export interface CreatePmPlanPayload {
  siteId: string
  code?: string
  name: string
  description?: string
  source: string
  triggerLogic: TriggerLogic
  resetPolicy: ResetPolicy
  overlapPolicy: OverlapPolicy
  maintenanceBasis?: string
  referenceText?: string
  defaultAssigneeUserId?: string | null
  defaultAssigneeUserIds?: string[]
  standardProfileId?: string
  triggers: CreatePmTriggerPayload[]
  assetIds: string[]
  triggerAssetBindings?: CreatePmTriggerAssetBindingPayload[]
  tasks: CreatePmTaskPayload[]
}

export interface CreatePmTriggerPayload {
  type: TriggerType
  intervalValue: number
  generateAheadValue: number
  generateAheadMode?: 'ABSOLUTE' | 'PERCENT'
  generateAheadUnit?: string | null
  intervalUnit: string
  sourceAnchorAt?: string
  sourceStartValue?: number
  standardRuleId?: string
}

export interface CreatePmTriggerAssetBindingPayload {
  triggerSequenceNo: number
  assetId: string
  meterId?: string
  baselineAt: string
  baselineValue?: number
  baselineSource?: 'ASSET_CURRENT' | 'MANUAL'
}

export interface CreatePmTaskPayload {
  description: string
  responseType: string
  referenceKey?: string
  parentReferenceKey?: string
  assetLinkMode?: InstructionAssetLinkMode
  minimumPhotoCount?: number
  unit?: string
  minimumValue?: number
  maximumValue?: number
  responseOptions?: string
  appliesToAllAssets?: boolean
  applicableAssetIds?: string[]
  linkedAssetIds?: string[]
  dataBindings?: PmTaskDataBindingDto[]
}

export interface UpdatePmInstructionPayload {
  description: string
  responseType: string
  referenceKey: string
  parentReferenceKey?: string
  assetLinkMode?: InstructionAssetLinkMode
  minimumPhotoCount?: number
  unit?: string
  minimumValue?: number
  maximumValue?: number
  expectedValue?: number
  responseOptions?: string
  appliesToAllAssets?: boolean
  applicableAssetIds?: string[]
  linkedAssetIds?: string[]
  dataBindings?: PmTaskDataBindingDto[]
  standardRuleId?: string
}

export interface PmInstructionReferenceAttachmentDto {
  referenceKey: string
  id: string
  fileName: string
  contentType?: string | null
  fileSize?: number | null
  checksumSha256?: string | null
  contentUrl: string
}

export const pmPlanService = {
  async getPmPlans(params: GetPmPlansParams = {}): Promise<GetPmPlansResponse> {
    const { siteId, code, isActive, page = 1, pageSize = 20 } = params
    const response = await apiClient.get<PmPlanDto[]>('/pm-plans', {
      params: { siteId, code, isActive, page, pageSize }
    })
    return {
      items: response.data,
      totalCount: response.data.length,
      page,
      pageSize
    }
  },

  async getPmPlanById(id: string): Promise<PmPlanDto> {
    const response = await apiClient.get<PmPlanDto>(`/pm-plans/${id}`)
    return response.data
  },

  async createPmPlan(plan: CreatePmPlanPayload): Promise<PmPlanDto> {
    const response = await apiClient.post<PmPlanDto>('/pm-plans', plan)
    return response.data
  },

  async updatePmPlan(id: string, plan: CreatePmPlanPayload): Promise<PmPlanDto> {
    const response = await apiClient.put<PmPlanDto>(`/pm-plans/${id}`, plan)
    return response.data
  },

  async updatePmPlanDetails(id: string, details: { name: string; description?: string }): Promise<void> {
    await apiClient.put(`/pm-plans/${id}/details`, details)
  },

  async updateInstructions(id: string, tasks: UpdatePmInstructionPayload[]): Promise<void> {
    await apiClient.put(`/pm-plans/${id}/instructions`, { tasks })
  },

  async updateSchedule(id: string, payload: { triggerLogic: TriggerLogic; resetPolicy: ResetPolicy; triggers: Array<{ id: string; type: TriggerType; intervalValue: number; generateAheadValue: number; generateAheadMode: 'ABSOLUTE' | 'PERCENT'; generateAheadUnit?: string | null; intervalUnit: string }> }): Promise<void> {
    await apiClient.put(`/pm-plans/${id}/schedule`, payload)
  },

  async updateGenerationBuffer(id: string, triggers: Array<{ triggerId: string; mode: 'ABSOLUTE' | 'PERCENT'; value: number; unit?: string | null }>): Promise<void> {
    await apiClient.put(`/pm-plans/${id}/generation-buffer`, { triggers })
  },

  async updateTriggerAssets(id: string, assetIds: string[]): Promise<void> {
    await apiClient.put(`/pm-plans/${id}/trigger-assets`, { assetIds })
  },

  async setDefaultAssignees(id: string, userIds: string[]): Promise<void> {
    await apiClient.put(`/pm-plans/${id}/default-assignee`, { userIds, userId: userIds[0] || null })
  },

  async setDefaultAssignee(id: string, userId?: string | null): Promise<void> {
    await apiClient.put(`/pm-plans/${id}/default-assignee`, { userIds: userId ? [userId] : [], userId: userId || null })
  },

  async setPlanActive(id: string, isActive: boolean): Promise<void> {
    await apiClient.post(`/pm-plans/${id}/${isActive ? 'activate' : 'suspend'}`)
  },

  async setBaseline(assetId: string, baseline: { triggerId: string; baselineAt: string; value?: number; meterId?: string }): Promise<void> {
    await apiClient.put(`/pm-plans/assets/${assetId}/baseline`, baseline)
  },

  async evaluatePlan(id: string): Promise<void> {
    await apiClient.post(`/pm-plans/${id}/evaluate`)
  },

  async generateNow(planId: string, planAssetId: string): Promise<PmGenerationResult> {
    const response = await apiClient.post<PmGenerationResult>(`/pm-plans/${planId}/assets/${planAssetId}/generate-now`)
    return response.data
  },

  async getOccurrences(planId: string): Promise<PmOccurrenceDto[]> {
    const response = await apiClient.get<PmOccurrenceDto[]>(`/pm-plans/${planId}/occurrences`)
    return response.data
  },

  async getInstructionReferences(planId: string): Promise<PmInstructionReferenceAttachmentDto[]> {
    return (await apiClient.get<PmInstructionReferenceAttachmentDto[]>(`/pm-plans/${planId}/instruction-references`)).data
  },

  async uploadInstructionReference(planId: string, referenceKey: string, file: File): Promise<PmInstructionReferenceAttachmentDto> {
    const body = new FormData()
    body.append('file', file)
    return (await apiClient.post<PmInstructionReferenceAttachmentDto>(`/pm-plans/${planId}/instruction-references/${referenceKey}`, body)).data
  },

  async deleteInstructionReference(planId: string, referenceKey: string, attachmentId: string): Promise<void> {
    await apiClient.delete(`/pm-plans/${planId}/instruction-references/${referenceKey}/${attachmentId}`)
  }
}
