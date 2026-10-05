// Dev-only mock backend. Installed from main.tsx when `VITE_BYPASS_AUTH=true pnpm dev`.
// State is in memory: reload the page to reset it.
import { apiClient, type AssetDto, type SparePartDto, type WorkOrderDto } from '@cmms/api-client'
import type { CurrentUser, SiteDto } from '@cmms/api-client'
import { mockParts } from '../parts/mockParts'

const ORG = 'mock-org'
const user: CurrentUser = { id: 'mock-user', displayName: 'Budi Santoso', roles: ['TECHNICIAN'], sites: ['site-vessel', 'site-yard'] }

const sites: SiteDto[] = [
  { id: 'site-vessel', organizationId: ORG, organizationName: 'Kraanwerks', name: 'MV Kraan Star', code: 'KST', timeZone: 'Asia/Jakarta', isActive: true, vesselName: 'MV Kraan Star', imoNumber: '9876543', flagState: 'ID', siteType: 'VESSEL', assetCount: 6, openWorkOrderCount: 6, overdueWorkOrderCount: 1, pmPlanCount: 3 },
  { id: 'site-yard', organizationId: ORG, organizationName: 'Kraanwerks', name: 'Batam Yard Workshop', code: 'BTM', timeZone: 'Asia/Jakarta', isActive: true, siteType: 'WORKSHOP', assetCount: 4, openWorkOrderCount: 2, overdueWorkOrderCount: 0, pmPlanCount: 1 },
]

let meterSeq = 0
const meter = (assetId: string, code: string, name: string, unit: string, currentReading: number) =>
  ({ id: `mock-meter-${++meterSeq}`, assetId, code, name, meterType: 'USAGE', unit, currentReading, readingAt: new Date().toISOString() })

function asset(id: string, siteId: string, assetCode: string, name: string, extra: Partial<AssetDto> = {}): AssetDto {
  return { id, organizationId: ORG, siteId, assetCode, name, status: 'ACTIVE', criticality: 2, ...extra }
}

const assets: AssetDto[] = [
  asset('a1', 'site-vessel', 'KST-ME-01', 'Main Engine Port', { manufacturer: 'Caterpillar', model: '3516C', meters: [meter('a1', 'RH', 'Running hours', 'h', 12450)] }),
  asset('a2', 'site-vessel', 'KST-ME-02', 'Main Engine Starboard', { manufacturer: 'Caterpillar', model: '3516C', meters: [meter('a2', 'RH', 'Running hours', 'h', 12310)] }),
  asset('a3', 'site-vessel', 'KST-GEN-01', 'Auxiliary Generator #1', { manufacturer: 'Cummins', model: 'QSM11', meters: [meter('a3', 'RH', 'Running hours', 'h', 8120)] }),
  asset('a4', 'site-vessel', 'KST-HYD-01', 'Deck Crane Hydraulic Power Pack', { manufacturer: 'Parker', status: 'MAINTENANCE', meters: [meter('a4', 'RH', 'Running hours', 'h', 3320)] }),
  asset('a5', 'site-vessel', 'KST-PMP-01', 'Ballast Pump #1', { manufacturer: 'Grundfos', model: 'NK 100-250' }),
  asset('a6', 'site-vessel', 'KST-STR-01', 'Steering Gear', { manufacturer: 'Rolls-Royce', status: 'INACTIVE' }),
  asset('a7', 'site-yard', 'BTM-CRN-01', 'Overhead Crane 10T', { manufacturer: 'Konecranes', meters: [meter('a7', 'LC', 'Lift cycles', 'cycles', 48210)] }),
  asset('a8', 'site-yard', 'BTM-CMP-01', 'Air Compressor 15 kW', { manufacturer: 'Atlas Copco', model: 'GA15', meters: [meter('a8', 'RH', 'Running hours', 'h', 6540)] }),
  asset('a9', 'site-yard', 'BTM-WLD-01', 'Welding Machine MIG 500', { manufacturer: 'Lincoln Electric' }),
  asset('a10', 'site-yard', 'BTM-LTH-01', 'Lathe Machine', { manufacturer: 'Colchester', status: 'MAINTENANCE' }),
]

const day = 86_400_000
const ago = (days: number) => new Date(Date.now() - days * day).toISOString()
const task = (n: number, description: string, responseType: WorkOrderDto['tasks'][number]['responseType'], extra: Partial<WorkOrderDto['tasks'][number]> = {}) =>
  ({ id: `t${n}`, description, status: 'OPEN', responseType, ...extra })

function wo(n: number, siteId: string, assetId: string, title: string, status: string, priority: string, workType: string, tasks: WorkOrderDto['tasks'], extra: Partial<WorkOrderDto> = {}): WorkOrderDto {
  const a = assets.find(item => item.id === assetId)!
  return {
    id: `wo${n}`, number: `WO-${1000 + n}`, status, priority, workType, title, siteId, assetId, assetName: a.name,
    failureCodeId: null, totalLaborHours: 0, version: 1, allowedTransitions: [], tasks, materials: [], labor: [], comments: [], usage: [],
    assignees: [{ userId: user.id, displayName: user.displayName }], scheduledEnd: ago(-3), ...extra,
  }
}

