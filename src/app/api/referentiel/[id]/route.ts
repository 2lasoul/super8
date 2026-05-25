import { NextResponse } from 'next/server'
import pool from '@/lib/db'

type Params = { params: { id: string } }

export async function DELETE(_req: Request, { params }: Params) {
  const conn = await pool.getConnection()
  try {
    await conn.execute('DELETE FROM referentiel WHERE id = ?', [params.id])
    return NextResponse.json({ ok: true })
  } finally {
    conn.release()
  }
}

export async function PATCH(req: Request, { params }: Params) {
  const { valeur, couleur } = await req.json()
  const conn = await pool.getConnection()
  try {
    await conn.execute(
      'UPDATE referentiel SET valeur = ?, couleur = ? WHERE id = ?',
      [valeur, couleur || null, params.id]
    )
    return NextResponse.json({ ok: true })
  } finally {
    conn.release()
  }
}
