'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

const TRIAL_DAYS = 14
const FILTERS = ['All', 'Pending', 'Trial Active', 'Trial Expired', 'Paid']

export default function AdminUsers() {
  const router = useRouter()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('All')
  const [search, setSearch] = useState('')
  const [actionModal, setActionModal] = useState(null)
  const [toast, setToast] = useState('')
  const [saving, setSaving] = useState(false)
  const [newPlan, setNewPlan] = useState('free')

  useEffect(() => { fetchUsers() }, [])

  async function fetchUsers() {
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

    setUsers(withSubs)
    setLoading(false)
  }

  function getUserStatus(u) {
    const plan = u.sub?.plan || 'free'
    if (plan !== 'free') return { label: 'Paid', color: '#34d399', tag: 'Paid' }
    if (!u.sub?.trial_started_at) return { label: 'Pending', color: '#a78bfa', tag: 'Pending' }
    const started = new Date(u.sub.trial_started_at)
    const expiry = new Date(started.getTime() + TRIAL_DAYS * 24 * 60 * 60 * 1000)
    const daysLeft = Math.ceil((expiry - new Date()) / (1000 * 60 * 60 * 24))
    if (daysLeft <= 0) return { label: 'Expired', color: '#f87171', tag: 'Trial Expired' }
    return { label: `${daysLeft}d left`, color: '#60a5fa', tag: 'Trial Active' }
  }

  function getPlanExpiry(u) {
    if (!u.sub?.plan_started_at) return '—'
    const durations = { monthly: 30, '6months': 180, yearly: 365 }
    const days = durations[u.sub.plan] || 0
    const expiry = new Date(new Date(u.sub.plan_started_at).getTime() + days * 24 * 60 * 60 * 1000)
    return expiry.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
  }

  async function activateTrial(u) {
    setSaving(true)
    if (u.sub) {
      await supabase
        .from('subscriptions')
        .update({ trial_started_at: new Date().toISOString() })
        .eq('id', u.sub.id)
    } else {
      await supabase.from('subscriptions').insert({
        user_id: u.user_id,
        plan: 'free',
        status: 'active',
        trial_started_at: new Date().toISOString(),
      })
    }
    showToast(`✅ Trial activated for ${u.business_name}`)
    setSaving(false)
    fetchUsers()
  }

  async function savePlanChange() {
    if (!actionModal) return
    setSaving(true)
    const updates = {
      plan: newPlan,
      status: 'active',
      plan_started_at: new Date().toISOString(),
    }
    if (actionModal.sub) {
      await supabase.from('subscriptions').update(updates).eq('id', actionModal.sub.id)
    } else {
      await supabase.from('subscriptions').insert({ user_id: actionModal.user_id, ...updates })
    }
    showToast(`✅ Plan updated to ${newPlan} for ${actionModal.business_name}`)
    setSaving(false)
    setActionModal(null)
    fetchUsers()
  }

  function openActionModal(u) {
    setNewPlan(u.sub?.plan || 'free')
    setActionModal(u)
  }

  function showToast(msg) {
    setToast(msg)
    setTimeout(() => setToast(''), 3500)
  }

  const displayed = users.filter(u => {
    const status = getUserStatus(u)
    const matchesFilter = filter === 'All' || status.tag === filter
    const matchesSearch = !search ||
      u.business_name?.toLowerCase().includes(search.toLowerCase()) ||
      u.slug?.toLowerCase().includes(search.toLowerCase())
    return matchesFilter && matchesSearch
  })

  if (loading) return (
    <div style={{
      minHeight: '100vh', background: '#0f172a',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: 'rgba(255,255,255,0.4)', fontSize: '14px',
      fontFamily: "'DM Sans', sans-serif",
    }}>
      Loading users...
    </div>
  )

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
        padding: '0 32px', height: '58px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button
            onClick={() => router.push('/admin/dashboard')}
            onMouseEnter={e => e.currentTarget.style.color = '#e0c068'}
            onMouseLeave={e => e.currentTarget.style.color = '#C9A84C'}
            style={{
              background: 'none', border: 'none',
              color: '#C9A84C', fontSize: '13px',
              cursor: 'pointer', fontFamily: "'DM Sans', sans-serif",
            }}
          >
            ← Dashboard
          </button>
          <div style={{
            fontFamily: "'Cormorant Garamond', serif",
            fontSize: '20px', color: '#fff',
          }}>
            All Users
          </div>
        </div>
        <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.35)' }}>
          {users.length} total users
        </div>
      </div>

      <div style={{ padding: '28px 32px' }}>

        {/* SEARCH + FILTERS */}
        <div style={{
          display: 'flex', gap: '12px',
          marginBottom: '20px', flexWrap: 'wrap', alignItems: 'center',
        }}>
          <input
            placeholder="Search by name or slug..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              padding: '9px 14px',
              background: '#1e293b',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '9px', fontSize: '13px',
              color: '#fff', outline: 'none',
              fontFamily: "'DM Sans', sans-serif",
              minWidth: '240px',
            }}
          />
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {FILTERS.map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                onMouseEnter={e => {
                  if (filter !== f) e.currentTarget.style.background = 'rgba(255,255,255,0.06)'
                }}
                onMouseLeave={e => {
                  if (filter !== f) e.currentTarget.style.background = 'transparent'
                }}
                style={{
                  padding: '7px 14px', borderRadius: '99px',
                  border: `1px solid ${filter === f ? '#C9A84C' : 'rgba(255,255,255,0.1)'}`,
                  background: filter === f ? 'rgba(201,168,76,0.15)' : 'transparent',
                  color: filter === f ? '#C9A84C' : 'rgba(255,255,255,0.4)',
                  fontSize: '12.5px', cursor: 'pointer',
                  fontFamily: "'DM Sans', sans-serif",
                  transition: 'background .15s',
                }}
              >
                {f}
                <span style={{ marginLeft: '6px', opacity: 0.6 }}>
                  {f === 'All' ? users.length
                    : users.filter(u => getUserStatus(u).tag === f).length}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* USERS TABLE */}
        <div style={{
          background: '#1e293b',
          border: '1px solid rgba(255,255,255,0.06)',
          borderRadius: '16px', overflow: 'hidden',
        }}>
          <div style={{ overflowX: 'auto' }}>
            <table className="admin-table">
                <thead>
                    <tr>
                    {['Business', 'Catalogue URL', 'Location', 'Plan', 'Status', 'Plan Expiry', 'Joined', 'Actions'].map(h => (
                        <th key={h}>{h}</th>
                    ))}
                    </tr>
                </thead>
                <tbody>
                    {displayed.length === 0 ? (
                    <tr>
                        <td colSpan={8} style={{
                        padding: '48px', textAlign: 'center',
                        color: 'rgba(255,255,255,0.2)', fontSize: '13px',
                        }}>
                        No users found
                        </td>
                    </tr>
                    ) : displayed.map(u => {
                    const status = getUserStatus(u)
                    const plan = u.sub?.plan || 'free'
                    const isPending = status.tag === 'Pending'

                    return (
                        <tr key={u.id}>
                        <td>
                            <div style={{ fontWeight: 600, color: '#fff', marginBottom: '2px', fontSize: '13px' }}>
                            {u.business_name}
                            </div>
                            <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)' }}>
                            {u.whatsapp_number || 'No WhatsApp'}
                            </div>
                        </td>

                        <td>
                            <span
                            onClick={() => window.open(`/catalogue/${u.slug}`, '_blank')}
                            onMouseEnter={e => e.currentTarget.style.color = '#e0c068'}
                            onMouseLeave={e => e.currentTarget.style.color = '#C9A84C'}
                            style={{
                                fontSize: '12px', color: '#C9A84C',
                                cursor: 'pointer', textDecoration: 'underline',
                            }}
                            >
                            /catalogue/{u.slug}
                            </span>
                        </td>

                        <td className="td-muted">{u.location || '—'}</td>

                        <td>
                            <span style={{
                            background: 'rgba(255,255,255,0.08)',
                            borderRadius: '6px', padding: '3px 10px',
                            fontSize: '11.5px', color: 'rgba(255,255,255,0.7)',
                            textTransform: 'capitalize',
                            }}>
                            {plan}
                            </span>
                        </td>

                        <td>
                            <span style={{
                            background: `${status.color}22`,
                            color: status.color, borderRadius: '99px',
                            padding: '4px 12px', fontSize: '11.5px',
                            fontWeight: 600, whiteSpace: 'nowrap',
                            }}>
                            {status.label}
                            </span>
                        </td>

                        <td className="td-muted">
                            {plan !== 'free' ? getPlanExpiry(u) : '—'}
                        </td>

                        <td className="td-muted" style={{ whiteSpace: 'nowrap' }}>
                            {new Date(u.created_at).toLocaleDateString('en-IN', {
                            day: 'numeric', month: 'short', year: 'numeric'
                            })}
                        </td>

                        <td>
                            <div style={{ display: 'flex', gap: '6px' }}>
                            {isPending && (
                                <button
                                onClick={() => activateTrial(u)}
                                disabled={saving}
                                onMouseEnter={e => e.currentTarget.style.background = 'rgba(96,165,250,0.25)'}
                                onMouseLeave={e => e.currentTarget.style.background = 'rgba(96,165,250,0.15)'}
                                style={{
                                    background: 'rgba(96,165,250,0.15)',
                                    border: '1px solid rgba(96,165,250,0.3)',
                                    borderRadius: '7px', padding: '5px 10px',
                                    fontSize: '11.5px', color: '#60a5fa',
                                    cursor: 'pointer', fontFamily: "'DM Sans', sans-serif",
                                    whiteSpace: 'nowrap',
                                }}
                                >
                                ▶ Start Trial
                                </button>
                            )}
                            <button
                                onClick={() => openActionModal(u)}
                                onMouseEnter={e => e.currentTarget.style.background = 'rgba(201,168,76,0.22)'}
                                onMouseLeave={e => e.currentTarget.style.background = 'rgba(201,168,76,0.12)'}
                                style={{
                                background: 'rgba(201,168,76,0.12)',
                                border: '1px solid rgba(201,168,76,0.25)',
                                borderRadius: '7px', padding: '5px 10px',
                                fontSize: '11.5px', color: '#C9A84C',
                                cursor: 'pointer', fontFamily: "'DM Sans', sans-serif",
                                whiteSpace: 'nowrap',
                                }}
                            >
                                ✏️ Plan
                            </button>
                            <button
                                onClick={() => window.open(`/catalogue/${u.slug}`, '_blank')}
                                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
                                onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
                                style={{
                                background: 'rgba(255,255,255,0.06)',
                                border: '1px solid rgba(255,255,255,0.1)',
                                borderRadius: '7px', padding: '5px 10px',
                                fontSize: '11.5px', color: 'rgba(255,255,255,0.5)',
                                cursor: 'pointer', fontFamily: "'DM Sans', sans-serif",
                                }}
                            >
                                👁
                            </button>
                            </div>
                        </td>
                        </tr>
                    )
                    })}
                </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* CHANGE PLAN MODAL */}
      {actionModal && (
        <div
          style={{
            position: 'fixed', inset: 0,
            background: 'rgba(0,0,0,0.7)', zIndex: 500,
            display: 'flex', alignItems: 'center',
            justifyContent: 'center', padding: '20px',
          }}
          onClick={() => setActionModal(null)}
        >
          <div
            style={{
              background: '#1e293b',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '20px', padding: '32px',
              width: '100%', maxWidth: '380px',
              boxShadow: '0 24px 64px rgba(0,0,0,0.5)',
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{
              fontFamily: "'Cormorant Garamond', serif",
              fontSize: '22px', color: '#fff', marginBottom: '4px',
            }}>
              Change Plan
            </div>
            <div style={{ fontSize: '12.5px', color: 'rgba(255,255,255,0.4)', marginBottom: '24px' }}>
              {actionModal.business_name}
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{
                display: 'block', fontSize: '11px', fontWeight: 700,
                color: 'rgba(255,255,255,0.4)', letterSpacing: '1px',
                textTransform: 'uppercase', marginBottom: '8px',
              }}>
                Select Plan
              </label>
              {[
                { value: 'free', label: 'Free Trial', price: '' },
                { value: 'monthly', label: 'Monthly', price: '₹499' },
                { value: '6months', label: '6 Months', price: '₹2499' },
                { value: 'yearly', label: 'Yearly', price: '₹3999' },
              ].map(p => (
                <div
                  key={p.value}
                  onClick={() => setNewPlan(p.value)}
                  onMouseEnter={e => {
                    if (newPlan !== p.value)
                      e.currentTarget.style.background = 'rgba(255,255,255,0.04)'
                  }}
                  onMouseLeave={e => {
                    if (newPlan !== p.value)
                      e.currentTarget.style.background = 'transparent'
                  }}
                  style={{
                    display: 'flex', justifyContent: 'space-between',
                    alignItems: 'center', padding: '12px 14px',
                    borderRadius: '10px',
                    border: `1.5px solid ${newPlan === p.value ? '#C9A84C' : 'rgba(255,255,255,0.08)'}`,
                    background: newPlan === p.value ? 'rgba(201,168,76,0.1)' : 'transparent',
                    cursor: 'pointer', marginBottom: '8px',
                    transition: 'background .15s',
                  }}
                >
                  <span style={{
                    fontSize: '13px',
                    color: newPlan === p.value ? '#C9A84C' : 'rgba(255,255,255,0.7)',
                  }}>
                    {p.label}
                  </span>
                  {p.price && (
                    <span style={{ fontSize: '13px', fontWeight: 700, color: '#C9A84C' }}>
                      {p.price}
                    </span>
                  )}
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={() => setActionModal(null)}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                style={{
                  flex: 1, padding: '11px', borderRadius: '10px',
                  border: '1px solid rgba(255,255,255,0.1)',
                  background: 'transparent', color: 'rgba(255,255,255,0.4)',
                  fontSize: '13px', cursor: 'pointer',
                  fontFamily: "'DM Sans', sans-serif",
                }}
              >
                Cancel
              </button>
              <button
                onClick={savePlanChange}
                disabled={saving}
                onMouseEnter={e => { if (!saving) e.currentTarget.style.opacity = '0.88' }}
                onMouseLeave={e => e.currentTarget.style.opacity = '1'}
                style={{
                  flex: 2, padding: '11px', borderRadius: '10px',
                  border: 'none', background: '#C9A84C',
                  color: '#0f172a', fontSize: '13px', fontWeight: 700,
                  cursor: saving ? 'default' : 'pointer',
                  opacity: saving ? 0.7 : 1,
                  fontFamily: "'DM Sans', sans-serif",
                }}
              >
                {saving ? 'Saving...' : '✓ Save Plan'}
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div style={{
          position: 'fixed', bottom: '24px', left: '50%',
          transform: 'translateX(-50%)',
          background: '#C9A84C', color: '#0f172a',
          padding: '10px 20px', borderRadius: '99px',
          fontSize: '13px', fontWeight: 700,
          zIndex: 999, whiteSpace: 'nowrap',
          fontFamily: "'DM Sans', sans-serif",
        }}>
          {toast}
        </div>
      )}
    </div>
  )
}