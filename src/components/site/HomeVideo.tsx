// The weekly historical match video on a side's home page, with credit to whoever posted it (Kyle
// 2026-11-12). Data from the Home Video tool (src/lib/homeVideo.ts); shown only when the side's switch is
// on. Styled like the home page's other sections (bold heading, black-bordered box, square corners).
// Plays from youtube-nocookie.com, so nothing is tracked until the visitor presses play.

export type HomeVideoData = { video_id: string; youtube_url: string; title: string | null; creator_name: string | null; creator_url: string | null }

export function HomeVideo({ video, heading = 'Classic Match of the Week' }: { video: HomeVideoData; heading?: string }) {
  return (
    <section>
      <h2 className="text-lg font-bold text-slate-900 mb-3">{heading}</h2>
      <div className="bg-white rounded-none border border-black shadow-none overflow-hidden">
        <div className="relative w-full aspect-video bg-black">
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${video.video_id}`}
            title={video.title ?? heading}
            className="absolute inset-0 w-full h-full"
            allow="accelerometer; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            loading="lazy"
          />
        </div>
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 px-3 py-2 border-t border-black">
          {video.title && <p className="text-sm font-semibold text-slate-900">{video.title}</p>}
          <p className="text-xs text-slate-500">
            {video.creator_name && <>Video: {video.creator_url
              ? <a href={video.creator_url} target="_blank" rel="noopener noreferrer" className="underline hover:text-slate-900">{video.creator_name}</a>
              : video.creator_name} · </>}
            <a href={`https://www.youtube.com/watch?v=${video.video_id}`} target="_blank" rel="noopener noreferrer" className="underline hover:text-slate-900">Watch on YouTube</a>
          </p>
        </div>
      </div>
    </section>
  )
}
