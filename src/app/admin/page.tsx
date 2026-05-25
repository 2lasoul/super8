'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useReferentiel, TagInput } from '@/lib/referentiel'
import type { Film } from '@/lib/types'

function slugify(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
}

const EMPTY_FORM = {
  id: '', titre: '', fichier_url: '',
  duree: '', annee: '', annee_fin: '', date_label: '',
  branches: [] as string[], description: '',
}
const REQUIRED = ['titre', 'fichier_url', 'duree'] as const

export default function AdminPage() {
  const [films, setFilms]       = useState<Film[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editFilm, setEditFilm] = useState<Film | null>(null)
  const [form, setForm]         = useState(EMPTY_FORM)
  const [touched, setTouched]   = useState<Record<string, boolean>>({})
  const [saving, setSaving]     = useState(false)
  const [loadingDuration, setLoadingDuration] = useState(false)
  const router = useRouter()
  const { byCategorie } = useReferentiel()
  const branchSuggestions = byCategorie('branche')

  const load = () => fetch('/api/films').then(r => {
    if (r.status === 401) { router.push('/admin/login'); return null }
    return r.json()
  }).then(d => d && setFilms(d))

  useEffect(() => { load() }, [])

  const logout = async () => {
    await fetch('/api/auth', { method: 'DELETE' })
    router.push('/admin/login')
  }

  const openAdd = () => {
    setEditFilm(null); setForm(EMPTY_FORM); setTouched({}); setShowForm(true)
  }

  const openEdit = (e: React.MouseEvent, film: Film) => {
    e.preventDefault(); e.stopPropagation()
    setEditFilm(film)
    setForm({
      id:          film.id,
      titre:       film.titre,
      fichier_url: film.fichier_url,
      duree:       String(film.duree),
      annee:       film.annee ? String(film.annee) : '',
      annee_fin:   film.annee_fin ? String(film.annee_fin) : '',
      date_label:  film.date_label || '',
      branches:    film.branches || [],
      description: film.description || '',
    })
    setTouched({})
    setShowForm(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const closeForm = () => { setShowForm(false); setEditFilm(null) }

  const handleTitreChange = (val: string) => {
    setForm(f => ({ ...f, titre: val, id: editFilm ? f.id : slugify(val) }))
  }

  const fetchDuration = () => {
    if (!form.fichier_url) return
    setLoadingDuration(true)
    const v = document.createElement('video')
    v.preload = 'metadata'
    v.onloadedmetadata = () => {
      setForm(f => ({ ...f, duree: String(Math.round(v.duration)) }))
      setLoadingDuration(false)
    }
    v.onerror = () => { alert('Impossible de lire les métadonnées.'); setLoadingDuration(false) }
    v.src = form.fichier_url
  }

  // Validation
  const errors: Record<string, string> = {}
  if (!form.titre)       errors.titre       = 'Le titre est obligatoire'
  if (!form.fichier_url) errors.fichier_url = "L'URL du fichier est obligatoire"
  if (!form.duree)       errors.duree       = 'La durée est obligatoire'
  if (form.annee_fin && form.annee && Number(form.annee_fin) < Number(form.annee))
    errors.annee_fin = 'Année de fin doit être ≥ année de début'

  const touch      = (field: string) => setTouched(t => ({ ...t, [field]: true }))
  const fieldError = (f: string) => touched[f] ? errors[f] : undefined
  const inputStyle = (field: string): React.CSSProperties =>
    fieldError(field) ? { borderColor: '#D0342C', boxShadow: '0 0 0 3px rgba(208,52,44,0.1)' } : {}

  const saveFilm = async () => {
    const allTouched: Record<string, boolean> = {}
    REQUIRED.forEach(k => { allTouched[k] = true })
    setTouched(allTouched)
    if (Object.keys(errors).length > 0) return
    setSaving(true)
    const payload = {
      id:          form.id || slugify(form.titre),
      titre:       form.titre,
      fichier_url: form.fichier_url,
      duree:       parseInt(form.duree) || 0,
      annee:       form.annee ? parseInt(form.annee) : null,
      annee_fin:   form.annee_fin ? parseInt(form.annee_fin) : null,
      date_label:  form.date_label || null,
      branches:    form.branches,
      description: form.description || null,
    }
    if (editFilm) {
      await fetch(`/api/films/${editFilm.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
      })
    } else {
      await fetch('/api/films', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
      })
    }
    setSaving(false)
    closeForm()
    load()
  }

  const deleteFilm = async (e: React.MouseEvent, id: string) => {
    e.preventDefault(); e.stopPropagation()
    if (!confirm('Supprimer ce film et tous ses segments ?')) return
    await fetch(`/api/films/${id}`, { method: 'DELETE' })
    load()
  }

  const statusBadge = (c: number) => {
    if (c >= 100) return <span className="badge badge-ok">Complété</span>
    if (c > 0)    return <span className="badge badge-partial">{c}%</span>
    return <span className="badge badge-empty">À annoter</span>
  }

  const years = films.map(f => [f.annee, f.annee_fin ?? f.annee]).flat().filter(Boolean) as number[]
  const yearMin = years.length ? Math.min(...years) : null
  const yearMax = years.length ? Math.max(...years) : null

  return (
    <>
      <nav>
        <span className="brand">Admin — Archives Super 8</span>
        <div className="nav-links">
          <Link href="/">← Site public</Link>
          <Link href="/admin/referentiel">Référentiel</Link>
          <button className="btn btn-sm" onClick={logout}>Déconnexion</button>
        </div>
      </nav>

      <div className="container" style={{ paddingTop: '1.5rem', paddingBottom: '2rem' }}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 600 }}>Films ({films.length})</h1>
            <p className="text-sm text-muted">
              {yearMin && yearMax && yearMin !== yearMax ? `Période : ${yearMin} – ${yearMax} · ` : yearMin ? `Année : ${yearMin} · ` : ''}
              {films.filter(f => (f.couverture || 0) >= 100).length} complétés ·{' '}
              {films.filter(f => (f.couverture || 0) > 0 && (f.couverture || 0) < 100).length} en cours ·{' '}
              {films.filter(f => (f.couverture || 0) === 0).length} à annoter
            </p>
          </div>
          <button className="btn btn-primary" onClick={showForm ? closeForm : openAdd}>
            {showForm ? '✕ Annuler' : '＋ Ajouter un film'}
          </button>
        </div>

        {/* Formulaire ajout / édition */}
        {showForm && (
          <div className="card mb-4" style={{ borderColor: editFilm ? '#AFA9EC' : 'var(--gray-border)' }}>
            <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 16 }}>
              {editFilm ? `Modifier — ${editFilm.titre}` : 'Nouveau film'}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>

              <div style={{ gridColumn: '1 / -1' }}>
                <label>Titre *</label>
                <input type="text" value={form.titre}
                  onChange={e => handleTitreChange(e.target.value)}
                  onBlur={() => touch('titre')}
                  placeholder="Été à Arcachon"
                  style={inputStyle('titre')} />
                {fieldError('titre') && <div style={{ color: '#D0342C', fontSize: 12, marginTop: 3 }}>{fieldError('titre')}</div>}
              </div>

              <div style={{ gridColumn: '1 / -1' }}>
                <label>Identifiant (slug)</label>
                <input type="text" value={form.id}
                  onChange={e => setForm(f => ({ ...f, id: e.target.value }))}
                  readOnly={!editFilm}
                  style={{ background: 'var(--gray-bg)', fontFamily: 'monospace', fontSize: 12 }} />
                {!editFilm && <div className="text-sm text-muted mt-1">Généré depuis le titre</div>}
              </div>

              <div style={{ gridColumn: '1 / -1' }}>
                <label>URL du fichier MP4 *</label>
                <input type="text" value={form.fichier_url}
                  onChange={e => setForm(f => ({ ...f, fichier_url: e.target.value }))}
                  onBlur={() => touch('fichier_url')}
                  placeholder="https://… ou /videos/mon-film.mp4"
                  style={inputStyle('fichier_url')} />
                {fieldError('fichier_url') && <div style={{ color: '#D0342C', fontSize: 12, marginTop: 3 }}>{fieldError('fichier_url')}</div>}
              </div>

              <div>
                <label>Durée (secondes) *</label>
                <div className="flex gap-2">
                  <input type="number" value={form.duree}
                    onChange={e => setForm(f => ({ ...f, duree: e.target.value }))}
                    onBlur={() => touch('duree')}
                    placeholder="260"
                    style={{ ...inputStyle('duree'), flex: 1 }} />
                  <button className="btn btn-sm" onClick={fetchDuration}
                    disabled={!form.fichier_url || loadingDuration}>
                    {loadingDuration ? '…' : '⏱ Auto'}
                  </button>
                </div>
                {fieldError('duree') && <div style={{ color: '#D0342C', fontSize: 12, marginTop: 3 }}>{fieldError('duree')}</div>}
                {form.duree && !errors.duree && (
                  <div className="text-sm text-muted mt-1">
                    {Math.floor(Number(form.duree) / 60)}min {Number(form.duree) % 60}s
                  </div>
                )}
              </div>

              <div>
                <label>Libellé de période</label>
                <input type="text" value={form.date_label}
                  onChange={e => setForm(f => ({ ...f, date_label: e.target.value }))}
                  placeholder="Été 1972" />
              </div>

              <div>
                <label>Année de début</label>
                <input type="number" value={form.annee}
                  onChange={e => setForm(f => ({ ...f, annee: e.target.value }))}
                  placeholder="1972" min="1900" max="2100" />
              </div>

              <div>
                <label>Année de fin <span className="text-muted">(si plusieurs années)</span></label>
                <input type="number" value={form.annee_fin}
                  onChange={e => setForm(f => ({ ...f, annee_fin: e.target.value }))}
                  onBlur={() => touch('annee_fin')}
                  placeholder="1974" min="1900" max="2100"
                  style={inputStyle('annee_fin')} />
                {fieldError('annee_fin') && <div style={{ color: '#D0342C', fontSize: 12, marginTop: 3 }}>{fieldError('annee_fin')}</div>}
              </div>

              {/* Branches — TagInput branché sur le référentiel */}
              <div style={{ gridColumn: '1 / -1' }}>
                <label>Branches familiales</label>
                <TagInput
                  values={form.branches}
                  suggestions={branchSuggestions}
                  onChange={v => setForm(f => ({ ...f, branches: v }))}
                  placeholder="martin, leblanc, commun…"
                  tagClass="tag tag-branch"
                />
                {branchSuggestions.length === 0 && (
                  <div className="text-sm text-muted mt-1">
                    Aucune branche dans le référentiel —{' '}
                    <Link href="/admin/referentiel" style={{ color: 'var(--purple)' }}>en créer une</Link>
                  </div>
                )}
              </div>

              <div style={{ gridColumn: '1 / -1' }}>
                <label>Description</label>
                <textarea value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
              </div>
            </div>

            <div className="flex gap-2 items-center">
              <button className="btn btn-primary" onClick={saveFilm} disabled={saving}>
                {saving ? 'Enregistrement…' : editFilm ? '✓ Mettre à jour' : '✓ Ajouter le film'}
              </button>
              <button className="btn" onClick={closeForm}>Annuler</button>
              {Object.keys(errors).length > 0 && Object.keys(touched).length > 0 && (
                <span style={{ fontSize: 12, color: '#D0342C' }}>Certains champs obligatoires sont manquants</span>
              )}
            </div>
          </div>
        )}

        {/* Liste films */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {films.map(film => (
            <Link key={film.id} href={`/admin/film/${film.id}`}>
              <div className="card flex items-center gap-3"
                style={{ cursor: 'pointer', transition: 'border-color 0.1s' }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.borderColor = '#aaa'}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.borderColor = 'var(--gray-border)'}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 500, fontSize: 13 }}>{film.titre}</div>
                  <div className="text-sm text-muted">
                    {film.date_label || (film.annee_fin && film.annee !== film.annee_fin ? `${film.annee}–${film.annee_fin}` : film.annee)}
                    {' · '}{Math.floor(film.duree / 60)}:{String(film.duree % 60).padStart(2, '0')}
                  </div>
                </div>
                <div style={{ width: 120 }}>
                  <div className="progress-wrap">
                    <div className="progress-fill" style={{ width: (film.couverture || 0) + '%' }} />
                  </div>
                </div>
                {statusBadge(film.couverture || 0)}
                <div className="flex wrap gap-1">
                  {(film.branches || []).map(b => <span key={b} className="tag tag-branch">{b}</span>)}
                </div>
                <button className="btn btn-sm" onClick={e => openEdit(e, film)}>✎</button>
                <button className="btn btn-sm btn-danger" onClick={e => deleteFilm(e, film.id)}>✕</button>
                <span style={{ color: 'var(--text-hint)', fontSize: 16 }}>→</span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </>
  )
}
