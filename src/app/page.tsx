'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { useReferentiel } from '@/lib/referentiel'
import type { Film } from '@/lib/types'
import type { RefItem } from '@/lib/referentiel'

// Palette de couleurs par défaut pour les branches sans couleur définie
const DEFAULT_COLORS = ['#AFA9EC','#9FE1CB','#FAC775','#F5C4B3','#85B7EB','#C0DD97']
const DEFAULT_TEXTS  = ['#26215C','#04342C','#412402','#4A1B0C','#042C53','#1A3010']



export default function HomePage() {
  const [films, setFilms]     = useState<Film[]>([])
  const [filter, setFilter]   = useState('all')
  const [tooltip, setTooltip] = useState<{ film: Film; x: number; y: number } | null>(null)
  const { items: refItems }   = useReferentiel()

  useEffect(() => {
    fetch('/api/films').then(r => r.json()).then(setFilms)
  }, [])

  // Branches depuis le référentiel, avec fallback sur les branches des films
  const refBranches: RefItem[] = refItems.filter(i => i.categorie === 'branche')
  const filmBranches: string[] = Array.from(new Set(films.flatMap(f => f.branches || [])))
  // Fusionner : toutes les branches connues
  const allBranchKeys = Array.from(new Set([
    ...refBranches.map(b => b.valeur),
    ...filmBranches,
  ]))

  // Résoudre couleur bg/text pour une branche
  const getBranchColor = (key: string, idx: number): { bg: string; text: string; label: string } => {
    const ref = refBranches.find(b => b.valeur === key)
    if (ref?.couleur) {
      // Calculer une couleur de texte contrastée basique
      const hex = ref.couleur.replace('#','')
      const r = parseInt(hex.slice(0,2),16), g = parseInt(hex.slice(2,4),16), b = parseInt(hex.slice(4,6),16)
      const lum = (0.299*r + 0.587*g + 0.114*b) / 255
      return { bg: ref.couleur, text: lum > 0.5 ? '#1a1a18' : '#fff', label: key }
    }
    const colorIdx = idx % DEFAULT_COLORS.length
    return { bg: DEFAULT_COLORS[colorIdx], text: DEFAULT_TEXTS[colorIdx], label: key }
  }

  const branchColorMap: Record<string, { bg: string; text: string; label: string }> = {}
  allBranchKeys.forEach((k, i) => { branchColorMap[k] = getBranchColor(k, i) })

  const startYears = films.map(f => f.annee).filter(Boolean) as number[]
  const endYears   = films.map(f => f.annee_fin ?? f.annee).filter(Boolean) as number[]
  const yearMin = startYears.length ? Math.min(...startYears) - 1 : 1960
  const yearMax = endYears.length   ? Math.max(...endYears)   + 3 : 1985
  const span = yearMax - yearMin

  const pct = (y: number) => ((y - yearMin) / span * 100).toFixed(2) + '%'

  const tickYears: number[] = []
  for (let y = yearMin; y <= yearMax; y += 2) tickYears.push(y)

  const handleMouseEnter = useCallback((e: React.MouseEvent, film: Film) => {
    const rect = (e.currentTarget as HTMLElement).closest('.frise-outer')!.getBoundingClientRect()
    setTooltip({ film, x: e.clientX - rect.left + 12, y: e.clientY - rect.top + 12 })
  }, [])

  return (
    <>
      <nav>
        <span className="brand">Archives Super 8</span>
        <div className="nav-links">
          <Link href="/">Frise</Link>
          <Link href="/admin">Administration</Link>
        </div>
      </nav>

      <div className="container">
        <div className="page-header">
          <h1>Archives familiales</h1>
          <p>{films.length} films numérisés · {yearMin} – {yearMax}</p>
        </div>

        {/* Filtres branches */}
        <div className="chips mb-4">
          <button className={`chip ${filter === 'all' ? 'active' : ''}`} onClick={() => setFilter('all')}>
            Toutes les branches
          </button>
          {allBranchKeys.map(k => (
            <button key={k} className={`chip ${filter === k ? 'active' : ''}`} onClick={() => setFilter(k)}>
              {branchColorMap[k]?.label ?? k}
            </button>
          ))}
        </div>

        {/* Frise */}
        <div className="card" style={{ padding: '1rem', position: 'relative', overflow: 'visible' }}>
          <div className="frise-outer" style={{ position: 'relative' }}>
            <div style={{ position: 'relative', height: 28, marginBottom: 4 }}>
              {tickYears.map(y => (
                <div key={y} style={{ position: 'absolute', left: pct(y), transform: 'translateX(-50%)' }}>
                  <span style={{ fontSize: 11, color: 'var(--text-hint)', whiteSpace: 'nowrap' }}>{y}</span>
                  <div style={{ width: 1, height: 6, background: 'var(--gray-border)', margin: '2px auto 0' }} />
                </div>
              ))}
            </div>
            <div style={{ height: 1, background: 'var(--gray-border)', marginBottom: 8 }} />

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, paddingBottom: 8, overflow: 'hidden' }}>
              {films.map(film => {
                const branches = film.branches || []
                const mainBranch = branches[0] || ''
                const colorIdx = allBranchKeys.indexOf(mainBranch)
                const color = branchColorMap[mainBranch] || { bg: '#ccc', text: '#444', label: mainBranch }
                const faded = filter !== 'all' && !branches.includes(filter)
                const annee    = film.annee ?? yearMin
                const anneeFin = film.annee_fin ?? annee
                const leftPct  = Math.max(0, (annee    - yearMin) / span * 100)
                const rightPct = Math.min(95, (anneeFin + 0.9 - yearMin) / span * 100)
                const width    = Math.max(1.5, rightPct - leftPct)

                return (
                  <div key={film.id} style={{ position: 'relative', height: 32 }}>
                    <Link href={`/film/${film.id}`}>
                      <div
                        onMouseEnter={e => handleMouseEnter(e, film)}
                        onMouseLeave={() => setTooltip(null)}
                        style={{
                          position: 'absolute', left: leftPct.toFixed(2) + '%',
                          width: `${width}%`, minWidth: 24, height: 28, top: 2,
                          background: color.bg, borderRadius: 4,
                          display: 'flex', alignItems: 'center', padding: '0 8px',
                          overflow: 'hidden',
                          opacity: faded ? 0.15 : 1, transition: 'opacity 0.15s', cursor: 'pointer',
                        }}
                      >
                        <span style={{ fontSize: 11, fontWeight: 500, color: color.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {film.titre}
                        </span>
                      </div>
                    </Link>
                  </div>
                )
              })}
            </div>

            {/* Légende dynamique */}
            <div style={{ display: 'flex', gap: 16, paddingTop: 8, borderTop: '1px solid var(--gray-border)', flexWrap: 'wrap' }}>
              {allBranchKeys.map(k => (
                <div key={k} className="flex items-center gap-1">
                  <div style={{ width: 10, height: 10, borderRadius: 2, background: branchColorMap[k]?.bg || '#ccc' }} />
                  <span className="text-sm text-muted">{k}</span>
                </div>
              ))}
            </div>

            {/* Tooltip */}
            {tooltip && (
              <div style={{
                position: 'absolute', left: tooltip.x, top: tooltip.y,
                background: 'var(--white)', border: '1px solid var(--gray-border)',
                borderRadius: 8, padding: '8px 12px', zIndex: 20,
                pointerEvents: 'none', minWidth: 180, maxWidth: 260,
              }}>
                <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 4 }}>{tooltip.film.titre}</div>
                <div className="text-sm text-muted" style={{ marginBottom: 6 }}>
                  {tooltip.film.date_label || tooltip.film.annee}
                  {tooltip.film.annee_fin && tooltip.film.annee_fin !== tooltip.film.annee ? ` – ${tooltip.film.annee_fin}` : ''}
                  {' · '}{Math.floor((tooltip.film.duree || 0) / 60)}min
                </div>
                {typeof tooltip.film.couverture === 'number' && (
                  <div className="flex items-center gap-2">
                    <div className="progress-wrap flex-1">
                      <div className="progress-fill" style={{ width: tooltip.film.couverture + '%' }} />
                    </div>
                    <span className="text-sm text-muted">{tooltip.film.couverture}%</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Grille films */}
        <div style={{ marginTop: '1.5rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12, paddingBottom: '2rem' }}>
          {films
            .filter(f => filter === 'all' || (f.branches || []).includes(filter))
            .map(film => {
              const mainBranch = (film.branches || [])[0] || ''
              const color = branchColorMap[mainBranch] || { bg: '#ccc', text: '#444', label: mainBranch }
              return (
                <Link key={film.id} href={`/film/${film.id}`}>
                  <div className="card" style={{ cursor: 'pointer', transition: 'border-color 0.1s' }}
                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.borderColor = '#aaa'}
                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.borderColor = 'var(--gray-border)'}
                  >
                    <div style={{ aspectRatio: '16/9', background: color.bg + '33', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 10, fontSize: 28 }}>▶</div>
                    <div style={{ fontWeight: 500, fontSize: 13, marginBottom: 4 }}>{film.titre}</div>
                    <div className="text-sm text-muted" style={{ marginBottom: 8 }}>
                      {film.date_label || (film.annee_fin && film.annee !== film.annee_fin ? `${film.annee}–${film.annee_fin}` : film.annee)}
                    </div>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="progress-wrap flex-1">
                        <div className="progress-fill" style={{ width: (film.couverture || 0) + '%' }} />
                      </div>
                      <span className="text-sm text-muted">{film.couverture || 0}%</span>
                    </div>
                    <div className="flex wrap gap-1">
                      {(film.branches || []).map(b => (
                        <span key={b} className="tag tag-branch">{b}</span>
                      ))}
                    </div>
                  </div>
                </Link>
              )
            })}
        </div>
      </div>
    </>
  )
}
