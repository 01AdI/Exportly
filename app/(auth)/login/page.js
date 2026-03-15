'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleLogin(e) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    // Check if exporter has completed onboarding
    const { data: profile } = await supabase
      .from('exporter_profiles')
      .select('id')
      .eq('user_id', data.user.id)
      .single()

    if (!profile) {
      // First time login — go to onboarding
      router.push('/onboarding')
    } else {
      // Already onboarded — go to dashboard
      router.push('/dashboard')
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--cream)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
    }}>

      {/* CARD */}
      <div style={{
        background: '#fff',
        borderRadius: '16px',
        border: '1px solid var(--border)',
        boxShadow: 'var(--shadow-lg)',
        padding: '40px',
        width: '100%',
        maxWidth: '420px',
      }}>

        {/* LOGO */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{
            fontFamily: "'Cormorant Garamond', serif",
            fontSize: '28px',
            color: 'var(--navy)',
            letterSpacing: '.5px',
          }}>
            ✦ Exportly
          </div>
          <div style={{
            fontSize: '13px',
            color: 'var(--muted)',
            marginTop: '4px',
          }}>
            Sign in to your exporter account
          </div>
        </div>

        {/* ERROR */}
        {error && (
          <div style={{
            background: 'var(--red-bg)',
            border: '1px solid rgba(217,79,79,0.3)',
            borderRadius: '8px',
            padding: '10px 14px',
            fontSize: '13px',
            color: 'var(--red)',
            marginBottom: '20px',
          }}>
            ⚠️ {error}
          </div>
        )}

        {/* FORM */}
        <form onSubmit={handleLogin}>

          {/* EMAIL */}
          <div className="form-group">
            <label className="form-label">Email Address</label>
            <input
              className="form-input"
              type="email"
              placeholder="you@yourcompany.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          {/* PASSWORD */}
          <div className="form-group">
            <label className="form-label">Password</label>
            <input
              className="form-input"
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {/* SUBMIT */}
          <button
            type="submit"
            className="btn btn-gold"
            disabled={loading}
            style={{
              width: '100%',
              justifyContent: 'center',
              padding: '12px',
              fontSize: '14px',
              marginTop: '8px',
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? 'Signing in...' : 'Sign In →'}
          </button>

        </form>

        {/* DIVIDER */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          margin: '24px 0',
        }}>
          <div style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
          <span style={{ fontSize: '12px', color: 'var(--muted)' }}>or</span>
          <div style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
        </div>

        {/* SIGNUP LINK */}
        <div style={{ textAlign: 'center', fontSize: '13px', color: 'var(--muted)' }}>
          Don't have an account?{' '}
          <Link
            href="/signup"
            style={{
              color: 'var(--gold)',
              fontWeight: '600',
              textDecoration: 'none',
            }}
          >
            Create one free →
          </Link>
        </div>

      </div>
    </div>
  )
}