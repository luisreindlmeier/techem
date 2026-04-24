import { useEffect, useState } from 'react'
import {
  BellAlertIcon,
  BuildingOffice2Icon,
  CloudIcon,
  FireIcon,
} from '@heroicons/react/24/outline'

import { AIInsightsCard } from '@/components/AIInsightsCard'
import { AlertFeed } from '@/components/AlertFeed'
import { CRREMSnapshot } from '@/components/CRREMSnapshot'
import { DashboardKPICard } from '@/components/DashboardKPICard'
import { PortfolioTrendChart } from '@/components/PortfolioTrendChart'
import {
  getCRREMSummary,
  getDashboardAlerts,
  getDashboardKPIs,
  getPortfolioTrend,
} from '@/lib/api'
import type {
  CRREMSummaryResponse,
  DashboardAlert,
  DashboardKPIs,
  PortfolioTrendPoint,
} from '@/lib/types'

type DashboardPageProps = {
  onOpenAlert?: (alert: DashboardAlert) => void
  onOpenCRREM?: () => void
  onOpenChat?: (prompt: string) => void
}

function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div>
      <h2 className="text-base font-semibold text-stone-900">{title}</h2>
      {subtitle && <p className="mt-0.5 text-xs text-stone-400">{subtitle}</p>}
      <div className="mt-2 h-px bg-stone-200" />
    </div>
  )
}

function formatKgOrTons(kg: number): { value: string; unit: string } {
  if (kg >= 1_000_000) return { value: (kg / 1_000_000).toFixed(2), unit: 'kt CO₂' }
  if (kg >= 1_000) return { value: (kg / 1_000).toFixed(1), unit: 't CO₂' }
  return { value: Math.round(kg).toLocaleString(), unit: 'kg CO₂' }
}

export function DashboardPage({ onOpenAlert, onOpenCRREM, onOpenChat }: DashboardPageProps) {
  const [kpis, setKpis] = useState<DashboardKPIs | null>(null)
  const [kpisLoading, setKpisLoading] = useState(true)

  const [alerts, setAlerts] = useState<DashboardAlert[]>([])
  const [alertsLoading, setAlertsLoading] = useState(true)
  const [alertsError, setAlertsError] = useState<string | null>(null)

  const [crrem, setCrrem] = useState<CRREMSummaryResponse | null>(null)
  const [crremLoading, setCrremLoading] = useState(true)
  const [crremError, setCrremError] = useState<string | null>(null)

  const [trend, setTrend] = useState<PortfolioTrendPoint[]>([])
  const [trendLoading, setTrendLoading] = useState(true)
  const [trendError, setTrendError] = useState<string | null>(null)

  useEffect(() => {
    getDashboardKPIs().then(setKpis).finally(() => setKpisLoading(false))
    getDashboardAlerts()
      .then(res => setAlerts(res.alerts))
      .catch(err => setAlertsError(err instanceof Error ? err.message : 'Failed to load'))
      .finally(() => setAlertsLoading(false))
    getCRREMSummary()
      .then(setCrrem)
      .catch(err => setCrremError(err instanceof Error ? err.message : 'Failed to load'))
      .finally(() => setCrremLoading(false))
    getPortfolioTrend()
      .then(res => setTrend(res.points))
      .catch(err => setTrendError(err instanceof Error ? err.message : 'Failed to load'))
      .finally(() => setTrendLoading(false))
  }, [])

  const co2 = formatKgOrTons(kpis?.total_annual_co2_kg ?? 0)

  return (
    <div className="flex h-full flex-col overflow-y-auto">
      <div className="px-6 py-6">
        <div>
          <h1 className="text-xl font-semibold text-stone-900">Dashboard</h1>
          <p className="mt-1 text-xs text-stone-400">
            Executive overview · {alertsLoading ? 'scanning portfolio…' : `${alerts.length} open alerts`}
          </p>
        </div>
      </div>

      {/* Section 1 — Portfolio Health (4 KPI cards) */}
      <section className="px-6">
        <SectionHeader title="Portfolio health" subtitle="What needs your attention today" />
        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <DashboardKPICard
            label="Properties"
            value={kpis ? kpis.total_properties.toString() : '—'}
            icon={BuildingOffice2Icon}
            loading={kpisLoading}
          />
          <DashboardKPICard
            label="Annual CO₂"
            value={kpis ? co2.value : '—'}
            unit={kpis ? co2.unit : undefined}
            icon={CloudIcon}
            loading={kpisLoading}
          />
          <DashboardKPICard
            label="Avg intensity"
            value={kpis ? kpis.avg_energy_intensity_kwh_per_m2.toFixed(0) : '—'}
            unit={kpis ? 'kWh/m²' : undefined}
            icon={FireIcon}
            loading={kpisLoading}
          />
          <DashboardKPICard
            label="Flagged properties"
            value={kpis ? kpis.flagged_properties.toString() : '—'}
            icon={BellAlertIcon}
            tone={kpis && kpis.flagged_properties > 0 ? 'critical' : 'neutral'}
            trend={
              kpis && kpis.flagged_properties > 0
                ? { direction: 'up', label: `${kpis.flagged_properties} need review` }
                : { direction: 'flat', label: 'portfolio stable' }
            }
            loading={kpisLoading}
          />
        </div>
      </section>

      {/* Sections 2, 3, 4 — three-column grid */}
      <section className="px-6 py-6">
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Left column (2/3): Alerts feed */}
          <div className="lg:col-span-2">
            <SectionHeader title="Active alerts" subtitle="Rule-based scan of every unit · refreshes each session" />
            <div className="mt-5">
              <AlertFeed
                alerts={alerts}
                loading={alertsLoading}
                error={alertsError}
                onOpenAlert={onOpenAlert}
              />
            </div>
          </div>

          {/* Right column (1/3): CRREM + AI insights stacked */}
          <div className="flex flex-col gap-4">
            <SectionHeader title="Risk & intelligence" />
            <div className="mt-1 flex flex-col gap-4">
              <CRREMSnapshot
                summary={crrem}
                loading={crremLoading}
                error={crremError}
                onOpenFull={onOpenCRREM}
              />
              <AIInsightsCard onOpenChat={onOpenChat} />
            </div>
          </div>
        </div>
      </section>

      {/* Section 5 — Portfolio trend (full width) */}
      <section className="px-6 pb-10">
        <SectionHeader title="Consumption trend" subtitle="Last 12 months · portfolio-wide aggregation" />
        <div className="mt-5">
          <PortfolioTrendChart points={trend} loading={trendLoading} error={trendError} />
        </div>
      </section>
    </div>
  )
}
