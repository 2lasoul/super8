import type { Connection } from 'mysql2/promise'

type Categorie = 'personne' | 'evenement' | 'lieu' | 'branche'

/**
 * Ajoute automatiquement dans le référentiel toutes les valeurs
 * qui n'y sont pas encore. Utilise INSERT IGNORE pour ne pas écraser
 * les entrées existantes.
 */
export async function syncReferentiel(
  conn: Connection,
  data: { personnes?: string[]; evenements?: string[]; lieux?: string[]; branches?: string[] }
) {
  const entries: { cat: Categorie; val: string }[] = [
    ...(data.personnes  || []).map(v => ({ cat: 'personne'  as Categorie, val: v })),
    ...(data.evenements || []).map(v => ({ cat: 'evenement' as Categorie, val: v })),
    ...(data.lieux      || []).map(v => ({ cat: 'lieu'      as Categorie, val: v })),
    ...(data.branches   || []).map(v => ({ cat: 'branche'   as Categorie, val: v })),
  ].filter(e => e.val.trim() !== '')

  for (const { cat, val } of entries) {
    await conn.execute(
      'INSERT IGNORE INTO referentiel (categorie, valeur) VALUES (?, ?)',
      [cat, val.trim()]
    )
  }
}
