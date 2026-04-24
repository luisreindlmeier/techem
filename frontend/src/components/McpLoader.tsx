import { useEffect, useRef, useState } from 'react'
import lottie, { type AnimationItem } from 'lottie-web'

type McpLoaderProps = {
  stages: string[]
}

const DEFAULT_STAGES = [
  'Thinking…',
  'Reading portfolio data…',
  'Analyzing patterns…',
  'Composing insights…',
]

export function McpLoader({ stages }: McpLoaderProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const animRef = useRef<AnimationItem | null>(null)
  const effective = stages.length > 0 ? stages : DEFAULT_STAGES
  const [index, setIndex] = useState(0)

  useEffect(() => {
    if (!containerRef.current) return
    const anim = lottie.loadAnimation({
      container: containerRef.current,
      renderer: 'svg',
      loop: true,
      autoplay: true,
      path: '/animations/loading.json',
    })
    animRef.current = anim
    return () => anim.destroy()
  }, [])

  useEffect(() => {
    setIndex(0)
    const handle = window.setInterval(() => {
      setIndex((i) => (i + 1) % effective.length)
    }, 1600)
    return () => window.clearInterval(handle)
  }, [effective])

  return (
    <div className="flex items-center gap-3 rounded-md border border-stone-200 bg-white/80 px-4 py-3 shadow-sm">
      <div ref={containerRef} className="h-6 w-6 shrink-0 [&_svg]:h-6 [&_svg]:w-6" />
      <div className="relative min-h-[1.2rem] flex-1">
        <span
          key={index}
          className="inline-block animate-mcp-stage-fade text-sm font-medium text-stone-700"
        >
          {effective[index]}
        </span>
      </div>
    </div>
  )
}
