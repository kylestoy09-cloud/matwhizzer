import { loadAbout } from '@/app/(site)/about/loadAbout'
import { AboutClient } from '@/app/(site)/about/AboutClient'

// the About page, inside Insight
export const revalidate = 86400

export default async function Page() {
  const p = await loadAbout('M')
  return <AboutClient {...p} embedded />
}
