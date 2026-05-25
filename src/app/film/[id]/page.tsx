'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import Link from 'next/link'
import { fmtTC, calcGaps } from '@/lib/types'
import type { Film, Segment } from '@/lib/types'

const SEG_COLORS = ['#AFA9EC','#9FE1CB','#F5C4B3','#FAC775','#85B7EB','#C0DD97','#F4C0D1']

export default function FilmPage({ params }: { params: { id: string } }) {
  const [data, setData]               = useState<(Film & { segments: Segment[] }) | null>(null)
  const [currentTime, setCurrentTime] = useState(0)
  const [playing, setPlaying]         = useState(false)
  const [showAnnotations, setShowAnnotations] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const listRef  = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetch(`/api/films/${params.id}`).then(r => r.json()).then(setData)
  }, [params.id])

  const onTimeUpdate = useCallback(() => {
    if (videoRef.current) setCurrentTime(videoRef.current.currentTime)
  }, [])

  const seekTo = (sec: number) => {
    if (!videoRef.current) return
    videoRef.current.currentTime = sec
  }

  const jumpTo = (sec: number) => {
    if (!videoRef.current) return
    videoRef.current.currentTime = sec
    videoRef.current.play()
    setPlaying(true)
  }

  const togglePlay = () => {
    if (!videoRef.current) return
    if (playing) { videoRef.current.pause(); setPlaying(false) }
    else { videoRef.current.play(); setPlaying(true) }
  }

  // Auto-scroll segment actif dans le panneau
  useEffect(() => {
    if (!listRef.current || !showAnnotations) return
    const active = listRef.current.querySelector('[data-active="true"]') as HTMLElement
    if (active) active.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }, [currentTime, showAnnotations])

  if (!data) return (
    <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>Chargement…</div>
  )

  const segments      = data.segments || []
  const gaps          = calcGaps(segments, data.duree)
  const duree         = data.duree || 1
  const activeSegment = segments.find(s => currentTime >= s.tc_debut && currentTime < s.tc_fin)

  type Block = { tc_debut: number; tc_fin: number; type: 'seg' | 'gap'; colorIdx?: number }
  const blocks: Block[] = [
    ...segments.map((s, i) => ({ tc_debut: s.tc_debut, tc_fin: s.tc_fin, type: 'seg' as const, colorIdx: i % SEG_COLORS.length })),
    ...gaps.map(g => ({ ...g, type: 'gap' as const })),
  ].sort((a, b) => a.tc_debut - b.tc_debut)

  const allItems = [
    ...segments.map(s => ({ ...s, _type: 'seg' as const })),
    ...gaps.map(g => ({
      ...g, _type: 'gap' as const,
      id: `gap-${g.tc_debut}`, titre: null, personnes: [], evenements: [],
      lieux: [], branches: [], date_label: null, note: null, film_id: data.id
    })),
  ].sort((a, b) => a.tc_debut - b.tc_debut)

  return (
    <>
      <nav>
        <span className="brand">Archives Super 8</span>
        <div className="nav-links">
          <Link href="/">← Frise</Link>
        </div>
      </nav>

      <div className="container" style={{ paddingTop: '1.5rem', paddingBottom: '2rem' }}>

        {/* Ligne player + panneau annotations côte à côte */}
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', marginBottom: 8 }}>

          {/* Bloc vidéo — rétrécit quand les annotations sont ouvertes */}
          <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 0 }}>
            <div style={{ position: 'relative', background: '#111', borderRadius: 12, overflow: 'hidden', aspectRatio: '16/9' }}>
              <video
                ref={videoRef}
                src={data.fichier_url}
                style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                onTimeUpdate={onTimeUpdate}
                onPlay={() => setPlaying(true)}
                onPause={() => setPlaying(false)}
                onEnded={() => setPlaying(false)}
                onClick={togglePlay}
              />
              {/* Titre overlay bas gauche */}
              <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '2rem 1.25rem 1rem', background: 'linear-gradient(transparent, rgba(0,0,0,0.65))', pointerEvents: 'none' }}>
                <div style={{ fontWeight: 500, fontSize: 18, color: '#fff' }}>{data.titre}</div>
                <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)' }}>{data.date_label || data.annee}</div>
              </div>
              {/* Bouton toggle annotations — toujours visible en haut à droite de la vidéo */}
              <button
                onClick={() => setShowAnnotations(s => !s)}
                style={{
                  position: 'absolute', top: 12, right: 12,
                  background: showAnnotations ? 'rgba(83,74,183,0.85)' : 'rgba(0,0,0,0.5)',
                  border: 'none', borderRadius: 6, padding: '6px 12px',
                  color: '#fff', fontSize: 12, fontWeight: 500, cursor: 'pointer',
                  backdropFilter: 'blur(4px)',
                  display: 'flex', alignItems: 'center', gap: 6,
                }}
              >
                {showAnnotations ? '✕ Fermer' : `🏷 ${segments.length} annotation${segments.length > 1 ? 's' : ''}`}
              </button>
            </div>
          </div>

          {/* Panneau annotations — colonne à droite, même hauteur que la vidéo */}
          {showAnnotations && (
            <div style={{ width: 300, flexShrink: 0 }}>
              <div
                ref={listRef}
                style={{
                  background: '#1e1e1c',
                  borderRadius: 12,
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column',
                  // Hauteur calculée pour coller à la vidéo : 9/16 de la largeur vidéo
                  // On utilise la même logique aspect-ratio via un trick CSS
                  aspectRatio: `${showAnnotations ? '300 / ' + Math.round(300 * 9/16 * (1 + 300 / (document?.querySelector?.('.container')?.clientWidth || 1000))) : '16/9'}`,
                  maxHeight: '70vh',
                }}
              >
                {/* En-tête */}
                <div style={{ padding: '12px 14px', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.6)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                    {segments.length} annotation{segments.length > 1 ? 's' : ''}
                  </span>
                  <button onClick={() => setShowAnnotations(false)}
                    style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', fontSize: 16, lineHeight: 1, padding: '2px 4px' }}
                    title="Fermer">✕</button>
                </div>

                {/* Liste scrollable */}
                <div style={{ overflowY: 'auto', flex: 1 }}>
                  {segments.length === 0 && (
                    <div style={{ padding: '1.5rem', textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: 13 }}>
                      Aucune annotation sur ce film.
                    </div>
                  )}

                  {allItems.map((item) => {
                    const isActive = item._type === 'seg' && activeSegment?.id === item.id
                    const colorIdx = item._type === 'seg'
                      ? segments.findIndex(s => s.id === item.id) % SEG_COLORS.length
                      : -1

                    if (item._type === 'gap') return (
                      <div key={item.id} style={{ padding: '8px 14px', borderBottom: '1px solid rgba(255,255,255,0.05)', opacity: 0.3 }}>
                        <div style={{ fontSize: 11, fontFamily: 'monospace', color: 'rgba(255,255,255,0.5)' }}>
                          {fmtTC(item.tc_debut)} → {fmtTC(item.tc_fin)}
                        </div>
                        <div style={{ fontSize: 11, fontStyle: 'italic', color: 'rgba(255,255,255,0.35)' }}>Séquence non annotée</div>
                      </div>
                    )

                    return (
                      <div
                        key={item.id}
                        data-active={isActive ? 'true' : 'false'}
                        onClick={() => jumpTo(item.tc_debut)}
                        style={{
                          padding: '10px 14px',
                          borderBottom: '1px solid rgba(255,255,255,0.06)',
                          borderLeft: `3px solid ${isActive ? SEG_COLORS[colorIdx] : 'transparent'}`,
                          background: isActive ? 'rgba(255,255,255,0.07)' : 'transparent',
                          cursor: 'pointer',
                          transition: 'background 0.1s',
                        }}
                        onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.04)' }}
                        onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = 'transparent' }}
                      >
                        <div style={{ fontSize: 11, fontFamily: 'monospace', color: isActive ? SEG_COLORS[colorIdx] : 'rgba(255,255,255,0.4)', marginBottom: 4 }}>
                          {fmtTC(item.tc_debut)} → {fmtTC(item.tc_fin)}
                        </div>
                        {item.titre && (
                          <div style={{ fontSize: 13, fontWeight: 500, color: '#fff', marginBottom: 5 }}>{item.titre}</div>
                        )}
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                          {(item.personnes || []).map(p => (
                            <span key={p} style={{ fontSize: 10, padding: '2px 7px', borderRadius: 99, background: 'rgba(250,199,117,0.15)', color: '#FAC775' }}>{p}</span>
                          ))}
                          {(item.evenements || []).map(e => (
                            <span key={e} style={{ fontSize: 10, padding: '2px 7px', borderRadius: 99, background: 'rgba(175,169,236,0.15)', color: '#AFA9EC' }}>{e}</span>
                          ))}
                          {(item.lieux || []).map(l => (
                            <span key={l} style={{ fontSize: 10, padding: '2px 7px', borderRadius: 99, background: 'rgba(159,225,203,0.15)', color: '#9FE1CB' }}>{l}</span>
                          ))}
                        </div>
                        {item.note && (
                          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginTop: 5, fontStyle: 'italic' }}>{item.note}</div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Contrôles */}
        <div className="card flex items-center gap-3" style={{ padding: '0.75rem 1rem', marginBottom: 16 }}>
          <button className="btn btn-sm" onClick={() => seekTo(Math.max(0, currentTime - 10))}>⏪ 10s</button>
          <button className="btn btn-sm btn-primary" onClick={togglePlay}>{playing ? '⏸ Pause' : '▶ Lecture'}</button>
          <button className="btn btn-sm" onClick={() => seekTo(Math.min(duree, currentTime + 10))}>10s ⏩</button>
          <span className="font-mono text-sm text-muted" style={{ minWidth: 90 }}>{fmtTC(currentTime)} / {fmtTC(duree)}</span>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
            <input type="range" min={0} max={duree} step={1}
              value={Math.round(currentTime)}
              onChange={e => seekTo(Number(e.target.value))}
              style={{ width: '100%' }} />
            {/* Barre segments colorés */}
            <div style={{ height: 6, display: 'flex', borderRadius: 99, overflow: 'hidden', border: '1px solid var(--gray-border)' }}>
              {blocks.map((b, i) => {
                const w = ((b.tc_fin - b.tc_debut) / duree * 100).toFixed(2) + '%'
                return b.type === 'seg'
                  ? <div key={i} style={{ width: w, background: SEG_COLORS[b.colorIdx!], cursor: 'pointer' }} onClick={() => jumpTo(b.tc_debut)} title={fmtTC(b.tc_debut)} />
                  : <div key={i} style={{ width: w, background: 'repeating-linear-gradient(45deg,#e0ddd8 0,#e0ddd8 2px,#f1efe8 2px,#f1efe8 6px)' }} />
              })}
            </div>
          </div>
        </div>

        {/* Segment actif sous les contrôles */}
        {activeSegment && (
          <div style={{
            background: 'var(--white)', border: '1px solid var(--gray-border)',
            borderRadius: 8, padding: '10px 14px', marginBottom: 16,
            borderLeft: `4px solid ${SEG_COLORS[segments.findIndex(s => s.id === activeSegment.id) % SEG_COLORS.length]}`,
          }}>
            <div style={{ fontSize: 11, fontFamily: 'monospace', color: 'var(--text-muted)', marginBottom: 4 }}>
              En cours · {fmtTC(activeSegment.tc_debut)} → {fmtTC(activeSegment.tc_fin)}
            </div>
            {activeSegment.titre && <div style={{ fontWeight: 500, fontSize: 14, marginBottom: 5 }}>{activeSegment.titre}</div>}
            <div className="flex wrap gap-1">
              {(activeSegment.personnes || []).map(p => <span key={p} className="tag tag-person">{p}</span>)}
              {(activeSegment.evenements || []).map(e => <span key={e} className="tag tag-event">{e}</span>)}
              {(activeSegment.lieux || []).map(l => <span key={l} className="tag tag-place">{l}</span>)}
            </div>
            {activeSegment.note && <div className="text-sm text-muted mt-1" style={{ fontStyle: 'italic' }}>{activeSegment.note}</div>}
          </div>
        )}

        {/* Infos film */}
        <div className="card">
          <div style={{ fontWeight: 500, marginBottom: 6 }}>{data.titre}</div>
          {data.description && <p className="text-sm text-muted" style={{ marginBottom: 8 }}>{data.description}</p>}
          <div className="flex wrap gap-1">
            {(data.branches || []).map(b => <span key={b} className="tag tag-branch">{b}</span>)}
          </div>
        </div>
      </div>
    </>
  )
}
