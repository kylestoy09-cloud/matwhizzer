import { CollegeListCore } from '@/components/site/CollegePages'

// Insight · Collegiate (Kyle 2026-11-18): the college list — a tab per level, the colleges NJ wrestlers competed for and
// the leader boards. Data cached 5 minutes (src/lib/ncaa/collegePublic.ts).
export const revalidate = 300

export default async function Page() {
  return <CollegeListCore g="F" embedded />
}
