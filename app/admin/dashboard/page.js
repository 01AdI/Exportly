'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

const TRIAL_DAYS = 14

export default function AdminDashboard() {
  const router = useRouter()
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [recentUsers, setRecentUsers] = useState([])

  useEffect(() => { fetchStats() }, [])

  async function fetchStats() {
    const { data: allProfiles } = await supabase
      .from('exporter_profiles')
      .select('*')
      .order('created_at', { ascending: false })

    const { data: allSubs } = await supabase
      .from('subscriptions')
      .select('*')

    const profiles = (allProfiles || []).filter(p => !p.is_admin)

    const withSubs = profiles.map(p => ({
      ...p,
      sub: (allSubs || []).find(s => s.user_id === p.user_id) || null
    }))

    let trialActive = 0, trialExpired = 0, trialPending = 0
    let paid = 0, totalRevenue = 0
    const PLAN_PRICES = { monthly: 499, '6months': 2499, yearly: 3999 }

    withSubs.forEach(p => {
      const plan = p.sub?.plan || 'free'
      if (plan !== 'free') {
        paid++
        totalRevenue += PLAN_PRICES[plan] || 0
      } else {
        if (!p.sub?.trial_started_at) {
          trialPending++
        } else {
          const started = new Date(p.sub.trial_started_at)
          const expiry = new Date(started.getTime() + TRIAL_DAYS * 24 * 60 * 60 * 1000)
          const daysLeft = Math.ceil((expiry - new Date()) / (1000 * 60 * 60 * 24))
          if (daysLeft <= 0) trialExpired++
          else trialActive++
        }
      }
    })

    setStats({ total: withSubs.length, trialActive, trialPending, trialExpired, paid, totalRevenue })
    setRecentUsers(withSubs.slice(0, 5))
    setLoading(false)
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    router.replace('/admin/login')
  }

  if (loading || !stats) return (
    <div style={{
      minHeight: '100vh', background: '#0f172a',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: 'rgba(255,255,255,0.4)', fontSize: '14px',
      fontFamily: "'DM Sans', sans-serif",
    }}>
      Loading admin dashboard...
    </div>
  )

  const cards = [
    { label: 'Total Users', value: stats.total, icon: '👥', color: '#C9A84C' },
    { label: 'Trial Active', value: stats.trialActive, icon: '⏳', color: '#60a5fa' },
    { label: 'Trial Pending', value: stats.trialPending, icon: '🎁', color: '#a78bfa' },
    { label: 'Trial Expired', value: stats.trialExpired, icon: '⚠️', color: '#f87171' },
    { label: 'Paid Users', value: stats.paid, icon: '✅', color: '#34d399' },
    { label: 'Total Revenue', value: `₹${stats.totalRevenue.toLocaleString()}`, icon: '💰', color: '#fbbf24' },
  ]

  return (
    <div style={{
      minHeight: '100vh',
      background: '#0f172a',
      fontFamily: "'DM Sans', sans-serif",
      color: '#fff',
    }}>

      {/* TOPBAR */}
      <div style={{
        background: '#1e293b',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        padding: '0 32px',
        height: '58px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <div style={{
          fontFamily: "'Cormorant Garamond', serif",
          fontSize: '22px',
          color: '#C9A84C',
        }}>
          ✦ Exportly Admin
        </div>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <button
            onClick={() => router.push('/admin/users')}
            style={{
              background: 'rgba(201,168,76,0.15)',
              border: '1px solid rgba(201,168,76,0.3)',
              borderRadius: '8px',
              padding: '7px 16px',
              fontSize: '13px',
              color: '#C9A84C',
              cursor: 'pointer',
              fontFamily: "'DM Sans', sans-serif",
            }}
          >
            👥 All Users
          </button>
          <button
            onClick={handleLogout}
            style={{
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '8px',
              padding: '7px 16px',
              fontSize: '13px',
              color: 'rgba(255,255,255,0.5)',
              cursor: 'pointer',
              fontFamily: "'DM Sans', sans-serif",
            }}
          >
            Sign Out
          </button>
        </div>
      </div>

      <div style={{ padding: '32px' }}>

        {/* PAGE TITLE */}
        <div style={{ marginBottom: '28px' }}>
          <div style={{
            fontFamily: "'Cormorant Garamond', serif",
            fontSize: '28px',
            color: '#fff',
            marginBottom: '4px',
          }}>
            Dashboard Overview
          </div>
          <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.35)' }}>
            {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </div>
        </div>

        {/* KPI CARDS */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(6, 1fr)',
          gap: '14px',
          marginBottom: '32px',
        }}>
          {cards.map((c, i) => (
            <div key={i} style={{
              background: '#1e293b',
              border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: '14px',
              padding: '20px',
              borderTop: `3px solid ${c.color}`,
            }}>
              <div style={{ fontSize: '24px', marginBottom: '10px' }}>{c.icon}</div>
              <div style={{
                fontFamily: "'Cormorant Garamond', serif",
                fontSize: '28px',
                color: '#fff',
                fontWeight: 700,
                lineHeight: 1,
                marginBottom: '4px',
              }}>
                {c.value}
              </div>
              <div style={{ fontSize: '11.5px', color: 'rgba(255,255,255,0.4)' }}>
                {c.label}
              </div>
            </div>
          ))}
        </div>

        {/* RECENT SIGNUPS */}
        <div style={{
          background: '#1e293b',
          border: '1px solid rgba(255,255,255,0.06)',
          borderRadius: '16px',
          overflow: 'hidden',
        }}>
          <div style={{
            padding: '18px 24px',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}>
            <div style={{ fontSize: '14px', fontWeight: 600, color: '#fff' }}>
              🕐 Recent Signups
            </div>
            <button
              onClick={() => router.push('/admin/users')}
              style={{
                background: 'none',
                border: 'none',
                color: '#C9A84C',
                fontSize: '13px',
                cursor: 'pointer',
                fontFamily: "'DM Sans', sans-serif",
              }}
            >
              View all →
            </button>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  {['Business', 'Catalogue', 'Plan', 'Status', 'Joined'].map(h => (
                    <th key={h} style={{
                      padding: '11px 24px',
                      textAlign: 'left',
                      fontSize: '11px',
                      fontWeight: 700,
                      color: 'rgba(255,255,255,0.3)',
                      letterSpacing: '1px',
                      textTransform: 'uppercase',
                    }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {recentUsers.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{
                      padding: '48px',
                      textAlign: 'center',
                      color: 'rgba(255,255,255,0.2)',
                      fontSize: '13px',
                    }}>
                      No users yet
                    </td>
                  </tr>
                ) : recentUsers.map(u => {
                  const sub = u.sub
                  const plan = sub?.plan || 'free'
                  const trialStarted = sub?.trial_started_at
                  let statusLabel = 'Pending'
                  let statusColor = '#a78bfa'

                  if (plan !== 'free') {
                    statusLabel = 'Paid'
                    statusColor = '#34d399'
                  } else if (trialStarted) {
                    const started = new Date(trialStarted)
                    const expiry = new Date(started.getTime() + TRIAL_DAYS * 24 * 60 * 60 * 1000)
                    const daysLeft = Math.ceil((expiry - new Date()) / (1000 * 60 * 60 * 24))
                    if (daysLeft <= 0) { statusLabel = 'Expired'; statusColor = '#f87171' }
                    else { statusLabel = `${daysLeft}d left`; statusColor = '#60a5fa' }
                  }

                  return (
                    <tr key={u.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                      <td style={{ padding: '14px 24px', fontSize: '13px', color: '#fff', fontWeight: 600 }}>
                        {u.business_name}
                      </td>
                      <td style={{ padding: '14px 24px', fontSize: '12px', color: 'rgba(255,255,255,0.4)' }}>
                        /catalogue/{u.slug}
                      </td>
                      <td style={{ padding: '14px 24px' }}>
                        <span style={{
                          background: 'rgba(255,255,255,0.06)',
                          borderRadius: '6px',
                          padding: '3px 10px',
                          fontSize: '11.5px',
                          color: 'rgba(255,255,255,0.6)',
                          textTransform: 'capitalize',
                        }}>
                          {plan}
                        </span>
                      </td>
                      <td style={{ padding: '14px 24px' }}>
                        <span style={{
                          background: `${statusColor}18`,
                          color: statusColor,
                          borderRadius: '99px',
                          padding: '3px 10px',
                          fontSize: '11.5px',
                          fontWeight: 600,
                        }}>
                          {statusLabel}
                        </span>
                      </td>
                      <td style={{ padding: '14px 24px', fontSize: '12px', color: 'rgba(255,255,255,0.4)' }}>
                        {new Date(u.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}