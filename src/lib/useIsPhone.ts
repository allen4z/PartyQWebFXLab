import { useSyncExternalStore } from 'react'

// Portrait phones by width, landscape phones by height (iPhone landscape is
// 320-430px tall), so iPads and desktop windows keep the full layout.
const PHONE = window.matchMedia('(max-width: 767px), (orientation: landscape) and (max-height: 500px)')

const subscribe = (onChange: () => void) => {
  PHONE.addEventListener('change', onChange)
  return () => PHONE.removeEventListener('change', onChange)
}

export const useIsPhone = () => useSyncExternalStore(subscribe, () => PHONE.matches)
