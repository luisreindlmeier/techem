import { useEffect, useState } from 'react'

import { SiteHeader } from './components/SiteHeader'
import { SidebarNav, type Page } from './components/SidebarNav'
import { PortfolioPage } from './pages/PortfolioPage'
import { getProperties } from './lib/api'
import type { PropertyItem } from './lib/types'

function App() {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [activePage, setActivePage] = useState<Page>('portfolio')
  const [portfolioResetKey, setPortfolioResetKey] = useState(0)
  const [selectedPropertyId, setSelectedPropertyId] = useState<number | null>(null)

  const [properties, setProperties] = useState<PropertyItem[]>([])
  const [propertiesLoading, setPropertiesLoading] = useState(true)
  const [propertiesError, setPropertiesError] = useState<string | null>(null)

  useEffect(() => {
    getProperties()
      .then(setProperties)
      .catch((err: unknown) => setPropertiesError(err instanceof Error ? err.message : 'Failed to load'))
      .finally(() => setPropertiesLoading(false))
  }, [])

  function handleNavigate(page: Page) {
    if (page === 'portfolio') setPortfolioResetKey((k) => k + 1)
    setActivePage(page)
  }

  return (
    <div className="h-screen overflow-hidden bg-[linear-gradient(180deg,#ffffff_0%,#f8f8f7_100%)] text-stone-950">
      <div className="flex h-full">
        <SidebarNav
          isMobileOpen={mobileSidebarOpen}
          onCloseMobile={() => setMobileSidebarOpen(false)}
          activePage={activePage}
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
            properties={properties}
          />

          <main className="flex flex-1 flex-col overflow-hidden">
            {activePage === 'portfolio' ? (
              <PortfolioPage
                selectedPropertyId={selectedPropertyId}
                onSelectProperty={setSelectedPropertyId}
                resetKey={portfolioResetKey}
                properties={properties}
                propertiesLoading={propertiesLoading}
                propertiesError={propertiesError}
              />
            ) : (
              <div className="flex flex-1 items-center justify-center text-sm text-stone-400">
                {activePage}
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  )
}

export default App
