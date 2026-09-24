import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { authService, siteService, type SiteDto } from '@cmms/api-client'

interface TechnicianSiteContextValue {
  currentSiteId: string | null
  currentSite: SiteDto | null
  permittedSites: SiteDto[]
  canSwitchSite: boolean
  requiresSelection: boolean
  loading: boolean
  selectSite: (siteId: string) => void
}

const TechnicianSiteContext = createContext<TechnicianSiteContextValue | null>(null)

export function TechnicianSiteProvider({ children }: { children: ReactNode }) {
  const user = useQuery({ queryKey: ['current-user'], queryFn: authService.me, retry: false, staleTime: 60_000 })
  const sites = useQuery({ queryKey: ['sites'], queryFn: siteService.getSites, staleTime: 5 * 60_000 })
  const [selectedSiteId, setSelectedSiteId] = useState<string | null>(null)

  const permittedIds = useMemo(() => new Set(user.data?.sites ?? []), [user.data?.sites])
  const permittedSites = useMemo(
    () => (sites.data ?? []).filter(site => permittedIds.has(site.id)),
    [permittedIds, sites.data],
  )
  const storageKey = user.data ? `cmms:technician-site:${user.data.id}` : null

  useEffect(() => {
    if (!user.data || sites.isLoading) return

    if (permittedSites.length === 1) {
      setSelectedSiteId(permittedSites[0].id)
      return
    }

    if (permittedSites.length === 0) {
      setSelectedSiteId(null)
      if (storageKey) window.localStorage.removeItem(storageKey)
      return
    }

    const stored = storageKey ? window.localStorage.getItem(storageKey) : null
    if (stored && permittedSites.some(site => site.id === stored)) {
      setSelectedSiteId(stored)
      return
    }

    if (storageKey) window.localStorage.removeItem(storageKey)
    setSelectedSiteId(null)
  }, [permittedSites, sites.isLoading, storageKey, user.data])

  const selectSite = (siteId: string) => {
    if (!permittedSites.some(site => site.id === siteId)) return
    setSelectedSiteId(siteId)
    if (storageKey) window.localStorage.setItem(storageKey, siteId)
  }

  const currentSite = permittedSites.find(site => site.id === selectedSiteId) ?? null
  const value = useMemo<TechnicianSiteContextValue>(() => ({
    currentSiteId: currentSite?.id ?? null,
    currentSite,
    permittedSites,
    canSwitchSite: permittedSites.length > 1,
    requiresSelection: permittedSites.length > 1 && !currentSite,
    loading: user.isLoading || sites.isLoading,
    selectSite,
  }), [currentSite, permittedSites, sites.isLoading, user.isLoading])

  return <TechnicianSiteContext.Provider value={value}>{children}</TechnicianSiteContext.Provider>
}

export function useTechnicianSite() {
  const context = useContext(TechnicianSiteContext)
  if (!context) throw new Error('useTechnicianSite must be used inside TechnicianSiteProvider')
  return context
}
