import { useState } from 'react'

// ---------------------------------------------------------------------------
// Brand logo. Renders /assets/brand/logo-mark.svg if present, otherwise falls
// back to the gradient "P" mark — so the app always shows something.
//
// To use your own logo: drop a file named `logo-mark.svg` into
// `public/assets/brand/` (see that folder's README for naming rules). No code
// change needed. To point at a different filename, edit LOGO_SRC below.
// ---------------------------------------------------------------------------

const LOGO_SRC = '/assets/brand/logo-mark.png'

interface LogoProps {
  /** Rendered size in px (square). */
  size?: number
  /** Corner rounding utility class. */
  rounded?: string
  className?: string
}

export function Logo({ size = 44, rounded = 'rounded-2xl', className = '' }: LogoProps) {
  const [failed, setFailed] = useState(false)

  if (failed) {
    // Fallback: the original gradient "P" mark.
    return (
      <div
        className={`grid place-items-center bg-brand-gradient font-black text-white shadow-glow ${rounded} ${className}`}
        style={{ width: size, height: size, fontSize: Math.round(size * 0.42) }}
        aria-hidden
      >
        P
      </div>
    )
  }

  return (
    <img
      src={LOGO_SRC}
      onError={() => setFailed(true)}
      alt="PartyKeys"
      width={size}
      height={size}
      className={`object-contain shadow-glow ${rounded} ${className}`}
      style={{ width: size, height: size }}
    />
  )
}
