import { useState } from 'react'

type IsometricBuildingProps = {
  totalFloors: number
  selectedFloor: number // 1-indexed
  onSelectFloor: (floor: number) => void
}

const HSTEP = 42
const VSTEP = 21
const YSTEP = 40

// Asymmetric staircase footprint — steps only on the right; left wall is solid to z=2:
//   z=0..1  x=0..5   (wide front bar)
//   z=1..2  x=0..3   (step in on right only — S1X=3)
//   z=2..3  x=1..2   (narrow back, small left cut too — S3X=1, S2X=2)
//
// Top-face polygon (10 verts):
//   (0,0)→(5,0)→(5,1)→(3,1)→(3,2)→(2,2)→(2,3)→(1,3)→(1,2)→(0,2)→close
const BW  = 5
const BD  = 3
const S1X = 3, S1Z = 1
const S2X = 2, S2Z = 2
const S3X = 1

const LABEL_SPACE = 8
const MX = 2, MY = 14

function layout(nFloors: number) {
  const cx   = BD * HSTEP + LABEL_SPACE + MX
  const cy   = nFloors * YSTEP + MY
  const svgW = cx + BW * HSTEP + MX
  const svgH = cy + (BW + BD) * VSTEP + MY
  const lblX = -8
  const vbOff = 10
  return { cx, cy, svgW, svgH, lblX, vbOff }
}

function sp(cx: number, cy: number, x: number, z: number, y: number): string {
  return `${(cx + (x - z) * HSTEP).toFixed(1)},${(cy - y * YSTEP + (x + z) * VSTEP).toFixed(1)}`
}
function sxy(cx: number, cy: number, x: number, z: number, y: number): [number, number] {
  return [cx + (x - z) * HSTEP, cy - y * YSTEP + (x + z) * VSTEP]
}

