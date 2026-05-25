'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import Link from 'next/link'
import { fmtTC, calcGaps, calcCouverture } from '@/lib/types'
import { useReferentiel, TagInput, invalidateReferentielCache } from '@/lib/referentiel'
import type { Film, Segment } from '@/lib/types'

const SEG_COLORS = ['#AFA9EC','#9FE1CB','#F5C4B3','#FAC775','#85B7EB','#C0DD97','#F4C0D1']

interface SegFormData {
  tc_debut: string; tc_fin: string; titre: string
  personnes: string[]; evenements: string[]; lieux: string[]
  date_label: string; branches: string[]; note: string
}
const EMPTY_FORM: SegFormData = {
  tc_debut: '', tc_fin: '', titre: '',
  personnes: [], evenements: [], lieux: [],
  date_label: '', branches: [], note: ''
}

// ─── Formulaire segment — composant EXTERNE (évite la perte de focus) ───
interface SegFormProps {
  editingId: string
  form: SegFormData
  saving: boolean
  refPersonnes: string[]; refEvenements: string[]; refLieux: string[]; refBranches: string[]
  onChange: (field: keyof SegFormData, value: string | string[]) => void
  onSave: () => void
  onCancel: () => void
  onCapture: (field: 'tc_debut' | 'tc_fin') => void
}

function SegmentForm({ editingId, form, saving, refPersonnes, refEvenements, refLieux, refBranches, onChange, onSave, onCancel, onCapture }: SegFormProps) {
  return (
    <div className="card" style={{ background: '#EEEDFE', border: '1px solid #AFA9EC' }}>
      <div style={{ fontWeight: 500, fontSize: 13, marginBottom: 12 }}>
        {editingId === 'new' ? 'Nouveau segment' : 'Modifier le segment'}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>

        <div>
          <label>Timecode début (s) *</label>
          <div className="flex gap-2">
            <input type="number" value={form.tc_debut}
              onChange={e => onChange('tc_debut', e.target.value)} placeholder="0" />
            <button className="btn btn-sm" onClick={() => onCapture('tc_debut')}>⏱ Ici</button>
          </div>
          <div className="text-sm text-muted mt-1">{form.tc_debut ? fmtTC(parseInt(form.tc_debut)) : '—'}</div>
        </div>

        <div>
          <label>Timecode fin (s) *</label>
          <div className="flex gap-2">
            <input type="number" value={form.tc_fin}
              onChange={e => onChange('tc_fin', e.target.value)} placeholder="30" />
            <button className="btn btn-sm" onClick={() => onCapture('tc_fin')}>⏱ Ici</button>
          </div>
          <div className="text-sm text-muted mt-1">{form.tc_fin ? fmtTC(parseInt(form.tc_fin)) : '—'}</div>
        </div>

        <div style={{ gridColumn: '1 / -1' }}>
          <label>Titre du segment</label>
          <input type="text" value={form.titre}
            onChange={e => onChange('titre', e.target.value)} placeholder="Arrivée à Arcachon" />
        </div>

        <div style={{ gridColumn: '1 / -1' }}>
          <label>Personnes présentes</label>
          <TagInput values={form.personnes} suggestions={refPersonnes}
            onChange={v => onChange('personnes', v)}
            placeholder="Mamie, Papie…" tagClass="tag tag-person" />
        </div>

        <div>
          <label>Événements</label>
          <TagInput values={form.evenements} suggestions={refEvenements}
            onChange={v => onChange('evenements', v)}
            placeholder="Vacances, Mariage…" tagClass="tag tag-event" />
        </div>

        <div>
          <label>Lieux</label>
          <TagInput values={form.lieux} suggestions={refLieux}
            onChange={v => onChange('lieux', v)}
            placeholder="Arcachon, Lyon…" tagClass="tag tag-place" />
        </div>

        <div>
          <label>Date estimée</label>
          <input type="text" value={form.date_label}
            onChange={e => onChange('date_label', e.target.value)} placeholder="Été 1972" />
        </div>

        <div>
          <label>Branche(s)</label>
          <TagInput values={form.branches} suggestions={refBranches}
            onChange={v => onChange('branches', v)}
            placeholder="martin, commun…" tagClass="tag tag-branch" />
        </div>

        <div style={{ gridColumn: '1 / -1' }}>
          <label>Note libre</label>
          <textarea value={form.note}
            onChange={e => onChange('note', e.target.value)}
            placeholder="Arrivée en voiture, déchargement des valises…" />
        </div>
      </div>
      <div className="flex gap-2">
        <button className="btn btn-primary" onClick={onSave}
          disabled={saving || !form.tc_debut || !form.tc_fin}>
          {saving ? 'Enregistrement…' : '✓ Enregistrer'}
        </button>
        <button className="btn" onClick={onCancel}>Annuler</button>
      </div>
    </div>
  )
}

