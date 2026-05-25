import { NextResponse } from 'next/server'
import pool from '@/lib/db'
import { parseJSON, calcCouverture } from '@/lib/types'
import type { Film, Segment } from '@/lib/types'

export async function GET() {
  const conn = await pool.getConnection()
  try {
    const [films] = await conn.query('SELECT * FROM films ORDER BY annee ASC, titre ASC') as [Film[], unknown]
    const [segments] = await conn.query('SELECT film_id, tc_debut, tc_fin FROM segments') as [Pick<Segment,'film_id'|'tc_debut'|'tc_fin'>[], unknown]

    const segsByFilm: Record<string, typeof segments> = {}
    for (const s of segments) {
      if (!segsByFilm[s.film_id]) segsByFilm[s.film_id] = []
      segsByFilm[s.film_id].push(s)
    }

    const result = films.map(f => ({
      ...f,
      branches:   parseJSON(f.branches, [] as string[]),
      couverture: calcCouverture(
        (segsByFilm[f.id] || []).map(s => ({ ...s, id:'', titre:null, personnes:[], evenements:[], lieux:[], date_label:null, branches:[], note:null, film_id:s.film_id })),
        f.duree
      )
    }))
    return NextResponse.json(result)
  } finally {
    conn.release()
  }
}

export async function POST(req: Request) {
  const body = await req.json()
  const { id, titre, fichier_url, duree, annee, annee_fin, date_label, description, branches } = body
  if (!id || !titre || !fichier_url) {
    return NextResponse.json({ error: 'Champs obligatoires manquants' }, { status: 400 })
  }
  const conn = await pool.getConnection()
  try {
    await conn.execute(
      `INSERT INTO films (id, titre, fichier_url, duree, annee, annee_fin, date_label, description, branches)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, titre, fichier_url, duree || 0, annee || null, annee_fin || null, date_label || null, description || null, JSON.stringify(branches || [])]
    )
    return NextResponse.json({ ok: true })
  } finally {
    conn.release()
  }
}
