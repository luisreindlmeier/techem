import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'

import { getAllPropertyStats } from './api'
import type { PropertyStats } from './types'

type PropertyStatsContextValue = {
  statsById: Record<number, PropertyStats>
  loading: boolean
  error: string | null
}

const PropertyStatsContext = createContext<PropertyStatsContextValue>({
  statsById: {},
  loading:   true,
  error:     null,
})

export function PropertyStatsProvider({ children }: { children: ReactNode }) {
  const [statsList, setStatsList] = useState<PropertyStats[]>([])
  const [loading,   setLoading]   = useState(true)
  const [error,     setError]     = useState<string | null>(null)

  useEffect(() => {
    getAllPropertyStats()
      .then(setStatsList)
      .catch((err: unknown) => setError(err instanceof Error ? err.message : 'Failed to load stats'))
      .finally(() => setLoading(false))
  }, [])

  const value = useMemo<PropertyStatsContextValue>(() => {
    const statsById: Record<number, PropertyStats> = {}
    for (const s of statsList) statsById[s.property_id] = s
    return { statsById, loading, error }
  }, [statsList, loading, error])

  return <PropertyStatsContext.Provider value={value}>{children}</PropertyStatsContext.Provider>
}

export function usePropertyStats(propertyId: number): PropertyStats | null {
  const { statsById } = useContext(PropertyStatsContext)
  return statsById[propertyId] ?? null
}

export function usePropertyStatsMap(): Record<number, PropertyStats> {
  return useContext(PropertyStatsContext).statsById
}
