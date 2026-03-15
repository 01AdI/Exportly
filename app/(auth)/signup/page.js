'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

export default function SignupPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  async function handleSignup(e) {
    e.preventDefault()
    setError('')

    // Check passwords match
    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    // Check password length
    if (password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }

    setLoading(true)

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }
    
    // If email confirmation is OFF — session exists immediately
    // redirect straight to onboarding
    if (data.session) {
    router.push('/onboarding')
    return
    }

    // If email confirmation is ON — show check email screen
    setSuccess(true)
    setLoading(false)
  }

  // Show success screen after signup
  if (success) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'var(--cream)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
      }}>
        <div style={{
          background: '#fff',
          borderRadius: '16px',
          border: '1px solid var(--border)',
          boxShadow: 'var(--shadow-lg)',
          padding: '40px',
          width: '100%',
          maxWidth: '420px',
          textAlign: 'center',
        }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>📧</div>
          <div style={{
            fontFamily: "'Cormorant Garamond', serif",
            fontSize: '24px',
            color: 'var(--navy)',
            marginBottom: '10px',
          }}>
            Check your email
          </div>
          <div style={{
            fontSize: '13.5px',
            color: 'var(--muted)',
            lineHeight: '1.6',
            marginBottom: '24px',
          }}>
            We sent a confirmation link to{' '}
            <strong style={{ color: 'var(--navy)' }}>{email}</strong>.
            Click the link to activate your account then come back to sign in.
          </div>
          <Link
            href="/login"
            className="btn btn-gold"
            style={{
              display: 'flex',
              justifyContent: 'center',
              padding: '12px',
              fontSize: '14px',
              textDecoration: 'none',
            }}
          >
            Back to Sign In →
          </Link>
        </div>
      </div>
    )
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
            Create your free exporter account
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
        <form onSubmit={handleSignup}>

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
              placeholder="Min. 6 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {/* CONFIRM PASSWORD */}
          <div className="form-group">
            <label className="form-label">Confirm Password</label>
            <input
              className="form-input"
              type="password"
              placeholder="Repeat your password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
          </div>

          {/* TERMS */}
          <div style={{
            fontSize: '12px',
            color: 'var(--muted)',
            marginBottom: '16px',
            lineHeight: '1.5',
          }}>
            By signing up you agree to our{' '}
            <span style={{ color: 'var(--gold)', cursor: 'pointer' }}>
              Terms of Service
            </span>
            {' '}and{' '}
            <span style={{ color: 'var(--gold)', cursor: 'pointer' }}>
              Privacy Policy
            </span>
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
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? 'Creating account...' : 'Create Free Account →'}
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

        {/* LOGIN LINK */}
        <div style={{
          textAlign: 'center',
          fontSize: '13px',
          color: 'var(--muted)',
        }}>
          Already have an account?{' '}
          <Link
            href="/login"
            style={{
              color: 'var(--gold)',
              fontWeight: '600',
              textDecoration: 'none',
            }}
          >
            Sign in →
          </Link>
        </div>

      </div>
    </div>
  )
}
