'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

const STAGES = [
  { value: 'all',  label: 'All Leads' },
  { value: 'hot',  label: '🔥 Ready to Order' },
  { value: 'warm', label: '🌤️ In Discussion' },
  { value: 'new',  label: '🆕 Just Enquired' },
  { value: 'cold', label: '🧊 Gone Quiet' },
]

const STAGE_COLORS = {
  hot:  { bg: 'var(--red-bg)',  color: 'var(--red)',   label: '🔥 Ready to Order' },
  warm: { bg: '#fff7e6',        color: '#e08c00',       label: '🌤️ In Discussion' },
  new:  { bg: 'var(--blue-bg)', color: 'var(--blue)',   label: '🆕 Just Enquired' },
  cold: { bg: '#f0f4ff',        color: '#6b7db3',       label: '🧊 Gone Quiet' },
}
export default function LeadsPage() {
  const [leads, setLeads] = useState([])
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState(null)
  const [filter, setFilter] = useState('all')
  const [toast, setToast] = useState('')

  // Detail modal
  const [selectedLead, setSelectedLead] = useState(null)
  const [editNote, setEditNote] = useState('')
  const [editStage, setEditStage] = useState('new')
  const [savingLead, setSavingLead] = useState(false)

  // Delete
  const [deleteConfirm, setDeleteConfirm] = useState(null)

  useEffect(() => {
    fetchUser()
  }, [])

  useEffect(() => {
    if (userId) {
      fetchLeads()
      subscribeToLeads()
    }
  }, [userId])

  async function fetchUser() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    setUserId(user.id)
  }

  async function fetchLeads() {
    const { data } = await supabase
      .from('leads')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
    setLeads(data || [])
    setLoading(false)
  }

  // Real-time — new lead appears instantly
  function subscribeToLeads() {
    const channel = supabase
      .channel('leads-page')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'leads',
        filter: `user_id=eq.${userId}`,
      }, (payload) => {
        setLeads(prev => [payload.new, ...prev])
        showToast('🔥 New lead just came in!')
      })
      .subscribe()

    return () => supabase.removeChannel(channel)
  }

  // ── OPEN LEAD DETAIL ──
  function openLead(lead) {
    setSelectedLead(lead)
    setEditNote(lead.note || '')
    setEditStage(lead.stage || 'new')
  }

  // ── SAVE LEAD CHANGES ──
  async function saveLead() {
    if (!selectedLead) return
    setSavingLead(true)

    const { error } = await supabase
      .from('leads')
      .update({
        stage: editStage,
        note: editNote,
      })
      .eq('id', selectedLead.id)

    if (error) {
      showToast('❌ Failed to save changes')
      setSavingLead(false)
      return
    }

    setLeads(prev => prev.map(l =>
      l.id === selectedLead.id
        ? { ...l, stage: editStage, note: editNote }
        : l
    ))

    setSelectedLead(null)
    setSavingLead(false)
    showToast('✅ Lead updated')
  }

  // ── DELETE LEAD ──
  async function confirmDelete() {
    if (!deleteConfirm) return

    const { error } = await supabase
      .from('leads')
      .delete()
      .eq('id', deleteConfirm.id)

    if (error) {
      showToast('❌ Failed to delete lead')
      return
    }

    setLeads(prev => prev.filter(l => l.id !== deleteConfirm.id))
    setDeleteConfirm(null)
    setSelectedLead(null)
    showToast('🗑️ Lead deleted')
  }

  // ── WHATSAPP ──
  function openWhatsApp(lead) {
    if (!lead.buyer_whatsapp) {
      showToast('⚠️ No WhatsApp number for this lead')
      return
    }
    const number = lead.buyer_whatsapp.replace(/[^0-9]/g, '')
    const products = Array.isArray(lead.products_interested) && lead.products_interested.length > 0
      ? `\n\nYou were interested in: *${lead.products_interested.join(', ')}*`
      : ''
    const message = encodeURIComponent(
      `Hello ${lead.buyer_name || ''}! 👋\n\nThank you for browsing our catalogue.${products}\n\nI'd love to help you with pricing, samples, or any questions. What would you like to know?`
    )
    window.open(`https://wa.me/${number}?text=${message}`, '_blank')
  }

  function showToast(msg) {
    setToast(msg)
    setTimeout(() => setToast(''), 3000)
  }

  function initials(name) {
    if (!name) return '??'
    return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
  }

  function formatDate(dateStr) {
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
  }

  const filtered = filter === 'all'
    ? leads
    : leads.filter(l => l.stage === filter)

  const counts = {
    hot: leads.filter(l => l.stage === 'hot').length,
    warm: leads.filter(l => l.stage === 'warm').length,
    new: leads.filter(l => l.stage === 'new').length,
    cold: leads.filter(l => l.stage === 'cold').length,
  }

  return (
    <div>

      {/* PAGE HEADER */}
      <div className="ph">
        <div>
          <div className="ph-title">Leads</div>
          <div className="ph-sub">
            {leads.length} total · {counts.hot} hot · {counts.new} new
          </div>
        </div>
      </div>

      {/* STAGE SUMMARY CARDS */}
      <div className="stats-row" style={{ marginBottom: '20px' }}>
        {Object.entries(STAGE_COLORS).map(([stage, style]) => (
          <div
            key={stage}
            className="scard"
            style={{ cursor: 'pointer' }}
            onClick={() => setFilter(stage)}
          >
            <div
              className="scard-accent"
              style={{ background: style.color }}
            />
            <div className="scard-icon" style={{ fontSize: '20px' }}>
              {style.label.split(' ')[0]}
            </div>
            <div>
              <div className="scard-num">{counts[stage]}</div>
              <div className="scard-label">
                {stage.charAt(0).toUpperCase() + stage.slice(1)} Leads
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* FILTER TABS */}
      <div className="alerts-toolbar" style={{ marginBottom: '16px' }}>
        {STAGES.map(s => (
          <button
            key={s.value}
            className={`alert-filter-btn ${filter === s.value ? 'active' : ''}`}
            onClick={() => setFilter(s.value)}
          >
            {s.label}
            {s.value !== 'all' && counts[s.value] > 0 && (
              <span style={{
                marginLeft: '6px',
                background: STAGE_COLORS[s.value]?.color || 'var(--muted)',
                color: '#fff',
                borderRadius: '99px',
                padding: '1px 7px',
                fontSize: '10px',
                fontWeight: 700,
              }}>
                {counts[s.value]}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* LEADS TABLE */}
      <div className="card">
        {loading ? (
          <div style={{
            padding: '48px',
            textAlign: 'center',
            color: 'var(--muted)',
            fontSize: '13px',
          }}>
            Loading leads...
          </div>
        ) : filtered.length === 0 ? (
          <div style={{
            padding: '64px 24px',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: '48px', marginBottom: '12px' }}>👥</div>
            <div style={{
              fontFamily: "'Cormorant Garamond', serif",
              fontSize: '22px',
              color: 'var(--navy)',
              marginBottom: '8px',
            }}>
              {filter === 'all' ? 'No leads yet' : `No ${filter} leads`}
            </div>
            <div style={{ fontSize: '13px', color: 'var(--muted)' }}>
              {filter === 'all'
                ? 'Leads appear here when buyers tap WhatsApp on your catalogue'
                : 'Try a different filter'}
            </div>
          </div>
        ) : (
          <div className="table-scroll-wrap">
            <table>
              <thead>
                <tr>
                  <th>Buyer</th>
                  <th>Country</th>
                  <th>Interested In</th>
                  <th>Stage</th>
                  <th>Note</th>
                  <th>Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(l => {
                  const stage = STAGE_COLORS[l.stage] || STAGE_COLORS.new
                  const products = Array.isArray(l.products_interested)
                    ? l.products_interested
                    : []

                  return (
                    <tr
                      key={l.id}
                      style={{ cursor: 'pointer' }}
                      onClick={() => openLead(l)}
                    >
                      {/* BUYER */}
                      <td>
                        <div className="pt">
                          <div style={{
                            width: '34px',
                            height: '34px',
                            borderRadius: '50%',
                            background: 'var(--navy)',
                            color: '#fff',
                            fontSize: '11px',
                            fontWeight: 700,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                          }}>
                            {initials(l.buyer_name)}
                          </div>
                          <div>
                            <div className="pt-name">
                              {l.buyer_name || 'Unknown Buyer'}
                            </div>
                            <div className="pt-cat">
                              {l.buyer_whatsapp || 'No number'}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* COUNTRY */}
                      <td>
                        <span style={{
                          fontSize: '12.5px',
                          color: 'var(--muted)',
                        }}>
                          {l.buyer_country || '—'}
                        </span>
                      </td>

                      {/* PRODUCTS */}
                      <td>
                        <div style={{
                          display: 'flex',
                          flexWrap: 'wrap',
                          gap: '4px',
                        }}>
                          {products.length === 0 ? (
                            <span style={{
                              fontSize: '12px',
                              color: 'var(--muted)',
                            }}>—</span>
                          ) : products.slice(0, 2).map((p, i) => (
                            <span
                              key={i}
                              style={{
                                fontSize: '11px',
                                background: 'var(--cream)',
                                border: '1px solid var(--border)',
                                borderRadius: '6px',
                                padding: '2px 8px',
                                color: 'var(--navy)',
                              }}
                            >
                              {p}
                            </span>
                          ))}
                          {products.length > 2 && (
                            <span style={{
                              fontSize: '11px',
                              color: 'var(--muted)',
                            }}>
                              +{products.length - 2} more
                            </span>
                          )}
                        </div>
                      </td>

                      {/* STAGE */}
                      <td>
                        <span style={{
                          background: stage.bg,
                          color: stage.color,
                          borderRadius: '99px',
                          padding: '3px 10px',
                          fontSize: '11.5px',
                          fontWeight: 600,
                        }}>
                          {stage.label}
                        </span>
                      </td>

                      {/* NOTE */}
                      <td>
                        <span style={{
                          fontSize: '12px',
                          color: 'var(--muted)',
                          fontStyle: l.note ? 'normal' : 'italic',
                        }}>
                          {l.note
                            ? l.note.length > 30
                              ? l.note.slice(0, 30) + '...'
                              : l.note
                            : 'No note'}
                        </span>
                      </td>

                      {/* DATE */}
                      <td>
                        <span style={{
                          fontSize: '12px',
                          color: 'var(--muted)',
                        }}>
                          {formatDate(l.created_at)}
                        </span>
                      </td>

                      {/* ACTIONS */}
                      <td onClick={e => e.stopPropagation()}>
                        <div style={{ display: 'flex', gap: '5px' }}>
                          <button
                            className="stock-btn"
                            style={{
                              background: '#e8f5e9',
                              color: '#2e7d32',
                            }}
                            onClick={() => openWhatsApp(l)}
                          >
                            💬
                          </button>
                          <button
                            className="stock-btn"
                            style={{
                              background: 'var(--blue-bg)',
                              color: 'var(--blue)',
                            }}
                            onClick={() => openLead(l)}
                          >
                            ✏️
                          </button>
                          <button
                            className="stock-btn"
                            style={{
                              background: 'var(--red-bg)',
                              color: 'var(--red)',
                            }}
                            onClick={() => setDeleteConfirm(l)}
                          >
                            🗑️
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ══ LEAD DETAIL MODAL ══ */}
      {selectedLead && (
        <div className="modal-ov" onClick={() => setSelectedLead(null)}>
          <div
            className="modal-box"
            style={{ maxWidth: '460px' }}
            onClick={e => e.stopPropagation()}
          >
            {/* HEADER */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              marginBottom: '20px',
            }}>
              <div style={{
                width: '48px',
                height: '48px',
                borderRadius: '50%',
                background: 'var(--navy)',
                color: '#fff',
                fontSize: '14px',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}>
                {initials(selectedLead.buyer_name)}
              </div>
              <div>
                <div className="modal-title" style={{ marginBottom: '2px' }}>
                  {selectedLead.buyer_name || 'Unknown Buyer'}
                </div>
                <div style={{ fontSize: '12.5px', color: 'var(--muted)' }}>
                  {selectedLead.buyer_country || 'Unknown country'} ·{' '}
                  {selectedLead.buyer_whatsapp || 'No WhatsApp'}
                </div>
              </div>
            </div>

            {/* PRODUCTS INTERESTED */}
            {Array.isArray(selectedLead.products_interested) &&
              selectedLead.products_interested.length > 0 && (
                <div className="form-group">
                  <label className="form-label">Interested In</label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {selectedLead.products_interested.map((p, i) => (
                      <span
                        key={i}
                        style={{
                          background: 'var(--cream)',
                          border: '1px solid var(--border)',
                          borderRadius: '8px',
                          padding: '4px 10px',
                          fontSize: '12.5px',
                          color: 'var(--navy)',
                        }}
                      >
                        📦 {p}
                      </span>
                    ))}
                  </div>
                </div>
              )}

            {/* STAGE */}
            <div className="form-group">
              <label className="form-label">Lead Stage</label>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {Object.entries(STAGE_COLORS).map(([stage, style]) => (
                  <button
                    key={stage}
                    onClick={() => setEditStage(stage)}
                    style={{
                      padding: '7px 14px',
                      borderRadius: '99px',
                      border: `1.5px solid ${editStage === stage
                        ? style.color
                        : 'var(--border)'}`,
                      background: editStage === stage
                        ? style.bg
                        : '#fff',
                      color: editStage === stage
                        ? style.color
                        : 'var(--muted)',
                      fontSize: '12.5px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      fontFamily: "'DM Sans', sans-serif",
                      transition: 'all .18s',
                    }}
                  >
                    {style.label}
                  </button>
                ))}
              </div>
            </div>

            {/* NOTE */}
            <div className="form-group">
              <label className="form-label">Private Note</label>
              <textarea
                className="form-input"
                rows={3}
                placeholder="e.g. Interested in bulk order of 500 meters, follow up next week..."
                value={editNote}
                onChange={e => setEditNote(e.target.value)}
              />
            </div>

            {/* ACTIONS */}
            <div className="modal-actions">
              <button
                className="btn btn-outline"
                style={{ background: '#e8f5e9', color: '#2e7d32', border: 'none' }}
                onClick={() => openWhatsApp(selectedLead)}
              >
                💬 WhatsApp
              </button>
              <button
                className="btn btn-gold"
                onClick={saveLead}
                disabled={savingLead}
                style={{
                  flex: 2,
                  justifyContent: 'center',
                  opacity: savingLead ? 0.7 : 1,
                }}
              >
                {savingLead ? 'Saving...' : '✓ Save Changes'}
              </button>
            </div>

            {/* DELETE LINK */}
            <div style={{ textAlign: 'center', marginTop: '12px' }}>
              <span
                style={{
                  fontSize: '12px',
                  color: 'var(--red)',
                  cursor: 'pointer',
                }}
                onClick={() => {
                  setSelectedLead(null)
                  setDeleteConfirm(selectedLead)
                }}
              >
                🗑️ Delete this lead
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ══ DELETE CONFIRM MODAL ══ */}
      {deleteConfirm && (
        <div className="modal-ov" onClick={() => setDeleteConfirm(null)}>
          <div
            className="modal-box"
            style={{ maxWidth: '360px' }}
            onClick={e => e.stopPropagation()}
          >
            <div className="modal-title">🗑️ Delete Lead</div>
            <div className="modal-sub">
              Are you sure you want to permanently delete the lead from{' '}
              <strong>{deleteConfirm.buyer_name || 'this buyer'}</strong>?
              This cannot be undone.
            </div>
            <div className="modal-actions">
              <button
                className="btn btn-outline"
                onClick={() => setDeleteConfirm(null)}
              >
                Cancel
              </button>
              <button
                className="btn"
                onClick={confirmDelete}
                style={{
                  flex: 2,
                  justifyContent: 'center',
                  background: 'var(--red)',
                  color: '#fff',
                  border: 'none',
                }}
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TOAST */}
      {toast && (
        <div className="gtoast">{toast}</div>
      )}

    </div>
  )
}
