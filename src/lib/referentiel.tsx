'use client'

import { useEffect, useState, useRef, useCallback } from 'react'

export interface RefItem {
  id: number
  categorie: 'branche' | 'personne' | 'evenement' | 'lieu'
  valeur: string
  couleur: string | null
}

// Cache module-level pour éviter des rechargements inutiles
let _cache: RefItem[] | null = null

export function invalidateReferentielCache() {
  _cache = null
}

export function useReferentiel() {
  const [items, setItems] = useState<RefItem[]>(_cache || [])

  const load = useCallback(async () => {
    const res = await fetch('/api/referentiel')
    const data: RefItem[] = await res.json()
    _cache = data
    setItems(data)
  }, [])

  useEffect(() => { load() }, [load])

  const byCategorie = (cat: RefItem['categorie']) =>
    items.filter(i => i.categorie === cat).map(i => i.valeur)

  return { items, load, byCategorie }
}

// ─── Composant TagInput ───
interface TagInputProps {
  values: string[]
  suggestions: string[]
  onChange: (values: string[]) => void
  placeholder?: string
  tagClass?: string
}

export function TagInput({ values, suggestions, onChange, placeholder, tagClass = 'tag' }: TagInputProps) {
  const [input, setInput] = useState('')
  const [open, setOpen]   = useState(false)
  const wrapRef           = useRef<HTMLDivElement>(null)
  // Ref pour avoir toujours les values courantes dans les callbacks async
  const valuesRef         = useRef(values)
  useEffect(() => { valuesRef.current = values }, [values])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        // Valider la saisie libre si on clique ailleurs
        const v = input.trim()
        if (v && !valuesRef.current.includes(v)) {
          onChange([...valuesRef.current, v])
        }
        setInput('')
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [input, onChange])

  const add = useCallback((val: string) => {
    const v = val.trim()
    if (!v) return
    if (!valuesRef.current.includes(v)) onChange([...valuesRef.current, v])
    setInput('')
    setOpen(false)
  }, [onChange])

  const remove = (v: string) => onChange(values.filter(x => x !== v))

  const filtered = suggestions.filter(s =>
    !values.includes(s) &&
    (input === '' || s.toLowerCase().includes(input.toLowerCase()))
  )

  const showDrop = open && (filtered.length > 0 || (input.trim() !== '' && !suggestions.includes(input.trim())))

  return (
    <div ref={wrapRef} style={{ position: 'relative' }}>
      <div
        style={{
          display: 'flex', flexWrap: 'wrap', gap: 6, padding: '6px 8px',
          border: '1px solid var(--gray-border)', borderRadius: 8,
          background: 'var(--white)', minHeight: 40, alignItems: 'center',
          cursor: 'text',
        }}
        onClick={() => { wrapRef.current?.querySelector('input')?.focus(); setOpen(true) }}
      >
        {values.map(v => (
          <span key={v} className={tagClass} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            {v}
            <span
              onMouseDown={e => { e.preventDefault(); e.stopPropagation(); remove(v) }}
              style={{ cursor: 'pointer', opacity: 0.6, fontSize: 11, lineHeight: 1 }}
            >✕</span>
          </span>
        ))}
        <input
          type="text"
          value={input}
          onChange={e => { setInput(e.target.value); setOpen(true) }}
          onFocus={() => setOpen(true)}
          onKeyDown={e => {
            if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); add(input) }
            if (e.key === 'Tab' && input.trim())    { e.preventDefault(); add(input) }
            if (e.key === 'Backspace' && !input && values.length) remove(values[values.length - 1])
            if (e.key === 'Escape') { add(input); setOpen(false) }
          }}
          placeholder={values.length ? '' : (placeholder || 'Ajouter…')}
          style={{ border: 'none', outline: 'none', fontSize: 13, flex: 1, minWidth: 100, padding: 2, background: 'transparent' }}
        />
      </div>

      {/* Dropdown */}
      {showDrop && (
        <div style={{
          position: 'absolute', zIndex: 50, top: '100%', left: 0, right: 0, marginTop: 4,
          background: 'var(--white)', border: '1px solid var(--gray-border)',
          borderRadius: 8, boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
          maxHeight: 200, overflowY: 'auto',
        }}>
          {filtered.map(s => (
            <div key={s}
              onMouseDown={e => { e.preventDefault(); add(s) }}
              style={{ padding: '8px 12px', cursor: 'pointer', fontSize: 13 }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--gray-bg)'}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
            >{s}</div>
          ))}
          {input.trim() && !suggestions.includes(input.trim()) && (
            <div
              onMouseDown={e => { e.preventDefault(); add(input) }}
              style={{ padding: '8px 12px', cursor: 'pointer', fontSize: 13, borderTop: filtered.length ? '1px solid var(--gray-border)' : 'none', color: 'var(--purple)' }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--gray-bg)'}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
            >+ Ajouter « {input.trim()} »</div>
          )}
        </div>
      )}
    </div>
  )
}
