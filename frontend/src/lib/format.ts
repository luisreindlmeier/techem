import { format as d3format } from 'd3-format'

const number = d3format(',.0f')
const decimal = d3format(',.2f')

export function formatNumber(value: number): string {
  return number(value)
}

export function formatDecimal(value: number): string {
  return decimal(value)
}
