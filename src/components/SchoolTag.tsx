// A school as the site shows it: its logo and name, looked up by school id. No id means the
// entry was never matched to a school, so it reads "TBD" (never the imported text).
// Server component: getSchoolLogos() is cached per request, so any number of these on a page
// cost one query. For a compact spot (a bracket cell) pass maxWidth; the full name is the
// tooltip. Client components use <SchoolTagView> with the badge passed down from the page.
import { getSchoolLogos } from '@/lib/school-logos'
import { SchoolTagView } from '@/components/SchoolTagView'

export async function SchoolTag(props: {
  id: number | null | undefined
  name: string | null | undefined
  maxWidth?: number
  className?: string
}) {
  const badge = props.id == null ? null : (await getSchoolLogos()).badgeById(props.id)
  return <SchoolTagView {...props} badge={badge} />
}
