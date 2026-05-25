import { NextResponse } from 'next/server'
import pool from '@/lib/db'
import { parseJSON } from '@/lib/types'
import type { Film, Segment } from '@/lib/types'

type Params = { params: { id: string } }

export async function GET(_req: Request, { params }: Params) {
  const conn = await pool.getConnection()
  try {
    const [[film]] = await conn.execute('SELECT * FROM films WHERE id = ?', [params.id]) as [Film[], unknown]
    if (!film) return NextResponse.json({ error: 'Film introuvable' }, { status: 404 })

    const [segments] = await conn.execute(
      'SELECT * FROM segments WHERE film_id = ? ORDER BY tc_debut ASC',
      [params.id]
    ) as [Segment[], unknown]

    return NextResponse.json({
      ...film,
      branches: parseJSON(film.branches, [] as string[]),
      segments: segments.map(s => ({
        ...s,
        personnes:  parseJSON(s.personnes, [] as string[]),
        evenements: parseJSON(s.evenements, [] as string[]),
        lieux:      parseJSON(s.lieux, [] as string[]),
        branches:   parseJSON(s.branches, [] as string[]),
      }))
    })
  } finally {
    conn.release()
  }
}

export async function PATCH(req: Request, { params }: Params) {
  const body = await req.json()
  const { titre, fichier_url, duree, annee, annee_fin, date_label, description, branches } = body
  const conn = await pool.getConnection()
  try {
    await conn.execute(
      `UPDATE films SET titre=?, fichier_url=?, duree=?, annee=?, annee_fin=?, date_label=?, description=?, branches=?
       WHERE id=?`,
      [titre, fichier_url, duree, annee || null, annee_fin || null, date_label || null, description || null, JSON.stringify(branches || []), params.id]
    )
    return NextResponse.json({ ok: true })
  } finally {
    conn.release()
  }
}

export async function DELETE(_req: Request, { params }: Params) {
  const conn = await pool.getConnection()
  try {
    await conn.execute('DELETE FROM films WHERE id = ?', [params.id])
    return NextResponse.json({ ok: true })
  } finally {
    conn.release()
  }
}
