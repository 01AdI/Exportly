'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

const FILTERS = [
  { label: 'All', value: 'all' },
  { label: '🔥 Hot Activity', value: 'hot' },
  { label: '📩 New Leads', value: 'lead' },
  { label: '⚠️ Stock', value: 'stock' },
  { label: '📊 Insights', value: 'insight' },
  { label: '🗑️ Deleted', value: 'deleted' },
]

export default function AlertsPage() {
  const [alerts, setAlerts] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [userId, setUserId] = useState(null)
  const [toast, setToast] = useState('')

  useEffect(() => {
    fetchUser()
  }, [])

  useEffect(() => {
    if (userId) {
      fetchAlerts()
      subscribeToAlerts()
    }
  }, [userId])

  async function fetchUser() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    setUserId(user.id)
  }

  async function fetchAlerts() {
    const { data } = await supabase
      .from('alerts')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
    setAlerts(data || [])
    setLoading(false)
  }

  function subscribeToAlerts() {
    const channel = supabase
      .channel('alerts-page')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'alerts',
        filter: `user_id=eq.${userId}`,
      }, (payload) => {
        setAlerts(prev => [payload.new, ...prev])
        showToast('🔔 New alert just came in')
      })
      .subscribe()

    return () => supabase.removeChannel(channel)
  }

  async function markAllRead() {
    await supabase
      .from('alerts')
      .update({ is_read: true })
      .eq('user_id', userId)
      .eq('is_read', false)

    setAlerts(prev => prev.map(a => ({ ...a, is_read: true })))
    showToast('✅ All alerts marked as read')
  }

  async function markOneRead(id) {
    await supabase
      .from('alerts')
      .update({ is_read: true })
      .eq('id', id)

    setAlerts(prev => prev.map(a =>
      a.id === id ? { ...a, is_read: true } : a
    ))
  }

  // ── SOFT DELETE ──
  async function deleteAlert(id, e) {
    e.stopPropagation()

    await supabase
      .from('alerts')
      .update({ is_deleted: true })
      .eq('id', id)

    setAlerts(prev => prev.map(a =>
      a.id === id ? { ...a, is_deleted: true } : a
    ))
    showToast('🗑️ Alert deleted — restore it from the Deleted tab')
  }

  // ── RESTORE ──
  async function restoreAlert(id, e) {
    e.stopPropagation()

    await supabase
      .from('alerts')
      .update({ is_deleted: false })
      .eq('id', id)

    setAlerts(prev => prev.map(a =>
      a.id === id ? { ...a, is_deleted: false } : a
    ))
    showToast('↩️ Alert restored')
  }

  function showToast(msg) {
    setToast(msg)
    setTimeout(() => setToast(''), 4000)
  }

  function alertIcon(type) {
    const map = {
      hot: '🔥',
      lead: '📩',
      stock: '⚠️',
      insight: '📊',
    }
    return map[type] || '🔔'
  }

  // ── NOW ACTUALLY USED — left border color per type ──
  function alertBorderColor(type) {
    const map = {
      hot: 'var(--red)',
      lead: 'var(--blue)',
      stock: 'var(--orange)',
      insight: 'var(--gold)',
    }
    return map[type] || 'var(--gold)'
  }

  function timeAgo(dateStr) {
    const now = new Date()
    const date = new Date(dateStr)
    const diff = Math.floor((now - date) / 1000)

    if (diff < 60) return 'Just now'
    if (diff < 3600) return `${Math.floor(diff / 60)} mins ago`
    if (diff < 86400) return `${Math.floor(diff / 3600)} hours ago`
    return `${Math.floor(diff / 86400)} days ago`
  }

  // ── FILTER LOGIC ──
  const filtered = filter === 'deleted'
    ? alerts.filter(a => a.is_deleted)
    : filter === 'all'
    ? alerts.filter(a => !a.is_deleted)
    : alerts.filter(a => a.type === filter && !a.is_deleted)

  const unreadCount = alerts.filter(a => !a.is_read && !a.is_deleted).length
  const deletedCount = alerts.filter(a => a.is_deleted).length

  return (
    <div>

      {/* PAGE HEADER */}
      <div className="ph">
        <div>
          <div className="ph-title">Alerts</div>
          <div className="ph-sub">
            {unreadCount > 0
              ? `${unreadCount} unread alerts`
              : 'All caught up ✅'}
          </div>
        </div>
        {unreadCount > 0 && (
          <div className="ph-actions">
            <button
              className="btn btn-outline btn-sm"
              onClick={markAllRead}
            >
              ✓ Mark all as read
            </button>
          </div>
        )}
      </div>

      {/* FILTER TABS */}
      <div className="alerts-toolbar">
        {FILTERS.map(f => (
          <button
            key={f.value}
            className={`alert-filter-btn ${filter === f.value ? 'active' : ''}`}
            onClick={() => setFilter(f.value)}
          >
            {f.label}
            {/* Unread badge on All tab */}
            {f.value === 'all' && unreadCount > 0 && (
              <span style={{
                marginLeft: '6px',
                background: 'var(--red)',
                color: '#fff',
                borderRadius: '99px',
                padding: '1px 7px',
                fontSize: '10px',
                fontWeight: 700,
              }}>
                {unreadCount}
              </span>
            )}
            {/* Count badge on Deleted tab */}
            {f.value === 'deleted' && deletedCount > 0 && (
              <span style={{
                marginLeft: '6px',
                background: 'var(--muted)',
                color: '#fff',
                borderRadius: '99px',
                padding: '1px 7px',
                fontSize: '10px',
                fontWeight: 700,
              }}>
                {deletedCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ALERTS LIST */}
      {loading ? (
        <div style={{
          textAlign: 'center',
          padding: '48px',
          color: 'var(--muted)',
          fontSize: '13px',
        }}>
          Loading alerts...
        </div>
      ) : filtered.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '64px 24px',
          background: '#fff',
          borderRadius: '12px',
          border: '1px solid var(--border)',
        }}>
          <div style={{ fontSize: '48px', marginBottom: '12px' }}>
            {filter === 'deleted' ? '🗑️' : filter === 'all' ? '🔔' : alertIcon(filter)}
          </div>
          <div style={{
            fontFamily: "'Cormorant Garamond', serif",
            fontSize: '22px',
            color: 'var(--navy)',
            marginBottom: '8px',
          }}>
            {filter === 'deleted'
              ? 'No deleted alerts'
              : filter === 'all'
              ? 'No alerts yet'
              : `No ${filter} alerts`}
          </div>
          <div style={{ fontSize: '13px', color: 'var(--muted)' }}>
            {filter === 'deleted'
              ? 'Deleted alerts appear here — they are permanently removed after 5 days'
              : filter === 'all'
              ? 'Alerts appear here when buyers browse your catalogue'
              : 'Try selecting a different filter'}
          </div>
        </div>
      ) : (
        <div className="alerts-scroll">
          {filtered.map(a => (
            <div
              key={a.id}
              className={`alert-card ${!a.is_read && !a.is_deleted ? 'unread' : ''}`}
              style={{
                borderLeft: `4px solid ${alertBorderColor(a.type)}`,
                opacity: a.is_deleted ? 0.6 : 1,
                cursor: !a.is_read && !a.is_deleted ? 'pointer' : 'default',
              }}
              onClick={() => !a.is_read && !a.is_deleted && markOneRead(a.id)}
            >
              {/* ICON */}
              <div className="al-icon">{alertIcon(a.type)}</div>

              {/* CONTENT */}
              <div style={{ flex: 1 }}>
                <div className="al-title">{a.title}</div>
                {a.subtitle && (
                  <div className="al-sub">{a.subtitle}</div>
                )}
                <div className="al-time">
                  🕐 {timeAgo(a.created_at)}
                  {!a.is_read && !a.is_deleted && (
                    <span style={{
                      background: 'var(--blue-bg)',
                      color: 'var(--blue)',
                      fontSize: '10px',
                      fontWeight: 700,
                      padding: '1px 8px',
                      borderRadius: '99px',
                    }}>
                      NEW
                    </span>
                  )}
                  {a.is_deleted && (
                    <span style={{
                      background: 'rgba(0,0,0,0.06)',
                      color: 'var(--muted)',
                      fontSize: '10px',
                      fontWeight: 700,
                      padding: '1px 8px',
                      borderRadius: '99px',
                    }}>
                      DELETED
                    </span>
                  )}
                </div>
              </div>

              {/* ACTIONS */}
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '6px',
                alignItems: 'flex-end',
                flexShrink: 0,
              }}>
                {/* Show Restore in deleted tab, else show delete */}
                {a.is_deleted ? (
                  <button
                    className="btn btn-outline btn-sm"
                    onClick={e => restoreAlert(a.id, e)}
                  >
                    ↩️ Restore
                  </button>
                ) : (
                  <>
                    {a.type === 'lead' && (
                      <button
                        className="btn btn-outline btn-sm"
                        onClick={e => {
                          e.stopPropagation()
                          showToast('📲 Opening WhatsApp...')
                        }}
                      >
                        💬 Reply
                      </button>
                    )}
                    <button
                      onClick={e => deleteAlert(a.id, e)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--muted)',
                        cursor: 'pointer',
                        fontSize: '12px',
                        padding: '2px 6px',
                      }}
                    >
                      🗑️
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* TOAST */}
      {toast && (
        <div className="gtoast">{toast}</div>
      )}

    </div>
  )
}