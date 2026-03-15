'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function AdminLogin() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleLogin(e) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password })

    if (authError) {
      setError('Invalid email or password')
      setLoading(false)
      return
    }

    // verify admin
    const { data: profile } = await supabase
      .from('exporter_profiles')
      .select('is_admin')
      .eq('user_id', data.user.id)
      .single()

    if (!profile?.is_admin) {
      await supabase.auth.signOut()
      setError('This account does not have admin access')
      setLoading(false)
      return
    }

    router.replace('/admin/dashboard')
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: '#0f172a',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
      fontFamily: "'DM Sans', sans-serif",
    }}>
      <div style={{
        background: '#1e293b',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: '20px',
        padding: '40px',
        width: '100%',
        maxWidth: '400px',
        boxShadow: '0 24px 64px rgba(0,0,0,0.4)',
      }}>
        {/* LOGO */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{
            fontFamily: "'Cormorant Garamond', serif",
            fontSize: '28px',
            color: '#C9A84C',
            marginBottom: '4px',
          }}>
            ✦ Exportly
          </div>
          <div style={{
            fontSize: '12px',
            color: 'rgba(255,255,255,0.3)',
            letterSpacing: '2px',
            textTransform: 'uppercase',
          }}>
            Admin Panel
          </div>
        </div>

        {error && (
          <div style={{
            background: 'rgba(217,79,79,0.15)',
            border: '1px solid rgba(217,79,79,0.3)',
            borderRadius: '8px',
            padding: '10px 14px',
            fontSize: '13px',
            color: '#fc8181',
            marginBottom: '20px',
          }}>
            ⚠️ {error}
          </div>
        )}

        <form onSubmit={handleLogin}>
          <div style={{ marginBottom: '14px' }}>
            <label style={{
              display: 'block',
              fontSize: '12px',
              fontWeight: 600,
              color: 'rgba(255,255,255,0.5)',
              marginBottom: '6px',
              letterSpacing: '.5px',
            }}>
              EMAIL
            </label>
            <input
              type="email"
              placeholder="admin@exportly.app"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '11px 14px',
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '10px',
                fontSize: '13.5px',
                color: '#fff',
                outline: 'none',
                fontFamily: "'DM Sans', sans-serif",
                boxSizing: 'border-box',
              }}
            />
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label style={{
              display: 'block',
              fontSize: '12px',
              fontWeight: 600,
              color: 'rgba(255,255,255,0.5)',
              marginBottom: '6px',
              letterSpacing: '.5px',
            }}>
              PASSWORD
            </label>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '11px 14px',
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '10px',
                fontSize: '13.5px',
                color: '#fff',
                outline: 'none',
                fontFamily: "'DM Sans', sans-serif",
                boxSizing: 'border-box',
              }}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '13px',
              background: '#C9A84C',
              border: 'none',
              borderRadius: '10px',
              fontSize: '14px',
              fontWeight: 700,
              color: '#0f172a',
              cursor: loading ? 'default' : 'pointer',
              opacity: loading ? 0.7 : 1,
              fontFamily: "'DM Sans', sans-serif",
            }}
          >
            {loading ? 'Verifying...' : 'Sign In to Admin →'}
          </button>
        </form>
      </div>
    </div>
  )
}