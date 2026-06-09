import type { ReactNode } from 'react'

interface CardProps {
  title?: string
  icon?: ReactNode
  accent?: string
  right?: ReactNode
  children: ReactNode
  className?: string
}

/** Glassmorphism panel shell shared by every control panel. */
export function Card({ title, icon, accent, right, children, className = '' }: CardProps) {
  return (
    <section className={`glass relative overflow-hidden p-4 sm:p-5 ${className}`}>
      {accent && (
        <span
          className="pointer-events-none absolute -top-px left-5 right-5 h-px"
          style={{
            background: `linear-gradient(90deg, transparent, ${accent}aa, transparent)`,
          }}
        />
      )}
      {(title || right) && (
        <header className="mb-4 flex items-center justify-between gap-3">
          <div className="panel-title">
            {icon && (
              <span style={{ color: accent ?? '#a5b4fc' }} className="text-sm">
                {icon}
              </span>
            )}
            {title}
          </div>
          {right}
        </header>
      )}
      {children}
    </section>
  )
}
