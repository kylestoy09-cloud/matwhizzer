'use client'

import { getYouTubeEmbedUrl } from '@/lib/youtube'

interface RegionVideoProps {
  youtubeUrl: string | null
  regionName?: string
}

export default function RegionVideo({ youtubeUrl, regionName }: RegionVideoProps) {
  const embedUrl = getYouTubeEmbedUrl(youtubeUrl)
  if (!embedUrl) return null

  return (
    <div className="mb-6">
      {regionName && (
        <h3 className="text-sm font-medium text-zinc-400 mb-2">
          {regionName} Championship Stream
        </h3>
      )}
      <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
        <iframe
          className="absolute top-0 left-0 w-full h-full rounded-none"
          src={embedUrl}
          title={regionName ? `${regionName} Championship` : 'Championship Stream'}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
    </div>
  )
}
