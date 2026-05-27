/**
 * Détecte le type d'URL vidéo et retourne les infos nécessaires au player
 */

export type VideoType = 'youtube' | 'vimeo' | 'mp4'

export interface VideoInfo {
  type: VideoType
  embedUrl: string   // URL pour l'iframe (youtube/vimeo) ou src direct (mp4)
  posterUrl: string  // Miniature statique (youtube auto, vimeo via API, mp4 canvas)
}

export function detectVideoType(url: string): VideoType {
  if (/youtube\.com|youtu\.be/.test(url)) return 'youtube'
  if (/vimeo\.com/.test(url)) return 'vimeo'
  return 'mp4'
}

/**
 * Extrait l'ID YouTube depuis toutes les formes d'URL connues
 * https://www.youtube.com/watch?v=XXXXX
 * https://youtu.be/XXXXX
 * https://www.youtube.com/embed/XXXXX
 */
export function getYoutubeId(url: string): string | null {
  const patterns = [
    /[?&]v=([^&#]+)/,
    /youtu\.be\/([^?&#]+)/,
    /youtube\.com\/embed\/([^?&#]+)/,
    /youtube\.com\/shorts\/([^?&#]+)/,
  ]
  for (const p of patterns) {
    const m = url.match(p)
    if (m) return m[1]
  }
  return null
}

/**
 * Extrait l'ID Vimeo
 * https://vimeo.com/XXXXXXX
 */
export function getVimeoId(url: string): string | null {
  const m = url.match(/vimeo\.com\/(\d+)/)
  return m ? m[1] : null
}

export function getVideoInfo(url: string): VideoInfo {
  const type = detectVideoType(url)

  if (type === 'youtube') {
    const id = getYoutubeId(url)
    return {
      type,
      embedUrl:  id ? `https://www.youtube.com/embed/${id}?enablejsapi=1` : url,
      posterUrl: id ? `https://img.youtube.com/vi/${id}/hqdefault.jpg` : '',
    }
  }

  if (type === 'vimeo') {
    const id = getVimeoId(url)
    return {
      type,
      embedUrl:  id ? `https://player.vimeo.com/video/${id}` : url,
      // Vimeo ne fournit pas de miniature statique sans API — on utilisera un fond coloré
      posterUrl: '',
    }
  }

  // MP4 local ou distant
  return {
    type:      'mp4',
    embedUrl:  url,
    posterUrl: '', // généré via canvas côté client dans le composant
  }
}
