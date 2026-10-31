'use client'

import { createContext, useContext, useState, type ReactNode } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import {
  ADMIN_SIDE_COOKIE, genderOfSide, sideFromPath, sideOfGender, swapSidePath, adminHref,
  type AdminSide,
} from '@/lib/admin-side'

export type AdminGender = 'M' | 'F'

type AdminGenderContextType = {
  gender: AdminGender
  side: AdminSide
  // On a side page the address decides the gender. On a universal page it is the
  // side last visited; setGender there just switches which side the panel links to.
  setGender: (g: AdminGender) => void
  // false until the gender is known; gender is 'M' until then
  loaded: boolean
}

const AdminGenderContext = createContext<AdminGenderContextType>({
  gender: 'M',
  side: 'boys',
  setGender: () => {},
  loaded: false,
})

function rememberSide(side: AdminSide) {
  document.cookie = `${ADMIN_SIDE_COOKIE}=${side};path=/;max-age=${60 * 60 * 24 * 365};samesite=lax`
}

export function AdminGenderProvider({
  children,
  lastSide,
}: {
  children: ReactNode
  // The side remembered in the cookie, read by the server layout
  lastSide: AdminSide | null
}) {
  const pathname = usePathname()
  const router = useRouter()
  const pathSide = sideFromPath(pathname)
  const [rememberedSide, setRememberedSide] = useState<AdminSide>(lastSide ?? 'boys')

  // Visiting a side makes it the remembered one
  if (pathSide && pathSide !== rememberedSide) setRememberedSide(pathSide)

  const side = pathSide ?? rememberedSide

  function setGender(g: AdminGender) {
    const to = sideOfGender(g)
    rememberSide(to)
    setRememberedSide(to)
    if (pathSide && pathSide !== to) router.push(swapSidePath(pathname, to))
    else if (!pathSide && pathname === '/admin') router.push(adminHref(to))
  }

  return (
    <AdminGenderContext.Provider value={{ gender: genderOfSide(side), side, setGender, loaded: true }}>
      {children}
    </AdminGenderContext.Provider>
  )
}

export function useAdminGender() {
  return useContext(AdminGenderContext)
}
