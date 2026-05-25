import { NextResponse } from 'next/server'
import pool from '@/lib/db'

type Params = { params: { id: string } }

export async function PATCH(req: Request, { params }: Params) {
  const body = await req.json()
  const { tc_debut, tc_fin, titre, personnes, evenements, lieux, date_label, branches, note } = body

  if (tc_fin !== undefined && tc_debut !== undefined && tc_fin <= tc_debut) {
    return NextResponse.json({ error: 'tc_fin doit être supérieur à tc_debut' }, { status: 400 })
  }

  const conn = await pool.getConnection()
  try {
    await conn.execute(
      `UPDATE segments SET
        tc_debut=?, tc_fin=?, titre=?, personnes=?, evenements=?, lieux=?, date_label=?, branches=?, note=?
       WHERE id=?`,
      [
        tc_debut, tc_fin,
        titre || null,
        JSON.stringify(personnes || []),
        JSON.stringify(evenements || []),
        JSON.stringify(lieux || []),
        date_label || null,
        JSON.stringify(branches || []),
        note || null,
        params.id
      ]
    )
    return NextResponse.json({ ok: true })
  } finally {
    conn.release()
  }
}

export async function DELETE(_req: Request, { params }: Params) {
  const conn = await pool.getConnection()
  try {
    await conn.execute('DELETE FROM segments WHERE id = ?', [params.id])
    return NextResponse.json({ ok: true })
  } finally {
    conn.release()
  }
}
