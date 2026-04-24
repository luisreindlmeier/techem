import type { PropertyItem } from './types'

export function findPrimaryProperty(properties: PropertyItem[]): PropertyItem | null {
  const match = properties.find((p) => {
    const hay = `${p.name ?? ''} ${p.street ?? ''}`.toLowerCase()
    return hay.includes('westerbach')
  })
  return match ?? null
}
