import { useEffect, useMemo, useState } from 'react'

import { SiteHeader } from './components/SiteHeader'
import { SidebarNav, type Page } from './components/SidebarNav'
import { PortfolioPage } from './pages/PortfolioPage'
import { McpPage } from './pages/McpPage'
import { DashboardPage } from './pages/DashboardPage'
import { getProperties } from './lib/api'
import { findPrimaryProperty } from './lib/primaryProperty'
import { PropertyStatsProvider } from './lib/propertyStats'
import type { DashboardAlert, PropertyItem } from './lib/types'

function App() {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [activePage, setActivePage] = useState<Page>('dashboard')
  const [portfolioResetKey, setPortfolioResetKey] = useState(0)
  const [selectedPropertyId, setSelectedPropertyId] = useState<number | null>(null)
  const [openDetailId, setOpenDetailId]             = useState<number | null>(null)

  const [properties, setProperties] = useState<PropertyItem[]>([])
  const [propertiesLoading, setPropertiesLoading] = useState(true)
  const [propertiesError, setPropertiesError] = useState<string | null>(null)

  useEffect(() => {
    getProperties()
      .then(setProperties)
      .catch((err: unknown) => setPropertiesError(err instanceof Error ? err.message : 'Failed to load'))
      .finally(() => setPropertiesLoading(false))
  }, [])

  const primaryProperty = useMemo(() => findPrimaryProperty(properties), [properties])

  useEffect(() => {
    if (selectedPropertyId === null && primaryProperty) {
      setSelectedPropertyId(primaryProperty.id)
    }
  }, [primaryProperty, selectedPropertyId])

  function handleNavigate(page: Page) {
    if (page === 'portfolio') {
      setPortfolioResetKey((k) => k + 1)
      setOpenDetailId(null)
    } else if (page === 'analytics') {
      const target = selectedPropertyId ?? primaryProperty?.id ?? null
      if (target !== null) {
        setSelectedPropertyId(target)
        setOpenDetailId(target)
      }
    } else if (page === 'dashboard') {
      setOpenDetailId(null)
    }
    setActivePage(page)
  }

  function handleOpenAlertInAnalytics(alert: DashboardAlert) {
    setSelectedPropertyId(alert.property_id)
    setOpenDetailId(alert.property_id)
    setActivePage('analytics')
  }

  const sidebarActivePage: Page = openDetailId !== null ? 'analytics' : activePage
  const showDetailInMain = activePage === 'portfolio' || activePage === 'analytics'

  return (
    <PropertyStatsProvider>
    <div className="h-screen overflow-hidden bg-[linear-gradient(180deg,#ffffff_0%,#f8f8f7_100%)] text-stone-950">
      <div className="flex h-full">
        <SidebarNav
          isMobileOpen={mobileSidebarOpen}
          onCloseMobile={() => setMobileSidebarOpen(false)}
          activePage={sidebarActivePage}
          onNavigate={handleNavigate}
        />

        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <SiteHeader
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            isMobileSidebarOpen={mobileSidebarOpen}
            onToggleSidebar={() => setMobileSidebarOpen((current) => !current)}
            selectedPropertyId={selectedPropertyId}
            onPropertyChange={setSelectedPropertyId}
            onOpenDetail={(id) => {
              setSelectedPropertyId(id)
              setOpenDetailId(id)
              if (activePage === 'dashboard') setActivePage('analytics')
            }}
            properties={properties}
            lockedPropertyId={primaryProperty?.id ?? null}
          />

          <main className="flex flex-1 flex-col overflow-hidden">
            {activePage === 'dashboard' ? (
              <DashboardPage
                onOpenAlert={handleOpenAlertInAnalytics}
                onOpenCRREM={() => {
                  const target = selectedPropertyId ?? primaryProperty?.id ?? null
                  if (target !== null) {
                    setSelectedPropertyId(target)
                    setOpenDetailId(target)
                    setActivePage('analytics')
                  }
                }}
                onOpenChat={() => setActivePage('mcp')}
              />
            ) : showDetailInMain ? (
              <PortfolioPage
                selectedPropertyId={selectedPropertyId}
                onSelectProperty={setSelectedPropertyId}
                resetKey={portfolioResetKey}
                openDetailId={openDetailId}
                onOpenDetail={setOpenDetailId}
                onCloseDetail={() => {
                  setOpenDetailId(null)
                  setActivePage('portfolio')
                }}
                properties={properties}
                propertiesLoading={propertiesLoading}
                propertiesError={propertiesError}
              />
            ) : activePage === 'mcp' ? (
              <McpPage />
            ) : (
              <div className="flex flex-1 items-center justify-center text-sm text-stone-400">
                {activePage}
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
    </PropertyStatsProvider>
  )
}

export default App