export function IsometricBuilding({ totalFloors, selectedFloor, onSelectFloor }: IsometricBuildingProps) {
  const [hov, setHov] = useState<number | null>(null)
  const { cx, cy, svgW, svgH, lblX, vbOff } = layout(totalFloors)
  const p  = (x: number, z: number, y: number) => sp(cx, cy, x, z, y)
  const xy = (x: number, z: number, y: number): [number, number] => sxy(cx, cy, x, z, y)
  const floors = Array.from({ length: totalFloors }, (_, i) => i + 1)

  return (
    <svg viewBox={`${-vbOff} 0 ${svgW + vbOff} ${svgH}`} width="100%" className="block" aria-label="Building floor overview">
      {floors.map((floorNum) => {
        const fi  = floorNum - 1
        const y0  = fi, y1 = fi + 1
        const sel = selectedFloor === floorNum
        const h   = hov === floorNum && !sel

        const topFill = sel ? '#E2001A' : h ? '#C8C8C8' : '#EAEAEA'
        const front   = sel ? '#B80016' : h ? '#B8B8B8' : '#D2D2D2'
        const step    = sel ? '#A50013' : h ? '#ABABAB' : '#C8C8C8'
        const side    = sel ? '#900010' : h ? '#A0A0A0' : '#BCBCBC'
        const deep    = sel ? '#7A000D' : h ? '#929292' : '#ADADAD'
        const win     = sel ? 'rgba(255,255,255,0.30)' : 'rgba(0,0,0,0.09)'
        const sk      = sel ? '#6A000B' : '#BBBBBB'

        const w = (x1: number, z1: number, x2: number, z2: number) =>
          `${p(x1,z1,y0+0.66)} ${p(x2,z2,y0+0.66)} ${p(x2,z2,y0+0.26)} ${p(x1,z1,y0+0.26)}`

        // Top face: asymmetric staircase outline
        const topPts = [
          p(0,0,y1),    p(BW,0,y1),
          p(BW,S1Z,y1), p(S1X,S1Z,y1),
          p(S1X,S2Z,y1),p(S2X,S2Z,y1),
          p(S2X,BD,y1), p(S3X,BD,y1),
          p(S3X,S2Z,y1),p(0,S2Z,y1),
        ].join(' ')

        // Vertical faces
        const fF   = `${p(0,0,y1)} ${p(BW,0,y1)} ${p(BW,0,y0)} ${p(0,0,y0)}`
        const fRO  = `${p(BW,0,y1)} ${p(BW,S1Z,y1)} ${p(BW,S1Z,y0)} ${p(BW,0,y0)}`
        const fS1  = `${p(S1X,S1Z,y1)} ${p(BW,S1Z,y1)} ${p(BW,S1Z,y0)} ${p(S1X,S1Z,y0)}`
        const fRM  = `${p(S1X,S1Z,y1)} ${p(S1X,S2Z,y1)} ${p(S1X,S2Z,y0)} ${p(S1X,S1Z,y0)}`
        const fS2R = `${p(S2X,S2Z,y1)} ${p(S1X,S2Z,y1)} ${p(S1X,S2Z,y0)} ${p(S2X,S2Z,y0)}`
        const fRI  = `${p(S2X,S2Z,y1)} ${p(S2X,BD,y1)} ${p(S2X,BD,y0)} ${p(S2X,S2Z,y0)}`
        const fS2L = `${p(0,S2Z,y1)} ${p(S3X,S2Z,y1)} ${p(S3X,S2Z,y0)} ${p(0,S2Z,y0)}`
        const fRD  = `${p(S3X,S2Z,y1)} ${p(S3X,BD,y1)} ${p(S3X,BD,y0)} ${p(S3X,S2Z,y0)}`

        return (
          <g key={floorNum} className="cursor-pointer"
            onMouseEnter={() => setHov(floorNum)}
            onMouseLeave={() => setHov(null)}
            onClick={() => onSelectFloor(floorNum)}>

            {/* Painter's order: deepest → frontmost */}
            <polygon className="iso-face" points={fRD}  fill={deep}  stroke={sk} strokeWidth="0.5" />
            <polygon className="iso-face" points={w(S3X, S2Z+0.28, S3X, S2Z+0.72)} fill={win} />

            <polygon className="iso-face" points={fS2L} fill={step}  stroke={sk} strokeWidth="0.5" />
            <polygon className="iso-face" points={w(0.18, S2Z, 0.82, S2Z)} fill={win} />

            <polygon className="iso-face" points={fRI}  fill={deep}  stroke={sk} strokeWidth="0.5" />
            <polygon className="iso-face" points={w(S2X, S2Z+0.28, S2X, S2Z+0.72)} fill={win} />

            <polygon className="iso-face" points={fS2R} fill={step}  stroke={sk} strokeWidth="0.5" />
            <polygon className="iso-face" points={w(S2X+0.14, S2Z, S1X-0.14, S2Z)} fill={win} />

            <polygon className="iso-face" points={fRM}  fill={side}  stroke={sk} strokeWidth="0.5" />
            <polygon className="iso-face" points={w(S1X, S1Z+0.28, S1X, S1Z+0.72)} fill={win} />

            <polygon className="iso-face" points={fS1}  fill={step}  stroke={sk} strokeWidth="0.5" />
            {[3.5, 4.35].map((wx, i) => (
              <polygon key={`s1${i}`} className="iso-face" points={w(wx-0.16, S1Z, wx+0.16, S1Z)} fill={win} />
            ))}

            <polygon className="iso-face" points={fRO}  fill={side}  stroke={sk} strokeWidth="0.5" />
            <polygon className="iso-face" points={w(BW, 0.28, BW, 0.72)} fill={win} />

            <polygon className="iso-face" points={fF}   fill={front} stroke={sk} strokeWidth="0.5" />
            {[0.6, 1.5, 2.5, 3.5, 4.35].map((wx, i) => (
              <polygon key={`fw${i}`} className="iso-face" points={w(wx-0.16, 0, wx+0.16, 0)} fill={win} />
            ))}

            <polygon className="iso-face" points={topPts} fill={topFill} stroke={sk} strokeWidth="0.5" />
          </g>
        )
      })}

      {/* Labels aligned to floor level — clickable */}
      {floors.map((floorNum) => {
        const fi      = floorNum - 1
        const [, ly]  = xy(0, 1, fi - 0.2)
        const sel     = selectedFloor === floorNum
        const col     = sel ? '#E2001A' : '#888888'
        return (
          <g
            key={`lbl${floorNum}`}
            className="cursor-pointer"
            onClick={() => onSelectFloor(floorNum)}
          >
            <rect
              x={0}
              y={ly + 2}
              width={lblX + 52}
              height={16}
              fill="transparent"
            />
            <text
              x={lblX}
              y={ly + 14}
              textAnchor="start"
              fontSize="13"
              fontFamily="inherit"
              fontWeight={sel ? '700' : '500'}
              fill={col}
            >
              Floor {floorNum}
            </text>
          </g>
        )
      })}
    </svg>
  )
}
