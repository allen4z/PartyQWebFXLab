interface SegmentedOption<T extends string> {
  value: T
  label: string
}

interface SegmentedProps<T extends string> {
  options: SegmentedOption<T>[]
  value: T
  onChange: (v: T) => void
  accent?: string
  size?: 'sm' | 'md'
}

/** Pill-group selector for LED modes, colors, etc. */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  accent = '#8b5cf6',
  size = 'md',
}: SegmentedProps<T>) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((opt) => {
        const active = opt.value === value
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={`rounded-lg border font-medium transition ${
              size === 'sm' ? 'px-2.5 py-1 text-[11px]' : 'px-3 py-1.5 text-xs'
            } ${
              active
                ? 'border-transparent text-white'
                : 'border-white/10 bg-white/5 text-white/55 hover:bg-white/10'
            }`}
            style={
              active
                ? { background: accent, boxShadow: `0 0 14px -3px ${accent}` }
                : undefined
            }
          >
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}
