import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Archives familiales Super 8',
  description: 'Films de famille numérisés',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  )
}
