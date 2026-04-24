export const APT_LABELS = ['A', 'B', 'C', 'D']

const ROOM_DEFS = [
  { name: 'Living',  sqmMin: 18, sqmMax: 32 },
  { name: 'Kitchen', sqmMin: 8,  sqmMax: 14 },
  { name: 'Bedroom', sqmMin: 12, sqmMax: 20 },
  { name: 'Bath',    sqmMin: 4,  sqmMax: 8  },
] as const
export const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export type MonthlyPoint = {
  month: string
  energy_kwh: number
  cost_eur: number
  co2_kg: number
}

function pseudoRandom(seed: number): number {
  const x = Math.sin(seed + 1) * 10000
  return x - Math.floor(x)
}

function aptSeed(propertyId: number, floor: number, apt: number, month: number): number {
  return propertyId * 1_000_000 + floor * 10_000 + apt * 100 + month
}

function seasonal(month: number): number {
  // peaks in Jan (0) and Dec (11), low in summer
  return 1 + 0.45 * Math.cos(((month - 0.5) * Math.PI) / 6)
}

export function floorsForProperty(unitCount: number): number {
  return Math.max(1, Math.ceil(unitCount / 4))
}

export function getApartmentData(propertyId: number, floor: number, apt: number): MonthlyPoint[] {
  return MONTH_LABELS.map((month, m) => {
    const r = pseudoRandom(aptSeed(propertyId, floor, apt, m))
    const energy_kwh = Math.round((130 + r * 340) * seasonal(m))
    return {
      month,
      energy_kwh,
      cost_eur: Math.round(energy_kwh * 0.19 * 10) / 10,
      co2_kg: Math.round(energy_kwh * 0.21 * 10) / 10,
    }
  })
}

export function getBuildingAverage(propertyId: number, unitCount: number): MonthlyPoint[] {
  const totalFloors = floorsForProperty(unitCount)
  return MONTH_LABELS.map((month, m) => {
    let totalEnergy = 0
    let count = 0
    for (let f = 1; f <= totalFloors; f++) {
      for (let a = 1; a <= 4; a++) {
        const r = pseudoRandom(aptSeed(propertyId, f, a, m))
        totalEnergy += Math.round((130 + r * 340) * seasonal(m))
        count++
      }
    }
    const avgEnergy = Math.round(totalEnergy / count)
    return {
      month,
      energy_kwh: avgEnergy,
      cost_eur: Math.round(avgEnergy * 0.19 * 10) / 10,
      co2_kg: Math.round(avgEnergy * 0.21 * 10) / 10,
    }
  })
}

export type RoomSummary = {
  name: string
  sqm: number
  annualEnergy: number
}

export type UnitSummary = {
  label: string
  floor: number
  apt: string
  annualEnergy: number
  rooms: RoomSummary[]
}

function getRooms(propertyId: number, floor: number, apt: number, totalEnergy: number): RoomSummary[] {
  const weights = ROOM_DEFS.map((_, i) => 0.1 + pseudoRandom(aptSeed(propertyId, floor, apt, i + 50)))
  const totalWeight = weights.reduce((s, w) => s + w, 0)
  let remaining = totalEnergy
  return ROOM_DEFS.map((def, i) => {
    const sqm = Math.round(def.sqmMin + pseudoRandom(aptSeed(propertyId, floor, apt, i + 60)) * (def.sqmMax - def.sqmMin))
    const isLast = i === ROOM_DEFS.length - 1
    const annualEnergy = isLast ? remaining : Math.round(totalEnergy * weights[i] / totalWeight)
    if (!isLast) remaining -= annualEnergy
    return { name: def.name, sqm, annualEnergy }
  })
}

export function getAllUnitsAnnualEnergy(propertyId: number, unitCount: number): UnitSummary[] {
  const totalFloors = floorsForProperty(unitCount)
  const units: UnitSummary[] = []
  for (let f = 1; f <= totalFloors; f++) {
    for (let aIdx = 0; aIdx < APT_LABELS.length; aIdx++) {
      const data = getApartmentData(propertyId, f, aIdx + 1)
      const annualEnergy = data.reduce((s, d) => s + d.energy_kwh, 0)
      const rooms = getRooms(propertyId, f, aIdx + 1, annualEnergy)
      units.push({ label: `${f}${APT_LABELS[aIdx]}`, floor: f, apt: APT_LABELS[aIdx], annualEnergy, rooms })
    }
  }
  return units
}

export type GranularPoint = {
  label: string
  Apartment: number
  Average: number
}

function buildingAvgWeekly(propertyId: number, totalFloors: number, w: number): number {
  const monthEquiv = (w / 52) * 12
  let total = 0, count = 0
  for (let f = 1; f <= totalFloors; f++) {
    for (let a = 1; a <= 4; a++) {
      total += Math.round((30 + pseudoRandom(aptSeed(propertyId, f, a, w + 200))) * 80 * seasonal(monthEquiv))
      count++
    }
  }
  return Math.round(total / count)
}

function buildingAvgDaily(propertyId: number, totalFloors: number, d: number): number {
  let total = 0, count = 0
  for (let f = 1; f <= totalFloors; f++) {
    for (let a = 1; a <= 4; a++) {
      total += Math.round((4 + pseudoRandom(aptSeed(propertyId, f, a, d + 400)) * 14) * seasonal(0))
      count++
    }
  }
  return Math.round(total / count)
}

export function getWeeklyComparison(propertyId: number, floor: number, apt: number, unitCount: number): GranularPoint[] {
  const totalFloors = floorsForProperty(unitCount)
  return Array.from({ length: 52 }, (_, w) => {
    const monthEquiv = (w / 52) * 12
    const energy = Math.round((30 + pseudoRandom(aptSeed(propertyId, floor, apt, w + 200))) * 80 * seasonal(monthEquiv))
    return { label: `W${w + 1}`, Apartment: energy, Average: buildingAvgWeekly(propertyId, totalFloors, w) }
  })
}

export function getDailyComparison(propertyId: number, floor: number, apt: number, unitCount: number): GranularPoint[] {
  const totalFloors = floorsForProperty(unitCount)
  return Array.from({ length: 30 }, (_, d) => {
    const energy = Math.round((4 + pseudoRandom(aptSeed(propertyId, floor, apt, d + 400)) * 14) * seasonal(0))
    return { label: `${d + 1}`, Apartment: energy, Average: buildingAvgDaily(propertyId, totalFloors, d) }
  })
}

export type ForecastPoint = {
  date: string
  predicted_energy_kwh: number
  predicted_emission_kg_co2e: number
}

export function getUnitForecast(propertyId: number, floor: number, apt: number): ForecastPoint[] {
  return MONTH_LABELS.map((month, m) => {
    const r = pseudoRandom(aptSeed(propertyId, floor, apt, m))
    const predicted_energy_kwh = Math.round((130 + r * 300) * 0.88 * seasonal(m))
    return {
      date: month,
      predicted_energy_kwh,
      predicted_emission_kg_co2e: Math.round(predicted_energy_kwh * 0.21 * 10) / 10,
    }
  })
}
