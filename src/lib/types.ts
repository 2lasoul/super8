export interface Film {
  id: string
  titre: string
  fichier_url: string
  duree: number
  annee: number | null
  annee_fin: number | null
  date_label: string | null
  description: string | null
  branches: string[]
  couverture?: number   // calculé : % de secondes annotées
  created_at?: string
  updated_at?: string
}

export interface Segment {
  id: string
  film_id: string
  tc_debut: number
  tc_fin: number
  titre: string | null
  personnes: string[]
  evenements: string[]
  lieux: string[]
  date_label: string | null
  branches: string[]
  note: string | null
  created_at?: string
  updated_at?: string
}

export interface Gap {
  tc_debut: number
  tc_fin: number
}

export function calcCouverture(segments: Segment[], duree: number): number {
  if (duree <= 0) return 0
  const total = segments.reduce((acc, s) => acc + (s.tc_fin - s.tc_debut), 0)
  return Math.round((total / duree) * 100)
}

export function calcGaps(segments: Segment[], duree: number): Gap[] {
  if (duree <= 0) return []
  const sorted = [...segments].sort((a, b) => a.tc_debut - b.tc_debut)
  const gaps: Gap[] = []
  let cursor = 0
  for (const s of sorted) {
    if (s.tc_debut > cursor) gaps.push({ tc_debut: cursor, tc_fin: s.tc_debut })
    cursor = Math.max(cursor, s.tc_fin)
  }
  if (cursor < duree) gaps.push({ tc_debut: cursor, tc_fin: duree })
  return gaps
}

export function fmtTC(sec: number): string {
  const m = Math.floor(sec / 60)
  const s = Math.floor(sec % 60).toString().padStart(2, '0')
  return `${m}:${s}`
}

export function parseJSON<T>(val: unknown, fallback: T): T {
  if (Array.isArray(val)) return val as unknown as T
  if (typeof val === 'string') {
    try { return JSON.parse(val) } catch { return fallback }
  }
  return fallback
}
