'use client'

import { getYouTubeEmbedUrl } from '@/lib/youtube'

interface RegionVideoProps {
  youtubeUrl: string | null
  regionName?: string
}

export default function RegionVideo({ youtubeUrl, regionName }: RegionVideoProps) {
  // Temporarily disabled — videos need updating
  return null

  const embedUrl = getYouTubeEmbedUrl(youtubeUrl)

  if (!embedUrl) return null

  return (
    <div className="mt-6 mb-6">
      <h3 className="text-lg font-semibold text-center mb-3 text-gray-700">
        {regionName ? `${regionName} Finals` : 'Region Finals'}
      </h3>

      <div className="relative w-full pb-[56.25%] h-0 overflow-hidden rounded-lg shadow-md">
        <iframe
          src={embedUrl}
          title={regionName ? `${regionName} Finals` : 'Region Finals'}
          className="absolute top-0 left-0 w-full h-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          loading="lazy"
        />
      </div>
    </div>
  )
}
