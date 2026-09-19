export const revalidate = 300

import { WrestlerProfileCore } from '@/app/(site)/wrestler/_shared/WrestlerProfileCore'

export default async function GirlsWrestlerPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  return <WrestlerProfileCore wrestlerId={id} />
}
