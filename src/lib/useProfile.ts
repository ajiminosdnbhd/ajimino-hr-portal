'use client'

import { useProfileContext } from './ProfileContext'

// All pages call useProfile() — now reads from shared context.
// Profile is loaded once at app startup and persists across navigations.
export function useProfile() {
  return useProfileContext()
}
