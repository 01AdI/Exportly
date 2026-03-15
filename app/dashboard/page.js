'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function DashboardPage() {
  const router = useRouter()
  const [profile, setProfile] = useState(null)
  const [products, setProducts] = useState([])
  const [alerts, setAlerts] = useState([])
  const [leads, setLeads] = useState([])
  const [stats, setStats] = useState({
    totalViews: 0,
    totalLeads: 0,
    totalWishlists: 0,
  })
  const [loading, setLoading] = useState(true)
  const [stockModal, setStockModal] = useState(null) // { product, type }
  const [stockQty, setStockQty] = useState(10)
  const [stockNote, setStockNote] = useState('')
  const [toast, setToast] = useState('')

  useEffect(() => {
    fetchAll()
    subscribeToAlerts()
  }, [])

  async function fetchAll() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // Fetch profile
    const { data: profileData } = await supabase
      .from('exporter_profiles')
      .select('*')
      .eq('user_id', user.id)
      .single()
    setProfile(profileData)

    // Fetch top 5 products by views
    const { data: productsData } = await supabase
      .from('products')
      .select('*')
      .eq('user_id', user.id)
      .order('views', { ascending: false })
      .limit(5)
    setProducts(productsData || [])

    // Fetch stats
    const { data: allProducts } = await supabase
      .from('products')
      .select('views, leads, wishlist_count')
      .eq('user_id', user.id)

    if (allProducts) {
      setStats({
        totalViews: allProducts.reduce((sum, p) => sum + (p.views || 0), 0),
        totalLeads: allProducts.reduce((sum, p) => sum + (p.leads || 0), 0),
        totalWishlists: allProducts.reduce((sum, p) => sum + (p.wishlist_count || 0), 0),
      })
    }

    // Fetch latest 4 alerts
    const { data: alertsData } = await supabase
      .from('alerts')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(4)
    setAlerts(alertsData || [])

    // Fetch latest 5 leads
    const { data: leadsData } = await supabase
      .from('leads')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(5)
    setLeads(leadsData || [])

    setLoading(false)
  }

  // Real-time alerts subscription
  function subscribeToAlerts() {
    const channel = supabase
      .channel('dashboard-alerts')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'alerts',
      }, (payload) => {
        setAlerts(prev => [payload.new, ...prev.slice(0, 3)])
        showToast('🔔 New alert received')
      })
      .subscribe()

    return () => supabase.removeChannel(channel)
  }

  function showToast(msg) {
    setToast(msg)
    setTimeout(() => setToast(''), 3000)
  }

  async function applyStock() {
    if (!stockModal) return
    const { product, type } = stockModal

    const newStock = type === 'in'
      ? product.stock + stockQty
      : Math.max(0, product.stock - stockQty)

    // Update product stock
    const { error } = await supabase
      .from('products')
      .update({ stock: newStock })
      .eq('id', product.id)

    if (error) {
      showToast('❌ Failed to update stock')
      return
    }

    // Insert stock history
    await supabase
      .from('stock_history')
      .insert({
        user_id: product.user_id,
        product_id: product.id,
        type,
        quantity: stockQty,
        note: stockNote,
        stock_before: product.stock,
        stock_after: newStock,
      })

    // Create low stock alert if needed
    if (newStock <= 20 && newStock > 0) {
      await supabase.from('alerts').insert({
        user_id: product.user_id,
        type: 'stock',
        title: `Low stock warning — ${product.name}`,
        subtitle: `Only ${newStock} units remaining. Restock soon.`,
        product_id: product.id,
      })
    }

    // Update local state
    setProducts(prev => prev.map(p =>
      p.id === product.id ? { ...p, stock: newStock } : p
    ))

    setStockModal(null)
    setStockQty(10)
    setStockNote('')
    showToast(`✅ Stock ${type === 'in' ? 'added' : 'removed'} successfully`)
  }

  function statusBadge(status) {
    const map = {
      hot: { label: '🔥 Hot Seller', cls: 'b-hot' },
      new: { label: '🆕 New Arrival', cls: 'b-new' },
      normal: { label: 'Available', cls: 'b-norm' },
    }
    const s = map[status] || map.normal
    return <span className={`badge ${s.cls}`}>{s.label}</span>
  }

  function alertBorderColor(type) {
    const map = {
      hot: 'var(--red)',
      lead: 'var(--blue)',
      stock: 'var(--orange)',
      insight: 'var(--gold)',
    }
    return map[type] || 'var(--gold)'
  }

  const LOW_STOCK = 20
  const oosProducts = products.filter(p => p.stock === 0)
  const lowProducts = products.filter(p => p.stock > 0 && p.stock <= LOW_STOCK)
  const showBanner = oosProducts.length > 0 || lowProducts.length > 0

  if (loading) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center',
        justifyContent: 'center', height: '60vh',
        fontSize: '14px', color: 'var(--muted)',
      }}>
        Loading your dashboard...
      </div>
    )
  }

  return (
    <div>

      {/* PAGE HEADER */}
      <div className="ph">
        <div>
          <div className="ph-title">
            Good morning, {profile?.business_name?.split(' ')[0]} Ji 👋
          </div>
          <div className="ph-sub">
            Here's your catalogue performance today
          </div>
        </div>
        <div className="ph-actions">
          <button
            className="btn btn-outline btn-sm"
            onClick={() => {
              const link = `${window.location.origin}/catalogue/${profile?.slug}`
              navigator.clipboard.writeText(link)
              showToast('🔗 Catalogue link copied — share it with buyers!')
            }}
          >
            📤 Share Catalogue Link
          </button>
          <button
            className="btn btn-gold btn-sm"
            onClick={() => router.push('/dashboard/products')}
          >
            ＋ Add Product
          </button>
        </div>
      </div>

      {/* LOW STOCK BANNER */}
      {showBanner && (
        <div className="low-stock-banner" style={{ marginBottom: '20px' }}>
          <div className="lsb-icon">⚠️</div>
          <div style={{ flex: 1 }}>
            <div className="lsb-title">Stock Alert — Attention Required</div>
            <div className="lsb-subtitle">
              {oosProducts.length} out of stock · {lowProducts.length} running low —
              click any to restock now.
            </div>
            <div className="lsb-items">
              {oosProducts.map(p => (
                <span
                  key={p.id}
                  className="lsb-chip oos"
                  onClick={() => setStockModal({ product: p, type: 'in' })}
                >
                  ⚫ {p.name} — Out of Stock
                </span>
              ))}
              {lowProducts.map(p => (
                <span
                  key={p.id}
                  className="lsb-chip low"
                  onClick={() => setStockModal({ product: p, type: 'in' })}
                >
                  ⚠️ {p.name} — {p.stock} left
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* KPI CARDS */}
      <div className="stats-row">
        <div className="scard">
          <div className="scard-accent" style={{ background: 'var(--gold)' }} />
          <div className="scard-icon">👁️</div>
          <div>
            <div className="scard-num">
              {stats.totalViews.toLocaleString()}
            </div>
            <div className="scard-label">Catalogue Views</div>
            <div className="scard-delta delta-up">↑ All time</div>
          </div>
        </div>
        <div className="scard">
          <div className="scard-accent" style={{ background: 'var(--green)' }} />
          <div className="scard-icon">📩</div>
          <div>
            <div className="scard-num">{stats.totalLeads}</div>
            <div className="scard-label">WhatsApp Leads</div>
            <div className="scard-delta delta-up">↑ All time</div>
          </div>
        </div>
        <div className="scard">
          <div className="scard-accent" style={{ background: 'var(--blue)' }} />
          <div className="scard-icon">❤️</div>
          <div>
            <div className="scard-num">{stats.totalWishlists}</div>
            <div className="scard-label">Product Wishlists</div>
            <div className="scard-delta delta-up">↑ All time</div>
          </div>
        </div>
        <div className="scard">
          <div className="scard-accent" style={{ background: '#fc5c8a' }} />
          <div className="scard-icon">📦</div>
          <div>
            <div className="scard-num">{products.length}</div>
            <div className="scard-label">Total Products</div>
            <div className="scard-delta delta-neutral">
              {oosProducts.length > 0
                ? `${oosProducts.length} out of stock`
                : 'All in stock'}
            </div>
          </div>
        </div>
      </div>

      {/* MAIN BODY */}
      <div className="dash-body">

        {/* LEFT — TOP PRODUCTS */}
        <div className="dash-main">
          <div className="card">
            <div className="card-hd">
              <div className="card-title">📦 Top Products</div>
              <span
                className="card-link"
                onClick={() => router.push('/dashboard/products')}
              >
                View all →
              </span>
            </div>
            <div className="table-scroll-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Status</th>
                    <th>Stock</th>
                    <th>Views</th>
                    <th>Leads</th>
                  </tr>
                </thead>
                <tbody>
                  {products.length === 0 ? (
                    <tr>
                      <td colSpan={5} style={{
                        textAlign: 'center',
                        padding: '32px',
                        color: 'var(--muted)',
                        fontSize: '13px',
                      }}>
                        No products yet —{' '}
                        <span
                          style={{ color: 'var(--gold)', cursor: 'pointer' }}
                          onClick={() => router.push('/dashboard/products')}
                        >
                          add your first product
                        </span>
                      </td>
                    </tr>
                  ) : (
                    products.map(p => (
                      <tr key={p.id} style={{
                        background: p.stock === 0
                          ? 'rgba(217,79,79,0.03)'
                          : 'transparent'
                      }}>
                        <td>
                          <div className="pt">
                            <div className="pt-img">
                              {p.image_url
                                ? <img src={p.image_url} alt={p.name} />
                                : <span>{p.emoji}</span>
                              }
                            </div>
                            <div>
                              <div className="pt-name">{p.name}</div>
                              <div className="pt-cat">{p.category}</div>
                            </div>
                          </div>
                        </td>
                        <td>{statusBadge(p.status)}</td>
                        <td>
                          <div className="stock-cell">
                            <span style={{
                              fontWeight: 700,
                              fontSize: '12px',
                              color: p.stock === 0
                                ? 'var(--red)'
                                : p.stock <= LOW_STOCK
                                ? 'var(--orange)'
                                : 'var(--navy)',
                            }}>
                              {p.stock === 0 ? 'Out of Stock' : p.stock}
                            </span>
                            <div className="stock-actions">
                              <button
                                className="stock-btn stock-in"
                                onClick={() => setStockModal({
                                  product: p, type: 'in'
                                })}
                              >
                                +In
                              </button>
                              <button
                                className="stock-btn stock-out"
                                disabled={p.stock === 0}
                                onClick={() => setStockModal({
                                  product: p, type: 'out'
                                })}
                              >
                                −Out
                              </button>
                            </div>
                          </div>
                        </td>
                        <td>
                          <div className="mbar">
                            <div className="mbar-track">
                              <div
                                className="mbar-fill"
                                style={{
                                  width: `${Math.min(100, (p.views / 130) * 100)}%`
                                }}
                              />
                            </div>
                            <span style={{ fontSize: '12px' }}>{p.views}</span>
                          </div>
                        </td>
                        <td>
                          <b style={{ color: 'var(--navy)' }}>{p.leads}</b>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* RIGHT — ALERTS + LEADS */}
        <div className="dash-side">

          {/* ALERTS */}
          <div className="card">
            <div className="card-hd">
              <div className="card-title">🔔 Latest Alerts</div>
              <span
                className="card-link"
                onClick={() => router.push('/dashboard/alerts')}
              >
                See all →
              </span>
            </div>
            <div style={{
              padding: '10px 12px',
              display: 'flex',
              flexDirection: 'column',
              gap: '7px',
            }}>
              {alerts.length === 0 ? (
                <div style={{
                  padding: '16px',
                  textAlign: 'center',
                  fontSize: '12.5px',
                  color: 'var(--muted)',
                }}>
                  No alerts yet — they'll appear when buyers browse your catalogue
                </div>
              ) : (
                alerts.map(a => (
                  <div key={a.id} style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '8px',
                    padding: '9px 10px',
                    background: 'var(--cream)',
                    borderRadius: '8px',
                    borderLeft: `3px solid ${alertBorderColor(a.type)}`,
                  }}>
                    <span style={{ fontSize: '16px', flexShrink: 0 }}>
                      {a.type === 'hot' ? '🔥'
                        : a.type === 'lead' ? '📩'
                        : a.type === 'stock' ? '⚠️'
                        : '📊'}
                    </span>
                    <div style={{ minWidth: 0 }}>
                      <div style={{
                        fontSize: '11.5px',
                        fontWeight: 600,
                        color: 'var(--navy)',
                        lineHeight: 1.3,
                      }}>
                        {a.title}
                      </div>
                      <div style={{
                        fontSize: '10.5px',
                        color: 'var(--muted)',
                        marginTop: '2px',
                      }}>
                        {new Date(a.created_at).toLocaleTimeString('en-IN', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </div>
                    </div>
                    {!a.is_read && (
                      <span style={{
                        width: '6px', height: '6px',
                        background: 'var(--red)',
                        borderRadius: '50%',
                        marginLeft: 'auto',
                        marginTop: '3px',
                        flexShrink: 0,
                      }} />
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* LEADS */}
          <div className="card">
            <div className="card-hd">
              <div className="card-title">👥 Hot Leads</div>
              <span
                className="card-link"
                onClick={() => router.push('/dashboard/leads')}
              >
                See all →
              </span>
            </div>
            <div>
              {leads.length === 0 ? (
                <div style={{
                  padding: '16px',
                  textAlign: 'center',
                  fontSize: '12.5px',
                  color: 'var(--muted)',
                }}>
                  No leads yet — they appear when buyers tap WhatsApp
                </div>
              ) : (
                leads.map(l => (
                  <div key={l.id} style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '9px 14px',
                    borderBottom: '1px solid var(--border)',
                  }}>
                    <div style={{
                      width: '32px', height: '32px',
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
                      {l.buyer_name
                        ? l.buyer_name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
                        : '??'}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{
                        fontWeight: 600,
                        fontSize: '12.5px',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}>
                        {l.buyer_name || 'Unknown Buyer'}
                      </div>
                      <div style={{ fontSize: '10.5px', color: 'var(--muted)' }}>
                        {l.buyer_country || 'Unknown'} · {new Date(l.created_at).toLocaleDateString('en-IN')}
                      </div>
                    </div>
                    {l.stage === 'hot' && (
                      <span style={{ marginLeft: 'auto', flexShrink: 0 }}>🔥</span>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

        </div>
      </div>

      {/* STOCK MODAL */}
      {stockModal && (
        <div className="modal-ov" onClick={() => setStockModal(null)}>
          <div className="modal-box" style={{ maxWidth: '380px' }}
            onClick={e => e.stopPropagation()}
          >
            <div className="modal-title">
              {stockModal.type === 'in' ? '📦 Stock In' : '🚚 Stock Out'}
            </div>
            <div className="modal-sub">
              {stockModal.product.name} · Current stock: {stockModal.product.stock}
            </div>

            <div className="stock-modal-type">
              <button
                className={`smt-btn in ${stockModal.type === 'in' ? 'sel' : ''}`}
                onClick={() => setStockModal(prev => ({ ...prev, type: 'in' }))}
              >
                📦 Stock In
                <br />
                <small style={{ fontWeight: 400, fontSize: '11px' }}>
                  Add inventory
                </small>
              </button>
              <button
                className={`smt-btn out ${stockModal.type === 'out' ? 'sel' : ''}`}
                onClick={() => setStockModal(prev => ({ ...prev, type: 'out' }))}
              >
                🚚 Stock Out
                <br />
                <small style={{ fontWeight: 400, fontSize: '11px' }}>
                  Remove / sold
                </small>
              </button>
            </div>

            <div className="form-group">
              <label className="form-label">Quantity</label>
              <input
                className="form-input"
                type="number"
                min="1"
                value={stockQty}
                onChange={e => setStockQty(Number(e.target.value))}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Note (optional)</label>
              <input
                className="form-input"
                placeholder="e.g. Received from factory"
                value={stockNote}
                onChange={e => setStockNote(e.target.value)}
              />
            </div>

            <div className="modal-actions">
              <button
                className="btn btn-outline"
                onClick={() => setStockModal(null)}
              >
                Cancel
              </button>
              <button
                className="btn btn-green"
                onClick={applyStock}
                style={{ flex: 2 }}
              >
                ✓ Update Stock
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TOAST */}
      {toast && (
        <div className="gtoast show">{toast}</div>
      )}

    </div>
  )
}