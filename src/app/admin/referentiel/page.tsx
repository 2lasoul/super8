'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useReferentiel } from '@/lib/referentiel'
import type { RefItem } from '@/lib/referentiel'

type Cat = RefItem['categorie']

const CATS: { key: Cat; label: string; tagClass: string; placeholder: string; color: string }[] = [
  { key: 'branche',   label: 'Branches',    tagClass: 'tag tag-branch',  placeholder: 'ex : martin',   color: '#FBEAF0' },
  { key: 'personne',  label: 'Personnes',   tagClass: 'tag tag-person',  placeholder: 'ex : Mamie',    color: '#FAEEDA' },
  { key: 'evenement', label: 'Événements',  tagClass: 'tag tag-event',   placeholder: 'ex : Mariage',  color: '#EEEDFE' },
  { key: 'lieu',      label: 'Lieux',       tagClass: 'tag tag-place',   placeholder: 'ex : Arcachon', color: '#E1F5EE' },
]

export default function ReferentielPage() {
  const { items, load } = useReferentiel()
  const [activeTab, setActiveTab]   = useState<Cat>('branche')
  const [newVal, setNewVal]         = useState('')
  const [newCouleur, setNewCouleur] = useState('')
  const [editingId, setEditingId]   = useState<number | null>(null)
  const [editVal, setEditVal]       = useState('')
  const [editCouleur, setEditCouleur] = useState('')
  const [saving, setSaving]         = useState(false)
  const router = useRouter()

  const activeCat  = CATS.find(c => c.key === activeTab)!
  const activeItems = items.filter(i => i.categorie === activeTab)

  const add = async () => {
    if (!newVal.trim()) return
    setSaving(true)
    await fetch('/api/referentiel', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ categorie: activeTab, valeur: newVal.trim(), couleur: newCouleur || null }),
    })
    setNewVal(''); setNewCouleur('')
    setSaving(false)
    load()
  }

  const remove = async (id: number) => {
    if (!confirm('Supprimer cette entrée du référentiel ?')) return
    await fetch(`/api/referentiel/${id}`, { method: 'DELETE' })
    load()
  }

  const startEdit = (item: RefItem) => {
    setEditingId(item.id)
    setEditVal(item.valeur)
    setEditCouleur(item.couleur || '')
  }

  const saveEdit = async () => {
    if (!editingId) return
    await fetch(`/api/referentiel/${editingId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ valeur: editVal, couleur: editCouleur || null }),
    })
    setEditingId(null)
    load()
  }

  return (
    <>
      <nav>
        <span className="brand">Admin — Archives Super 8</span>
        <div className="nav-links">
          <Link href="/admin">← Films</Link>
          <Link href="/">Site public</Link>
        </div>
      </nav>

      <div className="container" style={{ paddingTop: '1.5rem', paddingBottom: '2rem' }}>
        <div className="page-header mb-4">
          <h1>Référentiel</h1>
          <p>Bibliothèque de tags utilisés pour annoter les films. Toute modification est immédiatement disponible en autocomplétion.</p>
        </div>

        {/* Onglets */}
        <div style={{ display: 'flex', gap: 4, marginBottom: '1.25rem', borderBottom: '1px solid var(--gray-border)', paddingBottom: 0 }}>
          {CATS.map(cat => (
            <button
              key={cat.key}
              onClick={() => { setActiveTab(cat.key); setEditingId(null); setNewVal('') }}
              style={{
                padding: '8px 18px', fontSize: 13, cursor: 'pointer',
                border: 'none', background: 'transparent',
                borderBottom: activeTab === cat.key ? '2px solid var(--purple)' : '2px solid transparent',
                color: activeTab === cat.key ? 'var(--purple)' : 'var(--text-muted)',
                fontWeight: activeTab === cat.key ? 600 : 400,
                marginBottom: -1,
              }}
            >
              {cat.label}
              <span style={{ marginLeft: 6, fontSize: 11, background: 'var(--gray-bg)', padding: '1px 6px', borderRadius: 99, color: 'var(--text-muted)' }}>
                {items.filter(i => i.categorie === cat.key).length}
              </span>
            </button>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 16, alignItems: 'start' }}>

          {/* Liste */}
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '0.75rem 1rem', borderBottom: '1px solid var(--gray-border)', fontWeight: 500, fontSize: 13, display: 'flex', justifyContent: 'space-between' }}>
              <span>{activeCat.label} ({activeItems.length})</span>
              <span className="text-sm text-muted">Cliquer pour modifier</span>
            </div>

            {activeItems.length === 0 && (
              <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                Aucune entrée — ajoutez-en avec le formulaire →
              </div>
            )}

            {activeItems.map(item => (
              <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 1rem', borderBottom: '1px solid var(--gray-border)', background: editingId === item.id ? 'var(--gray-bg)' : 'transparent' }}>

                {editingId === item.id ? (
                  // Mode édition inline
                  <>
                    <input
                      type="text" value={editVal}
                      onChange={e => setEditVal(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') setEditingId(null) }}
                      style={{ flex: 1, fontSize: 13 }}
                      autoFocus
                    />
                    {activeTab === 'branche' && (
                      <input type="color" value={editCouleur || '#cccccc'}
                        onChange={e => setEditCouleur(e.target.value)}
                        style={{ width: 36, height: 32, padding: 2, border: '1px solid var(--gray-border)', borderRadius: 6, cursor: 'pointer' }}
                        title="Couleur de la branche"
                      />
                    )}
                    <button className="btn btn-sm btn-primary" onClick={saveEdit}>✓</button>
                    <button className="btn btn-sm" onClick={() => setEditingId(null)}>✕</button>
                  </>
                ) : (
                  // Mode lecture
                  <>
                    <span className={activeCat.tagClass}>{item.valeur}</span>
                    {item.couleur && activeTab === 'branche' && (
                      <span style={{ width: 14, height: 14, borderRadius: 3, background: item.couleur, border: '1px solid var(--gray-border)', flexShrink: 0 }} />
                    )}
                    <span style={{ flex: 1 }} />
                    <button className="btn btn-sm" onClick={() => startEdit(item)}>✎</button>
                    <button className="btn btn-sm btn-danger" onClick={() => remove(item.id)}>✕</button>
                  </>
                )}
              </div>
            ))}
          </div>

          {/* Formulaire ajout */}
          <div className="card">
            <div style={{ fontWeight: 500, fontSize: 13, marginBottom: 12 }}>
              Ajouter une {activeCat.label.slice(0, -1).toLowerCase()}
            </div>

            <label>Valeur *</label>
            <input
              type="text"
              value={newVal}
              onChange={e => setNewVal(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && add()}
              placeholder={activeCat.placeholder}
              style={{ marginBottom: 10 }}
            />

            {activeTab === 'branche' && (
              <>
                <label>Couleur <span className="text-muted">(optionnel)</span></label>
                <div className="flex gap-2 items-center" style={{ marginBottom: 10 }}>
                  <input
                    type="color"
                    value={newCouleur || '#AFA9EC'}
                    onChange={e => setNewCouleur(e.target.value)}
                    style={{ width: 42, height: 36, padding: 2, border: '1px solid var(--gray-border)', borderRadius: 6, cursor: 'pointer' }}
                  />
                  <input
                    type="text"
                    value={newCouleur}
                    onChange={e => setNewCouleur(e.target.value)}
                    placeholder="#AFA9EC"
                    style={{ flex: 1 }}
                  />
                </div>
              </>
            )}

            <button className="btn btn-primary" style={{ width: '100%' }} onClick={add} disabled={saving || !newVal.trim()}>
              {saving ? 'Ajout…' : `＋ Ajouter`}
            </button>

            <div className="text-sm text-muted mt-3" style={{ lineHeight: 1.5 }}>
              Entrée pour valider. Les valeurs ajoutées ici sont disponibles immédiatement en autocomplétion lors de l'annotation des segments.
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
