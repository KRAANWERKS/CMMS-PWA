export interface BaseEntity {
  id: string;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  updatedBy?: string;
}

export interface Asset extends BaseEntity {
  name: string;
  code: string;
  description?: string;
  siteId: string;
  parentId?: string;
  categoryId: string;
  status: AssetStatus;
  meterReading?: number;
  meterUnit?: string;
}

export enum AssetStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  MAINTENANCE = 'MAINTENANCE',
  DECOMMISSIONED = 'DECOMMISSIONED'
}

export interface AssetCategory extends BaseEntity {
  name: string;
  description?: string;
}

export interface WorkOrder extends BaseEntity {
  title: string;
  description?: string;
  siteId: string;
  assetId?: string;
  assigneeId?: string;
  status: WorkOrderStatus;
  type: WorkOrderType;
  priority: Priority;
  scheduledDate?: string;
  completedDate?: string;
  laborHours?: number;
}

export enum WorkOrderStatus {
  DRAFT = 'DRAFT',
  OPEN = 'OPEN',
  ASSIGNED = 'ASSIGNED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  VERIFIED = 'VERIFIED',
  CLOSED = 'CLOSED',
  CANCELLED = 'CANCELLED'
}

export enum WorkOrderType {
  CORRECTIVE = 'CORRECTIVE',
  PREVENTIVE = 'PREVENTIVE'
}

export interface WorkRequest extends BaseEntity {
  title: string;
  description?: string;
  siteId: string;
  status: WorkRequestStatus;
  priority: Priority;
  submittedById: string;
  approvedById?: string;
}

export enum WorkRequestStatus {
  DRAFT = 'DRAFT',
  SUBMITTED = 'SUBMITTED',
  REVIEWED = 'REVIEWED',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED'
}

export interface PmPlan extends BaseEntity {
  name: string;
  description?: string;
  frequency: PmFrequency;
  frequencyValue: number;
  assets: PmPlanAsset[];
  tasks: PmTask[];
}

export enum PmFrequency {
  DAILY = 'DAILY',
  WEEKLY = 'WEEKLY',
  MONTHLY = 'MONTHLY',
  QUARTERLY = 'QUARTERLY',
  ANNUAL = 'ANNUAL',
  METER = 'METER'
}

export interface PmPlanAsset {
  id: string;
  pmPlanId: string;
  assetId: string;
}

export interface PmTask {
  id: string;
  pmPlanId: string;
  name: string;
  description?: string;
  sortOrder: number;
}

export interface SparePart extends BaseEntity {
  name: string;
  code: string;
  description?: string;
  unit: string;
  minStock: number;
  reorderPoint: number;
  currentStock: number;
  locationId: string;
}

export interface MeterReading extends BaseEntity {
  assetId: string;
  value: number;
  unit: string;
  readingDate: string;
  recordedById: string;
}

export interface IntegrationSyncLog extends BaseEntity {
  integration: 'LIMBLE' | 'ODOO';
  entityType: string;
  syncType: 'FULL' | 'DELTA';
  status: 'SUCCESS' | 'PARTIAL' | 'FAILED';
  recordCount: number;
  errorMessage?: string;
  lastSyncedAt: string;
}

export interface User extends BaseEntity {
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  roles: Role[];
}

export interface Role extends BaseEntity {
  name: string;
  permissions: Permission[];
}

export interface Permission {
  id: string;
  name: string;
  resource: string;
  action: string;
}

export interface Site extends BaseEntity {
  name: string;
  code: string;
  regionId?: string;
  vesselName?: string;
}

export interface Region extends BaseEntity {
  code: string;
  name: string;
}

export type Priority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface PaginatedResponse<T> {
  items: T[];
  totalCount: number;
  pageSize: number;
  currentPage: number;
}
