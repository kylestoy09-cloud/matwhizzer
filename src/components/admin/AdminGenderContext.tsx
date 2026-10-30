'use client'

import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'

export type AdminGender = 'M' | 'F'

type AdminGenderContextType = {
  gender: AdminGender
  setGender: (g: AdminGender) => void
  // false until the saved choice has been read; gender is 'M' until then
  loaded: boolean
}

const AdminGenderContext = createContext<AdminGenderContextType>({
  gender: 'M',
  setGender: () => {},
  loaded: false,
})

const STORAGE_KEY = 'mw_admin_gender'

export function AdminGenderProvider({ children }: { children: ReactNode }) {
  const [gender, setGenderState] = useState<AdminGender>('M')
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored === 'M' || stored === 'F') setGenderState(stored)
    setLoaded(true)
  }, [])

  function setGender(g: AdminGender) {
    setGenderState(g)
    localStorage.setItem(STORAGE_KEY, g)
  }

  return (
    <AdminGenderContext.Provider value={{ gender, setGender, loaded }}>
      {children}
    </AdminGenderContext.Provider>
  )
}

export function useAdminGender() {
  return useContext(AdminGenderContext)
}
