export function StagingBanner() {
  if (process.env.NEXT_PUBLIC_IS_STAGING !== 'true') return null

  return (
    <div className="bg-orange-500 text-white text-center py-1.5 text-sm font-bold tracking-wide sticky top-0 z-50">
      STAGING — Not Live
    </div>
  )
}
