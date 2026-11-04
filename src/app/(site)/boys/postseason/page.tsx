import { redirect } from 'next/navigation'

// Post Season has no page of its own: the header's Post Season menu goes straight to Team or
// Individual. Old links land on Individual.
export default function BoysPostSeasonPage() {
  redirect('/postseason/individual/boys')
}
