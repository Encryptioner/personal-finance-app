/**
 * Service Worker registration hook.
 * Uses vite-plugin-pwa's virtual:pwa-register/react to handle SW updates.
 */

import { useRegisterSW } from 'virtual:pwa-register/react'

export function useUpdatePrompt() {
  const { needRefresh, updateServiceWorker } = useRegisterSW()

  const [needsUpdate] = needRefresh

  return {
    needsUpdate: needsUpdate ?? false,
    updateApp: () => updateServiceWorker(true),
  }
}
