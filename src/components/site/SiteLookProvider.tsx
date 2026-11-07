'use client'
// Hands the site look (src/lib/siteLook.ts) to every public page and component. The site layout
// loads it on the server and wraps the pages in this provider.
import { createContext, useContext, type ReactNode } from 'react'
import { DEFAULT_LOOK, type SiteLook } from '@/lib/siteLook'

const LookContext = createContext<SiteLook>(DEFAULT_LOOK)

export function SiteLookProvider({ look, children }: { look: SiteLook; children: ReactNode }) {
  return <LookContext.Provider value={look}>{children}</LookContext.Provider>
}

export const useSiteLook = () => useContext(LookContext)
