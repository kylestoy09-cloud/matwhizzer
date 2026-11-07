import { AboutClient } from './AboutClient'
import { loadAbout } from './loadAbout'

// also shown as the About tab of Insight (/boys/insight/about, /girls/insight/about)
export const revalidate = 86400

export default async function AboutPage() {
  return <AboutClient {...await loadAbout()} />
}
