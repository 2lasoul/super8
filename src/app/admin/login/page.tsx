'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleSubmit = async () => {
    setLoading(true)
    setError('')
    const res = await fetch('/api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    })
    if (res.ok) {
      router.push('/admin')
    } else {
      setError('Mot de passe incorrect')
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--gray-bg)' }}>
      <div className="card" style={{ width: 320 }}>
        <div style={{ fontWeight: 600, fontSize: 18, marginBottom: 4 }}>Administration</div>
        <div className="text-sm text-muted" style={{ marginBottom: 20 }}>Archives Super 8</div>

        <label>Mot de passe</label>
        <input
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSubmit()}
          placeholder="••••••••"
          style={{ marginBottom: 12 }}
          autoFocus
        />
        {error && <div style={{ color: '#A32D2D', fontSize: 13, marginBottom: 10 }}>{error}</div>}
        <button className="btn btn-primary" style={{ width: '100%' }} onClick={handleSubmit} disabled={loading}>
          {loading ? 'Connexion…' : 'Se connecter'}
        </button>
      </div>
    </div>
  )
}
