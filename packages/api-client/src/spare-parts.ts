import { apiClient } from './assets'

export interface SparePartDto {
  id: string
  organizationId: string
  partNumber: string
  name: string
  description?: string
  uom: string
  manufacturer?: string
  manufacturerPartNumber?: string
  verificationStatus: 'UNVERIFIED' | 'VERIFIED' | 'OBSOLETE'
  reorderPoint: number
  reorderQuantity: number
  standardCost?: number
  isSerialized: boolean
  isActive: boolean
}

export interface GetSparePartsParams {
  search?: string
  status?: string
  page?: number
  pageSize?: number
}

export interface InventoryBalanceDto {
  id: string
  partNumber: string
  partName: string
  uom: string
  locationName: string
  quantityOnHand: number
  quantityReserved: number
  odooSnapshotAt: string | null
  source: 'ODOO' | 'LEGACY_UNVERIFIED'
}

export interface GetSparePartsResponse {
  items: SparePartDto[]
  totalCount: number
  page: number
  pageSize: number
}

export const sparePartService = {
  async getBalances(): Promise<InventoryBalanceDto[]> {
    return (await apiClient.get<InventoryBalanceDto[]>('/spare-parts/balances')).data
  },
  async getSpareParts(params: GetSparePartsParams): Promise<GetSparePartsResponse> {
    const { search, status, page = 1, pageSize = 20 } = params
    const response = await apiClient.get<SparePartDto[]>('/spare-parts', {
      params: { search, status, page, pageSize }
    })
    return {
      items: response.data,
      totalCount: response.data.length,
      page,
      pageSize
    }
  },

  async getSparePartById(id: string): Promise<SparePartDto> {
    const response = await apiClient.get<SparePartDto>(`/spare-parts/${id}`)
    return response.data
  }
}
