import { NextResponse } from 'next/server'
import pool from '@/lib/db'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const categorie = searchParams.get('categorie')
  const conn = await pool.getConnection()
  try {
    const where = categorie ? 'WHERE categorie = ?' : ''
    const args  = categorie ? [categorie] : []
    const [rows] = await conn.execute(
      `SELECT * FROM referentiel ${where} ORDER BY categorie, valeur ASC`,
      args
    )
    return NextResponse.json(rows)
  } finally {
    conn.release()
  }
}

export async function POST(req: Request) {
  const body = await req.json()
  const { categorie, valeur, couleur } = body
  if (!categorie || !valeur) {
    return NextResponse.json({ error: 'categorie et valeur obligatoires' }, { status: 400 })
  }
  const conn = await pool.getConnection()
  try {
    await conn.execute(
      'INSERT INTO referentiel (categorie, valeur, couleur) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE couleur = VALUES(couleur)',
      [categorie, valeur.trim(), couleur || null]
    )
    return NextResponse.json({ ok: true })
  } finally {
    conn.release()
  }
}