const workOrders: WorkOrderDto[] = [
  wo(1, 'site-vessel', 'a1', 'Main engine 250h service', 'IN_PROGRESS', 'HIGH', 'PREVENTIVE', [
    task(1, 'Isolate and tag out the engine', 'CHECKBOX', { status: 'COMPLETED' }),
    task(2, 'Record lube oil pressure', 'NUMBER', { unit: 'bar', minimumValue: 3, maximumValue: 6 }),
    task(3, 'Replace lube oil filter', 'CHECKBOX'),
    task(4, 'Oil condition', 'SELECT', { responseOptions: 'Clean, Dark, Contaminated' }),
    task(5, 'Record running hours', 'NUMBER', { unit: 'h', linkedMeter: { id: 'mock-meter-1', name: 'Running hours', unit: 'h' } }),
    task(6, 'Findings and remarks', 'TEXT'),
  ], { description: 'Scheduled 250 hour service for the port main engine.', actualStart: ago(0.1), usage: [{ partNumber: 'FLT-OIL-LF3000', quantity: 2 }] }),
  wo(2, 'site-vessel', 'a4', 'Hydraulic leak at crane power pack', 'OPEN', 'CRITICAL', 'CORRECTIVE', [
    task(1, 'Inspect hoses and fittings for leaks', 'CHECKBOX'),
    task(2, 'Replace damaged hose', 'CHECKBOX'),
    task(3, 'Top up hydraulic oil', 'CHECKBOX'),
  ], { description: 'Oil leak reported by deck crew near the pump outlet.', scheduledEnd: ago(1) }),
  wo(3, 'site-vessel', 'a3', 'Generator weekly inspection', 'ASSIGNED', 'MEDIUM', 'INSPECTION', [
    task(1, 'Check coolant level', 'CHECKBOX'),
    task(2, 'Record exhaust temperature', 'NUMBER', { unit: '°C', minimumValue: 200, maximumValue: 480 }),
    task(3, 'Next inspection date', 'DATE'),
  ]),
  wo(4, 'site-vessel', 'a5', 'Ballast pump seal replacement', 'ON_HOLD', 'MEDIUM', 'CORRECTIVE', [
    task(1, 'Drain and isolate pump', 'CHECKBOX', { status: 'COMPLETED' }),
    task(2, 'Replace mechanical seal', 'CHECKBOX'),
  ], { description: 'Waiting on mechanical seal 30 mm (PMP-SEAL-MECH-30).', actualStart: ago(2) }),
  wo(5, 'site-vessel', 'a2', 'Starboard engine air filter check', 'OPEN', 'LOW', 'PREVENTIVE', [
    task(1, 'Inspect primary air filter element', 'CHECKBOX'),
    task(2, 'Findings', 'TEXT'),
  ]),
  wo(6, 'site-vessel', 'a6', 'Steering gear function test', 'OPEN', 'HIGH', 'INSPECTION', [
    task(1, 'Operate rudder hard-over to hard-over', 'CHECKBOX'),
    task(2, 'Record time port to starboard', 'NUMBER', { unit: 's', maximumValue: 28 }),
  ]),
  wo(7, 'site-vessel', 'a1', 'Main engine valve clearance check', 'COMPLETED', 'MEDIUM', 'PREVENTIVE', [task(1, 'Check valve clearances', 'CHECKBOX', { status: 'COMPLETED' })], { totalLaborHours: 3.5, actualStart: ago(9) }),
  wo(8, 'site-vessel', 'a3', 'Generator battery replacement', 'COMPLETED', 'LOW', 'CORRECTIVE', [task(1, 'Replace starter battery', 'CHECKBOX', { status: 'COMPLETED' })], { totalLaborHours: 1.25, actualStart: ago(14) }),
  wo(9, 'site-yard', 'a7', 'Overhead crane brake inspection', 'IN_PROGRESS', 'HIGH', 'PREVENTIVE', [
    task(1, 'Measure brake pad thickness', 'NUMBER', { unit: 'mm', minimumValue: 4 }),
    task(2, 'Check hoist rope for wear', 'CHECKBOX'),
  ], { actualStart: ago(0.05) }),
  wo(10, 'site-yard', 'a8', 'Compressor oil and filter change', 'OPEN', 'MEDIUM', 'PREVENTIVE', [
    task(1, 'Drain oil', 'CHECKBOX'), task(2, 'Replace oil filter', 'CHECKBOX'), task(3, 'Refill with oil', 'CHECKBOX'),
  ]),
  wo(11, 'site-yard', 'a10', 'Lathe spindle bearing noise', 'COMPLETED', 'MEDIUM', 'CORRECTIVE', [task(1, 'Replace spindle bearing', 'CHECKBOX', { status: 'COMPLETED' })], { totalLaborHours: 5 }),
]

