interface ToggleProps {
  checked: boolean
  onChange: (v: boolean) => void
  accent?: string
  label?: string
}

/** Compact pill switch used for FX on/off and LED enable. */
export function Toggle({ checked, onChange, accent = '#8b5cf6', label }: ToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className="relative h-6 w-11 shrink-0 rounded-full border border-white/10 transition"
      style={{
        background: checked ? accent : 'rgba(255,255,255,0.08)',
        boxShadow: checked ? `0 0 12px -2px ${accent}` : 'none',
      }}
    >
      <span
        className="absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all"
        style={{ left: checked ? '24px' : '4px' }}
      />
    </button>
  )
}
