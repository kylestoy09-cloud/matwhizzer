'use client'

import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'

export type AdminGender = 'M' | 'F'

type AdminGenderContextType = {
  gender: AdminGender
  setGender: (g: AdminGender) => void
}

const AdminGenderContext = createContext<AdminGenderContextType>({
  gender: 'M',
  setGender: () => {},
})

const STORAGE_KEY = 'mw_admin_gender'

export function AdminGenderProvider({ children }: { children: ReactNode }) {
  const [gender, setGenderState] = useState<AdminGender>('M')

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored === 'M' || stored === 'F') setGenderState(stored)
  }, [])

  function setGender(g: AdminGender) {
    setGenderState(g)
    localStorage.setItem(STORAGE_KEY, g)
  }

  return (
    <AdminGenderContext.Provider value={{ gender, setGender }}>
      {children}
    </AdminGenderContext.Provider>
  )
}

export function useAdminGender() {
  return useContext(AdminGenderContext)
}
