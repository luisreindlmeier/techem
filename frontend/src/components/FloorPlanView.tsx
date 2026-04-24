import { useState } from 'react'

import { FLOORPLAN } from '@/lib/chartColors'

// Same footprint as IsometricBuilding, rendered as a top-face slice
// Projection: px = (x - z) * HS + OX,  py = (x + z) * VS
const HS = 34
const VS = 17
const OX = 72 // offsets so (0,2) and (1,3) land at px >= 0

// Building footprint split into 4 apartments in x,z space.
// Footprint outline: (0,0)→(5,0)→(5,1)→(3,1)→(3,2)→(2,2)→(2,3)→(1,3)→(1,2)→(0,2)→close
const APTS: { idx: number; label: string; pts: [number, number][]; lx: number; lz: number }[] = [
  {
    idx: 0,
    label: 'A',
    pts: [[2.5, 0], [5, 0], [5, 1], [3, 1], [2.5, 1]],
    lx: 3.7, lz: 0.5,
  },
  {
    idx: 1,
    label: 'B',
    pts: [[0, 0], [2.5, 0], [2.5, 1], [0, 1]],
    lx: 1.25, lz: 0.45,
  },
  {
    idx: 2,
    label: 'C',
    pts: [[0, 1], [1.5, 1], [1.5, 2], [0, 2]],
    lx: 0.75, lz: 1.5,
  },
  {
    idx: 3,
    label: 'D',
    pts: [[1.5, 1], [3, 1], [3, 2], [2, 2], [2, 3], [1, 3], [1, 2], [1.5, 2]],
    lx: 2.05, lz: 1.55,
  },
]

function proj(x: number, z: number): [number, number] {
  return [(x - z) * HS + OX, (x + z) * VS]
}

function ptsStr(pts: [number, number][]): string {
  return pts.map(([x, z]) => proj(x, z).join(',')).join(' ')
}

type FloorPlanViewProps = {
  selectedAptIdx: number
  onSelectApt: (idx: number) => void
  floor: number
}

export function FloorPlanView({ selectedAptIdx, onSelectApt, floor }: FloorPlanViewProps) {
  const [hov, setHov] = useState<number | null>(null)

  // Compute viewBox bounds dynamically
  const allProjPts = APTS.flatMap(a => a.pts.map(([x, z]) => proj(x, z)))
  const xs = allProjPts.map(([px]) => px)
  const ys = allProjPts.map(([, py]) => py)
  const pad = 3
  const vbX = Math.min(...xs) - pad
  const vbY = Math.min(...ys) - pad
  const vbW = Math.max(...xs) - Math.min(...xs) + pad * 2
  const vbH = Math.max(...ys) - Math.min(...ys) + pad * 2

  return (
    <svg
      viewBox={`${vbX} ${vbY} ${vbW} ${vbH}`}
      width="100%"
      className="block"
      aria-label="Floor plan"
    >
      {APTS.map((apt) => {
        const sel = selectedAptIdx === apt.idx
        const h   = hov === apt.idx && !sel
        const fill   = sel ? FLOORPLAN.fillSelected : h ? FLOORPLAN.fillHover : FLOORPLAN.fillIdle
        const stroke = sel ? FLOORPLAN.labelSelected : FLOORPLAN.strokeIdle
        const [lpx, lpy] = proj(apt.lx, apt.lz)

        return (
          <g
            key={apt.idx}
            className="cursor-pointer"
            onClick={() => onSelectApt(apt.idx)}
            onMouseEnter={() => setHov(apt.idx)}
            onMouseLeave={() => setHov(null)}
          >
            <polygon
              points={ptsStr(apt.pts)}
              fill={fill}
              stroke={stroke}
              strokeWidth="0.8"
              strokeLinejoin="round"
            />
            <text
              x={lpx}
              y={lpy}
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize="9"
              fontWeight={sel ? '700' : '500'}
              fill={sel ? FLOORPLAN.labelSelected : FLOORPLAN.labelIdle}
              fontFamily="inherit"
            >
              {floor}{apt.label}
            </text>
          </g>
        )
      })}
    </svg>
  )
}
