import { useState } from 'react'

import { SiteHeader } from './components/SiteHeader'
import { SidebarNav, type Page } from './components/SidebarNav'
import { PortfolioPage } from './pages/PortfolioPage'

function App() {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [activePage, setActivePage] = useState<Page>('portfolio')
  const [selectedPropertyId, setSelectedPropertyId] = useState<number | null>(null)

  return (
    <div className="h-screen overflow-hidden bg-[linear-gradient(180deg,#ffffff_0%,#f8f8f7_100%)] text-stone-950">
      <div className="flex h-full">
        <SidebarNav
          isMobileOpen={mobileSidebarOpen}
          onCloseMobile={() => setMobileSidebarOpen(false)}
          activePage={activePage}
          onNavigate={setActivePage}
        />

        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <SiteHeader
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            isMobileSidebarOpen={mobileSidebarOpen}
            onToggleSidebar={() => setMobileSidebarOpen((current) => !current)}
            selectedPropertyId={selectedPropertyId}
            onPropertyChange={setSelectedPropertyId}
          />

          <main className="flex flex-1 flex-col overflow-hidden">
            {activePage === 'portfolio' ? (
              <PortfolioPage />
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
