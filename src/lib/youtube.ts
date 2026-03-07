export function getYouTubeEmbedUrl(url: string | null): string | null {
  if (!url) return null

  try {
    if (url.includes('youtu.be/')) {
      const id = url.split('youtu.be/')[1].split('?')[0]
      return `https://www.youtube.com/embed/${id}`
    }

    if (url.includes('watch?v=')) {
      const id = new URL(url).searchParams.get('v')
      if (id) return `https://www.youtube.com/embed/${id}`
    }

    if (url.includes('/embed/')) return url

    return null
  } catch {
    return null
  }
}