// ─── Page principale ───
export default function AdminFilmPage({ params }: { params: { id: string } }) {
  const [film, setFilm]           = useState<(Film & { segments: Segment[] }) | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm]           = useState<SegFormData>(EMPTY_FORM)
  const [saving, setSaving]       = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [playing, setPlaying]     = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const { byCategorie, load: reloadRef } = useReferentiel()

  const load = useCallback(async () => {
    const res = await fetch(`/api/films/${params.id}`)
    if (res.ok) setFilm(await res.json())
  }, [params.id])

  useEffect(() => { load() }, [load])

  const onTimeUpdate = () => {
    if (videoRef.current) setCurrentTime(videoRef.current.currentTime)
  }

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

  const startEdit = (seg: Segment) => {
    setEditingId(seg.id)
    setForm({
      tc_debut:   String(seg.tc_debut),
      tc_fin:     String(seg.tc_fin),
      titre:      seg.titre || '',
      personnes:  seg.personnes || [],
      evenements: seg.evenements || [],
      lieux:      seg.lieux || [],
      date_label: seg.date_label || '',
      branches:   seg.branches || [],
      note:       seg.note || '',
    })
  }

  const startNew = (tcDebut?: number, tcFin?: number) => {
    setEditingId('new')
    setForm({
      ...EMPTY_FORM,
      tc_debut: tcDebut !== undefined ? String(tcDebut) : '',
      tc_fin:   tcFin   !== undefined ? String(tcFin)   : '',
    })
  }

  const cancelEdit = () => { setEditingId(null); setForm(EMPTY_FORM) }

  const handleFormChange = useCallback((field: keyof SegFormData, value: string | string[]) => {
    setForm(f => ({ ...f, [field]: value }))
  }, [])

  const captureTC = useCallback((field: 'tc_debut' | 'tc_fin') => {
    if (videoRef.current)
      setForm(f => ({ ...f, [field]: String(Math.floor(videoRef.current!.currentTime)) }))
  }, [])

  const saveSegment = async () => {
    setSaving(true)
    const data = {
      film_id:    params.id,
      tc_debut:   parseInt(form.tc_debut) || 0,
      tc_fin:     parseInt(form.tc_fin) || 0,
      titre:      form.titre || null,
      personnes:  form.personnes,
      evenements: form.evenements,
      lieux:      form.lieux,
      date_label: form.date_label || null,
      branches:   form.branches,
      note:       form.note || null,
    }
    if (editingId === 'new') {
      await fetch('/api/segments', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
    } else {
      await fetch(`/api/segments/${editingId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
    }
    setSaving(false)
    cancelEdit()
    invalidateReferentielCache()
    await reloadRef()
    load()
  }

  const deleteSegment = async (id: string) => {
    if (!confirm('Supprimer ce segment ?')) return
    await fetch(`/api/segments/${id}`, { method: 'DELETE' })
    load()
  }

  if (!film) return (
    <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>Chargement…</div>
  )

  const segments   = film.segments || []
  const duree      = film.duree || 1
  const gaps       = calcGaps(segments, duree)
  const couverture = calcCouverture(segments, duree)

  type Block = { tc_debut: number; tc_fin: number; type: 'seg' | 'gap'; seg?: Segment; colorIdx?: number }
  const blocks: Block[] = [
    ...segments.map((s, i) => ({ tc_debut: s.tc_debut, tc_fin: s.tc_fin, type: 'seg' as const, seg: s, colorIdx: i % SEG_COLORS.length })),
    ...gaps.map(g => ({ ...g, type: 'gap' as const })),
  ].sort((a, b) => a.tc_debut - b.tc_debut)

  return (
    <>
      <nav>
        <span className="brand">Admin — Archives Super 8</span>
        <div className="nav-links">
          <Link href="/admin">← Films</Link>
          <Link href="/admin/referentiel">Référentiel</Link>
          <Link href={`/film/${film.id}`} target="_blank">Voir public ↗</Link>
        </div>
      </nav>

      <div className="container" style={{ paddingTop: '1.5rem', paddingBottom: '2rem' }}>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 600 }}>{film.titre}</h1>
            <div className="text-sm text-muted">
              {film.date_label || film.annee} · {fmtTC(film.duree)} · {film.fichier_url.split('/').pop()}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div style={{ textAlign: 'right' }}>
              <div className="text-sm text-muted">Couverture</div>
              <div style={{ fontSize: 18, fontWeight: 600, color: couverture >= 100 ? 'var(--teal)' : couverture > 0 ? 'var(--amber)' : 'var(--text-muted)' }}>
                {couverture}%
              </div>
            </div>
            <div style={{ width: 80 }}>
              <div className="progress-wrap">
                <div className="progress-fill" style={{ width: couverture + '%' }} />
              </div>
            </div>
            {couverture >= 100 && <span className="badge badge-ok">✓ Complété</span>}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 16, alignItems: 'start' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

            <div style={{ background: '#111', borderRadius: 10, overflow: 'hidden', aspectRatio: '16/9' }}>
              <video ref={videoRef} src={film.fichier_url}
                style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                onTimeUpdate={onTimeUpdate}
                onPlay={() => setPlaying(true)}
                onPause={() => setPlaying(false)} />
            </div>

            <div className="card flex items-center gap-2" style={{ padding: '0.6rem 0.875rem' }}>
              <button className="btn btn-sm" onClick={() => seekTo(Math.max(0, currentTime - 5))}>-5s</button>
              <button className="btn btn-sm btn-primary" onClick={() => {
                if (!videoRef.current) return
                if (playing) { videoRef.current.pause(); setPlaying(false) }
                else { videoRef.current.play(); setPlaying(true) }
              }}>{playing ? '⏸' : '▶'}</button>
              <button className="btn btn-sm" onClick={() => seekTo(Math.min(duree, currentTime + 5))}>+5s</button>
              <span className="font-mono text-sm" style={{ minWidth: 90, color: 'var(--text-muted)' }}>
                {fmtTC(currentTime)} / {fmtTC(duree)}
              </span>
              <input type="range" min={0} max={duree} step={1}
                value={Math.round(currentTime)}
                onChange={e => seekTo(Number(e.target.value))}
                style={{ flex: 1 }} />
            </div>

            <div className="card" style={{ padding: '0.75rem 1rem' }}>
              <div className="flex items-center justify-between mb-2">
                <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-muted)' }}>Timeline</span>
                <span className="text-sm text-muted">
                  {gaps.length > 0 ? `${gaps.reduce((a, g) => a + g.tc_fin - g.tc_debut, 0)}s non annotées` : '✓ Couverture complète'}
                </span>
              </div>
              <div style={{ position: 'relative', height: 16, marginBottom: 4 }}>
                {[0, 0.25, 0.5, 0.75, 1].map(ratio => (
                  <div key={ratio} style={{ position: 'absolute', left: (ratio * 100) + '%', transform: 'translateX(-50%)', fontSize: 10, color: 'var(--text-hint)', whiteSpace: 'nowrap' }}>
                    {fmtTC(Math.round(ratio * duree))}
                  </div>
                ))}
              </div>
              <div style={{ height: 20, display: 'flex', borderRadius: 4, overflow: 'hidden', border: '1px solid var(--gray-border)' }}>
                {blocks.map((b, i) => {
                  const w = ((b.tc_fin - b.tc_debut) / duree * 100).toFixed(2) + '%'
                  if (b.type === 'gap') return (
                    <div key={i} style={{ width: w, background: 'repeating-linear-gradient(45deg,#e0ddd8 0,#e0ddd8 2px,#f1efe8 2px,#f1efe8 6px)', cursor: 'pointer' }}
                      title={`Non annotée : ${fmtTC(b.tc_debut)} → ${fmtTC(b.tc_fin)}`}
                      onClick={() => startNew(b.tc_debut, b.tc_fin)} />
                  )
                  return (
                    <div key={i} style={{ width: w, background: SEG_COLORS[b.colorIdx!], cursor: 'pointer' }}
                      title={`${b.seg?.titre || 'Segment'} : ${fmtTC(b.tc_debut)} → ${fmtTC(b.tc_fin)}`}
                      onClick={() => jumpTo(b.tc_debut)} />
                  )
                })}
              </div>
              <div style={{ position: 'relative', height: 8, marginTop: 2, pointerEvents: 'none' }}>
                <div style={{ position: 'absolute', left: (currentTime / duree * 100) + '%', transform: 'translateX(-50%)', width: 2, height: 8, background: 'var(--purple)', borderRadius: 1 }} />
              </div>
              <div className="text-sm text-muted mt-2">Clic zone hachurée → nouveau segment · Clic segment → saute au timecode</div>
            </div>

            {editingId === null && (
              <button className="btn btn-primary" onClick={() => startNew()}>＋ Ajouter un segment</button>
            )}

            {editingId !== null && (
              <SegmentForm
                editingId={editingId} form={form} saving={saving}
                refPersonnes={byCategorie('personne')}
                refEvenements={byCategorie('evenement')}
                refLieux={byCategorie('lieu')}
                refBranches={byCategorie('branche')}
                onChange={handleFormChange}
                onSave={saveSegment}
                onCancel={cancelEdit}
                onCapture={captureTC}
              />
            )}
          </div>

          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '0.75rem 1rem', borderBottom: '1px solid var(--gray-border)', fontWeight: 500, fontSize: 13 }}>
              Segments ({segments.length})
            </div>
            {segments.length === 0 && (
              <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                Aucun segment.<br />
                <button className="btn btn-sm btn-primary mt-2" onClick={() => startNew(0, duree)}>Commencer à annoter</button>
              </div>
            )}
            {blocks.map((b, i) => {
              if (b.type === 'gap') return (
                <div key={`gap-${i}`} onClick={() => startNew(b.tc_debut, b.tc_fin)}
                  style={{ display: 'flex', alignItems: 'center', padding: '7px 10px', borderBottom: '1px solid var(--gray-border)', opacity: 0.5, gap: 8, cursor: 'pointer' }}>
                  <div style={{ width: 4, background: 'var(--gray-border)', alignSelf: 'stretch' }} />
                  <div style={{ flex: 1 }}>
                    <div className="font-mono text-sm" style={{ color: 'var(--text-hint)' }}>{fmtTC(b.tc_debut)} → {fmtTC(b.tc_fin)}</div>
                    <div style={{ fontSize: 11, fontStyle: 'italic', color: 'var(--text-hint)' }}>Non annotée — {b.tc_fin - b.tc_debut}s</div>
                  </div>
                </div>
              )
              const seg = b.seg!
              return (
                <div key={seg.id} style={{ borderBottom: '1px solid var(--gray-border)', background: editingId === seg.id ? '#EEEDFE' : 'transparent' }}>
                  <div style={{ display: 'flex', alignItems: 'stretch' }}>
                    <div style={{ width: 4, background: SEG_COLORS[b.colorIdx!], flexShrink: 0 }} />
                    <div style={{ flex: 1, padding: '8px 8px 8px 10px' }}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-mono text-sm" style={{ color: 'var(--text-muted)' }}>{fmtTC(seg.tc_debut)} → {fmtTC(seg.tc_fin)}</span>
                        <div className="flex gap-1">
                          <button className="btn btn-sm" onClick={() => jumpTo(seg.tc_debut)}>▶</button>
                          <button className="btn btn-sm" onClick={() => startEdit(seg)}>✎</button>
                          <button className="btn btn-sm btn-danger" onClick={() => deleteSegment(seg.id)}>✕</button>
                        </div>
                      </div>
                      {seg.titre && <div style={{ fontSize: 12, fontWeight: 500, marginBottom: 4 }}>{seg.titre}</div>}
                      <div className="flex wrap gap-1">
                        {(seg.personnes || []).map(p => <span key={p} className="tag tag-person">{p}</span>)}
                        {(seg.evenements || []).map(e => <span key={e} className="tag tag-event">{e}</span>)}
                        {(seg.lieux || []).map(l => <span key={l} className="tag tag-place">{l}</span>)}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </>
  )
}
