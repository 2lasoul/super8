import { NextResponse } from 'next/server'
import pool from '@/lib/db'
import { randomUUID } from 'crypto'
import { syncReferentiel } from '@/lib/syncReferentiel'

export async function POST(req: Request) {
  const body = await req.json()
  const { film_id, tc_debut, tc_fin, titre, personnes, evenements, lieux, date_label, branches, note } = body

  if (!film_id || tc_debut === undefined || tc_fin === undefined) {
    return NextResponse.json({ error: 'film_id, tc_debut et tc_fin sont obligatoires' }, { status: 400 })
  }
  if (tc_fin <= tc_debut) {
    return NextResponse.json({ error: 'tc_fin doit être supérieur à tc_debut' }, { status: 400 })
  }

  const conn = await pool.getConnection()
  try {
    const [[film]] = await conn.execute('SELECT duree FROM films WHERE id = ?', [film_id]) as [{ duree: number }[], unknown]
    if (!film) return NextResponse.json({ error: 'Film introuvable' }, { status: 404 })
    if (tc_fin > film.duree) {
      return NextResponse.json({ error: `tc_fin (${tc_fin}s) dépasse la durée du film (${film.duree}s)` }, { status: 400 })
    }

    const id = randomUUID()
    await conn.execute(
      `INSERT INTO segments (id, film_id, tc_debut, tc_fin, titre, personnes, evenements, lieux, date_label, branches, note)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id, film_id, tc_debut, tc_fin,
        titre || null,
        JSON.stringify(personnes || []),
        JSON.stringify(evenements || []),
        JSON.stringify(lieux || []),
        date_label || null,
        JSON.stringify(branches || []),
        note || null,
      ]
    )

    // Synchroniser automatiquement les valeurs saisies dans le référentiel
    await syncReferentiel(conn, { personnes, evenements, lieux, branches })

    return NextResponse.json({ ok: true, id })
  } finally {
    conn.release()
  }
}