const transitionsFor = (status: string) =>
  status === 'OPEN' || status === 'ASSIGNED' ? ['IN_PROGRESS']
    : status === 'IN_PROGRESS' ? ['COMPLETED', 'ON_HOLD']
    : status === 'ON_HOLD' ? ['IN_PROGRESS'] : []
const syncTransitions = (item: WorkOrderDto) => { item.allowedTransitions = transitionsFor(item.status) }
workOrders.forEach(syncTransitions)

interface MockRequestConfig { method?: string; url?: string; params?: Record<string, unknown>; data?: unknown }

class HttpError extends Error { constructor(public status: number, message: string) { super(message) } }

function handle(method: string, url: string, params: Record<string, unknown>, body: Record<string, unknown>): unknown {
  let m: RegExpMatchArray | null
  if (method === 'get') {
    if (url === '/auth/me') return user
    if (url === '/sites') return sites
    if (url === '/assets') {
      const search = String(params.search ?? '').toLowerCase()
      return assets.filter(a => (!params.siteId || a.siteId === params.siteId) && (!search || `${a.name} ${a.assetCode}`.toLowerCase().includes(search)))
    }
    if (url === '/spare-parts') return mockParts satisfies SparePartDto[]
    if (url === '/spare-parts/balances') return []
    if (url === '/work-orders/query') {
      const page = Number(params.page ?? 1)
      const pageSize = Number(params.pageSize ?? 25)
      const filtered = workOrders.filter(w =>
        (!params.siteId || w.siteId === params.siteId) &&
        (params.view === 'completed' ? w.status === 'COMPLETED' : params.view === 'open' ? w.status !== 'COMPLETED' : true))
      return {
        items: filtered.slice((page - 1) * pageSize, page * pageSize), totalCount: filtered.length,
        openCount: filtered.filter(w => w.status !== 'COMPLETED').length,
        totalLaborHours: filtered.reduce((sum, w) => sum + w.totalLaborHours, 0), page, pageSize,
      }
    }
    if ((m = url.match(/^\/work-orders\/([^/]+)$/))) {
      const found = workOrders.find(w => w.id === m![1])
      if (!found) throw new HttpError(404, 'Work order not found')
      return found
    }
    throw new HttpError(404, `No mock for GET ${url}`)
  }

  if (method === 'post') {
    if (url === '/auth/logout' || url === '/auth/login') return null
    if ((m = url.match(/^\/assets\/([^/]+)\/meter-readings$/))) {
      const target = assets.find(a => a.id === m![1])?.meters?.find(x => x.id === body.meterId)
      if (target) { target.currentReading = Number(body.value); target.readingAt = new Date().toISOString() }
      return null
    }
    if ((m = url.match(/^\/work-orders\/([^/]+)\/(tasks\/([^/]+)|status|labor|complete)$/))) {
      const item = workOrders.find(w => w.id === m![1])
      if (!item) throw new HttpError(404, 'Work order not found')
      if (m[3]) {
        const t = item.tasks.find(x => x.id === m![3])!
        t.status = body.completed ? 'COMPLETED' : 'OPEN'
        if (body.responseValue !== undefined) t.responseValue = String(body.responseValue)
        if (body.completed && t.linkedMeter) {
          const linked = assets.find(a => a.id === item.assetId)?.meters?.find(x => x.id === t.linkedMeter!.id)
          if (linked && body.responseValue) linked.currentReading = Number(body.responseValue)
        }
      } else if (m[2] === 'status') {
        item.status = String(body.newStatus)
        if (item.status === 'IN_PROGRESS' && !item.actualStart) item.actualStart = new Date().toISOString()
      } else if (m[2] === 'labor') {
        item.labor.push({ id: `l${item.labor.length + 1}`, hours: Number(body.hours), workedAt: String(body.workedAt), notes: body.note as string | undefined })
        item.totalLaborHours = Math.round((item.totalLaborHours + Number(body.hours)) * 100) / 100
      } else {
        item.status = 'COMPLETED'
      }
      item.version++
      syncTransitions(item)
      return null
    }
  }
  throw new HttpError(404, `No mock for ${method.toUpperCase()} ${url}`)
}

export function installMockApi() {
  apiClient.defaults.adapter = async (config: MockRequestConfig) => {
    await new Promise(resolve => setTimeout(resolve, 150))
    const body = typeof config.data === 'string' && config.data ? JSON.parse(config.data) : (config.data ?? {})
    const base = { status: 200, statusText: 'OK', headers: {}, config: config as never }
    try {
      const data = handle((config.method ?? 'get').toLowerCase(), config.url ?? '', config.params ?? {}, body)
      return { ...base, data: data === null ? '' : structuredClone(data) }
    } catch (error) {
      if (!(error instanceof HttpError)) throw error
      // Shaped so axios.isAxiosError() / getApiError() recognise it
      throw Object.assign(new Error(error.message), { isAxiosError: true, config, response: { ...base, status: error.status, statusText: 'Error', data: { detail: error.message } } })
    }
  }
}
