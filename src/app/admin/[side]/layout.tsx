import { notFound } from 'next/navigation'
import { isAdminSide } from '@/lib/admin-side'

// /admin/boys/... and /admin/girls/... — any other segment here is not a page
export default async function AdminSideLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ side: string }>
}) {
  const { side } = await params
  if (!isAdminSide(side)) notFound()
  return <>{children}</>
}
