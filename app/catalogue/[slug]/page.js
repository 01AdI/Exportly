'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'

const WA_ICON = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
  </svg>
)

const ISSUES = [
  'Size not available',
  'MOQ too high',
  'Need custom design',
  'Different material',
  'Bulk order',
  'Other',
]

export default function CataloguePage() {
  const { slug } = useParams()
  const [profile, setProfile] = useState(null)
  const [products, setProducts] = useState([])
  const [filtered, setFiltered] = useState([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [activeCategory, setActiveCategory] = useState('all')
  const [wishlist, setWishlist] = useState([])
  const [showWishlist, setShowWishlist] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState(null)
  const [panelOpen, setPanelOpen] = useState(false)
  const [toast, setToast] = useState('')

  // Enquiry modal
  const [showEnquiry, setShowEnquiry] = useState(false)
  const [enquiryProduct, setEnquiryProduct] = useState(null)
  const [enquiryForm, setEnquiryForm] = useState({
    what: '', name: '', phone: '', otherIssue: ''
  })
  const [selectedIssues, setSelectedIssues] = useState([])
  const [enquiryError, setEnquiryError] = useState('')

  const sessionId = useRef(Math.random().toString(36).slice(2))

  useEffect(() => { fetchCatalogue() }, [slug])

  useEffect(() => {
    if (activeCategory === 'all') {
      setFiltered(products)
    } else {
      setFiltered(products.filter(p => p.category === activeCategory))
    }
  }, [products, activeCategory])

  async function fetchCatalogue() {
    const { data: profileData } = await supabase
      .from('exporter_profiles')
      .select('*')
      .eq('slug', slug)
      .single()

    if (!profileData) { setNotFound(true); setLoading(false); return }
    setProfile(profileData)

    const { data: productsData } = await supabase
      .from('products')
      .select('*')
      .eq('user_id', profileData.user_id)
      .order('created_at', { ascending: false })

    setProducts(productsData || [])

    await supabase.from('catalogue_views').insert({
      user_id: profileData.user_id,
      buyer_session_id: sessionId.current,
    })
    await supabase.from('alerts').insert({
      user_id: profileData.user_id,
      type: 'hot',
      title: 'Someone is viewing your catalogue',
      subtitle: 'A buyer just opened your catalogue',
    })

    setLoading(false)
  }

  async function openProduct(product) {
    if (product.stock === 0) return
    setSelectedProduct(product)
    setPanelOpen(true)

    await supabase
      .from('products')
      .update({ views: product.views + 1 })
      .eq('id', product.id)

    await supabase.from('catalogue_views').insert({
      user_id: product.user_id,
      product_id: product.id,
      buyer_session_id: sessionId.current,
    })

    if ((product.views + 1) >= 10 && (product.views + 1) % 10 === 0) {
      await supabase.from('alerts').insert({
        user_id: product.user_id,
        type: 'hot',
        title: `🔥 ${product.name} is getting attention`,
        subtitle: `${product.views + 1} views so far`,
        product_id: product.id,
      })
    }
  }

  function closePanel() {
    setPanelOpen(false)
    setTimeout(() => setSelectedProduct(null), 380)
  }

  function toggleWishlist(product, e) {
    e?.stopPropagation()
    const exists = wishlist.find(p => p.id === product.id)
    if (exists) {
      setWishlist(prev => prev.filter(p => p.id !== product.id))
      showToast('Removed from wishlist')
    } else {
      setWishlist(prev => [...prev, product])
      showToast('❤️ Added to wishlist!')
      supabase.from('products').update({
        wishlist_count: (product.wishlist_count || 0) + 1
      }).eq('id', product.id)
    }
  }

  function isWishlisted(id) {
    return wishlist.some(p => p.id === id)
  }

  // ── OPEN ENQUIRY MODAL ──
  function openEnquiry(product, e) {
    e?.stopPropagation()
    setEnquiryProduct(product || null)
    setEnquiryForm({ what: '', name: '', phone: '', otherIssue: '' })
    setSelectedIssues([])
    setEnquiryError('')
    setShowEnquiry(true)
    if (product) setPanelOpen(false)
  }

  function toggleIssue(issue) {
    setSelectedIssues(prev =>
      prev.includes(issue)
        ? prev.filter(i => i !== issue)
        : [...prev, issue]
    )
  }

  function sendEnquiry() {
    setEnquiryError('')

    if (!enquiryForm.what.trim()) {
      setEnquiryError('Please tell us what you are looking for')
      return
    }
    if (selectedIssues.includes('Other') && !enquiryForm.otherIssue.trim()) {
      setEnquiryError('Please describe your issue in the Other field')
      return
    }
    if (!enquiryForm.name.trim()) {
      setEnquiryError('Please enter your name')
      return
    }
    if (!enquiryForm.phone.trim()) {
      setEnquiryError('Please enter your WhatsApp number')
      return
    }

    const issues = selectedIssues.map(i =>
      i === 'Other' ? `Other: ${enquiryForm.otherIssue}` : i
    )

    const number = profile.whatsapp_number.replace(/[^0-9]/g, '')
    const productLine = enquiryProduct
      ? `Product: *${enquiryProduct.name}*\n` : ''
    const issuesLine = issues.length > 0
      ? `Issue: ${issues.join(', ')}\n` : ''

    const msg =
      `Hello! I have an enquiry from your catalogue.\n\n` +
      productLine +
      `Looking for: ${enquiryForm.what}\n` +
      issuesLine +
      `\nName: ${enquiryForm.name}\n` +
      `WhatsApp: ${enquiryForm.phone}`

    window.open(
      `https://wa.me/${number}?text=${encodeURIComponent(msg)}`,
      '_blank'
    )

    supabase.from('leads').insert({
      user_id: profile.user_id,
      buyer_name: enquiryForm.name,
      buyer_whatsapp: enquiryForm.phone,
      products_interested: enquiryProduct ? [enquiryProduct.name] : [],
      stage: 'new',
      note: `Looking for: ${enquiryForm.what}. Issues: ${issues.join(', ')}`,
    })

    supabase.from('alerts').insert({
      user_id: profile.user_id,
      type: 'lead',
      title: `New enquiry from ${enquiryForm.name}`,
      subtitle: enquiryProduct
        ? `About ${enquiryProduct.name} — ${enquiryForm.what}`
        : enquiryForm.what,
      product_id: enquiryProduct?.id || null,
    })

    setShowEnquiry(false)
    showToast('📲 Opening WhatsApp with your request...')
  }

  // ── WISHLIST WHATSAPP (direct — no modal needed) ──
  function whatsappWishlist() {
    if (!profile?.whatsapp_number) return
    const number = profile.whatsapp_number.replace(/[^0-9]/g, '')
    const list = wishlist
      .map((p, i) => `${i + 1}. ${p.name} (MOQ: ${p.moq || 'TBD'})`)
      .join('\n')
    const msg =
      `Hello! I'm interested in the following products from your catalogue:\n\n` +
      list +
      `\n\nCould you share pricing and availability?`
    window.open(
      `https://wa.me/${number}?text=${encodeURIComponent(msg)}`,
      '_blank'
    )
    supabase.from('leads').insert({
      user_id: profile.user_id,
      products_interested: wishlist.map(p => p.name),
      stage: 'new',
    })
  }

  function showToast(msg) {
    setToast(msg)
    setTimeout(() => setToast(''), 3000)
  }

  const categories = ['all', ...new Set(products.map(p => p.category))]

  const grouped = activeCategory === 'all'
    ? categories.filter(c => c !== 'all').map(cat => ({
        cat,
        items: products.filter(p => p.category === cat)
      })).filter(g => g.items.length > 0)
    : [{ cat: activeCategory, items: filtered }]

  // ── NOT FOUND ──
  if (notFound) return (
    <div style={{
      minHeight: '100vh', background: 'var(--cream)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexDirection: 'column', gap: '12px', textAlign: 'center', padding: '24px'
    }}>
      <div style={{ fontSize: '48px' }}>🔍</div>
      <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: '28px', color: 'var(--navy)' }}>
        Catalogue not found
      </div>
      <div style={{ fontSize: '13.5px', color: 'var(--muted)' }}>
        This link may be incorrect or no longer active.
      </div>
    </div>
  )

  // ── LOADING ──
  if (loading) return (
    <div style={{
      minHeight: '100vh', background: 'var(--cream)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: '14px', color: 'var(--muted)'
    }}>
      Loading catalogue...
    </div>
  )

  return (
    <div className="buyer-outer">

      {/* ── HERO ── */}
      <div className="buyer-hero">
        <div className="bh-inner">
          <div className="bh-left">
            <div className="bh-logo">
                {profile.logo_url
                    ? <img src={profile.logo_url} alt="logo" style={{ width: '100%', height: '100%', objectFit: 'contain', borderRadius: '12px', padding: '6px' }} />
                    : <span style={{ fontSize: '28px' }}>✦</span>
                }
            </div>
            <div>
              <div className="bh-name">{profile.business_name}</div>
              <div className="bh-meta">
                {profile.location && <span>📍 {profile.location}</span>}
                {profile.location && profile.established_year && (
                  <div className="bh-divider" />
                )}
                {profile.established_year && (
                  <span>Est. {profile.established_year}</span>
                )}
                <div className="bh-divider" />
                <span>{products.length} Products</span>
              </div>
              {profile.tags?.length > 0 && (
                <div className="bh-tags">
                  {profile.tags.map((t, i) => (
                    <span key={i} className="bh-tag">{t}</span>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div className="bh-right">
            <button
              className="custom-wa-btn"
              onClick={e => openEnquiry(null, e)}
            >
              {WA_ICON}
              Enquire on WhatsApp
            </button>
          </div>
        </div>
      </div>

      {/* ── STICKY FILTER BAR ── */}
      <div className="buyer-filter-bar">
        <div className="cat-pills">
          {categories.map(cat => (
            <button
              key={cat}
              className={`cpill ${activeCategory === cat ? 'active' : ''}`}
              onClick={() => setActiveCategory(cat)}
            >
              {cat === 'all' ? 'All Collections' : cat}
            </button>
          ))}
        </div>
        <div className="bfb-right">
          <span className="prod-count-label">{filtered.length} products</span>
          <button className="wl-float-btn" onClick={() => setShowWishlist(true)}>
            ❤️ Wishlist <span className="wl-count-badge">{wishlist.length}</span>
          </button>
        </div>
      </div>

      {/* ── BODY ── */}
      <div className="buyer-body">
        <div className={`buyer-left ${panelOpen ? 'panel-open' : ''}`}>

          {products.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '80px 24px' }}>
              <div style={{ fontSize: '48px', marginBottom: '12px' }}>📦</div>
              <div style={{
                fontFamily: "'Cormorant Garamond',serif",
                fontSize: '26px', color: 'var(--navy)', marginBottom: '8px'
              }}>
                No products yet
              </div>
              <div style={{ fontSize: '13px', color: 'var(--muted)' }}>
                This exporter hasn't added any products yet.
              </div>
            </div>
          ) : (
            grouped.map(({ cat, items }) => (
              <div key={cat} style={{ marginBottom: '48px' }}>
                <div className="cat-section-title">
                  {cat}
                  <span>{items.length} product{items.length !== 1 ? 's' : ''}</span>
                </div>
                <div className="prem-grid">
                  {items.map(product => (
                    <div
                      key={product.id}
                      className={`pcard ${product.stock === 0 ? 'oos' : ''} ${isWishlisted(product.id) ? 'wishlisted' : ''}`}
                      onClick={() => openProduct(product)}
                    >
                      <div className="pc-img-wrap" style={{ height: '200px' }}>
                        {product.image_url ? (
                          <img src={product.image_url} alt={product.name} />
                        ) : (
                          <div className="pc-emoji-display" style={{ height: '200px' }}>
                            <span>{product.emoji}</span>
                          </div>
                        )}
                        <div className="pc-badge-row">
                          {product.status === 'hot' && (
                            <span className="pc-badge pcb-hot">Hot</span>
                          )}
                          {product.status === 'new' && (
                            <span className="pc-badge pcb-new">New</span>
                          )}
                          {product.stock === 0 && (
                            <span className="pc-badge pcb-oos">Out of Stock</span>
                          )}
                        </div>
                        {product.stock > 0 && (
                          <button
                            className={`heart-btn ${isWishlisted(product.id) ? 'hearted' : ''}`}
                            onClick={e => toggleWishlist(product, e)}
                          >
                            {isWishlisted(product.id) ? '❤️' : '🤍'}
                          </button>
                        )}
                      </div>

                      <div className="pc-body">
                        <div className="pc-category">{product.category}</div>
                        <div className="pc-name">{product.name}</div>
                        {product.description && (
                          <div className="pc-desc">
                            {product.description.length > 80
                              ? product.description.slice(0, 80) + '...'
                              : product.description}
                          </div>
                        )}
                        <div className="pc-foot">
                          <div className="pc-moq">
                            MOQ: <strong>{product.moq || 'TBD'}</strong>
                          </div>
                          <div style={{
                            fontSize: '13px', fontWeight: 700, color: 'var(--gold)'
                          }}>
                            {product.price_range || 'Price on request'}
                          </div>
                        </div>
                        {product.stock === 0 && (
                          <button
                            className="pc-oos-wa"
                            onClick={e => openEnquiry(product, e)}
                          >
                            💬 Notify me when available
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}

          <div style={{
            textAlign: 'center', padding: '32px 0 48px',
            borderTop: '1px solid #e0d8c8', marginTop: '24px'
          }}>
            <div style={{
              fontFamily: "'Cormorant Garamond',serif",
              fontSize: '15px', color: 'var(--muted)'
            }}>
              Powered by ✦ Exportly
            </div>
            <div style={{
              fontSize: '12px', color: 'var(--muted)',
              marginTop: '4px', opacity: 0.6
            }}>
              Smart Catalogues for Indian Exporters
            </div>
          </div>
        </div>

        {/* ── DETAIL PANEL ── */}
        <div className={`buyer-right-panel ${panelOpen ? 'open' : ''}`}>
        {selectedProduct && (
            <>
            <div className="dp-scroll">
                <div className="dp-img-box" style={{ height: '260px' }}>
                {selectedProduct.image_url ? (
                    <img src={selectedProduct.image_url} alt={selectedProduct.name} />
                ) : (
                    <div className="dp-emoji">{selectedProduct.emoji}</div>
                )}
                {/* ✅ CLOSE BUTTON INSIDE IMAGE BOX — overlays top-right corner */}
                <button className="dp-close" onClick={closePanel}>✕</button>
                </div>
                <div className="dp-content">
                <div className="dp-cat-label">{selectedProduct.category}</div>
                <div className="dp-name">{selectedProduct.name}</div>
                <div className="dp-divider" />
                {selectedProduct.description && (
                    <div className="dp-desc">{selectedProduct.description}</div>
                )}
                <div className="dp-meta-row">
                    {selectedProduct.moq && (
                    <div className="dp-meta-item">
                        <div className="dp-meta-label">Min. Order</div>
                        <div className="dp-meta-val">{selectedProduct.moq}</div>
                    </div>
                    )}
                    {selectedProduct.price_range && (
                    <div className="dp-meta-item">
                        <div className="dp-meta-label">Price Range</div>
                        <div className="dp-meta-val" style={{ color: 'var(--gold)' }}>
                        {selectedProduct.price_range}
                        </div>
                    </div>
                    )}
                    <div className="dp-meta-item">
                    <div className="dp-meta-label">Availability</div>
                    <div className="dp-meta-val" style={{
                        color: selectedProduct.stock > 0 ? 'var(--green)' : 'var(--red)'
                    }}>
                        {selectedProduct.stock > 0 ? 'In Stock' : 'Out of Stock'}
                    </div>
                    </div>
                    <div className="dp-meta-item">
                    <div className="dp-meta-label">Views</div>
                    <div className="dp-meta-val">{selectedProduct.views + 1}</div>
                    </div>
                </div>
                </div>
            </div>
            <div className="dp-actions">
                <button
                className="wa-quot-btn"
                onClick={e => openEnquiry(selectedProduct, e)}
                >
                {WA_ICON}
                Ask for Quotation via WhatsApp
                </button>
                <button
                className={`wl-add-btn ${isWishlisted(selectedProduct.id) ? 'in-wl' : ''}`}
                onClick={e => toggleWishlist(selectedProduct, e)}
                >
                {isWishlisted(selectedProduct.id) ? '❤️ In Wishlist' : '🤍 Add to Wishlist'}
                </button>
            </div>
            </>
        )}
        </div>
      </div>

      {/* ── WISHLIST SIDEBAR ── */}
      <div className={`wl-sidebar ${showWishlist ? 'open' : ''}`}>
        <div className="wl-hd">
          <div className="wl-hd-title">My Wishlist</div>
          <button
            className="dp-close"
            style={{ position: 'static' }}
            onClick={() => setShowWishlist(false)}
          >✕</button>
        </div>
        <div className="wl-items-wrap">
          {wishlist.length === 0 ? (
            <div className="wl-empty-state">
              <div className="wl-empty-icon">🛍️</div>
              <div>No items yet.<br />Heart products you like!</div>
            </div>
          ) : (
            wishlist.map(p => (
              <div key={p.id} className="wl-item">
                <div className="wl-img">
                  {p.image_url
                    ? <img src={p.image_url} alt={p.name} />
                    : p.emoji}
                </div>
                <div>
                  <div className="wl-iname">{p.name}</div>
                  <div className="wl-icat">{p.category}</div>
                </div>
                <button className="wl-rm" onClick={() => toggleWishlist(p)}>✕</button>
              </div>
            ))
          )}
        </div>
        <div className="wl-foot">
          <button
            className="wa-quot-btn"
            onClick={whatsappWishlist}
            disabled={wishlist.length === 0}
          >
            {WA_ICON}
            Ask for Quotation via WhatsApp
          </button>
          <div style={{
            fontSize: '11px', color: 'var(--muted)',
            textAlign: 'center', marginTop: '8px'
          }}>
            Pre-written message with your selected products
          </div>
        </div>
      </div>

      {/* ── ENQUIRY MODAL ── */}
      {showEnquiry && (
        <div
          style={{
            position: 'fixed', inset: 0,
            background: 'rgba(14,28,56,0.5)',
            zIndex: 400,
            display: 'flex', alignItems: 'center',
            justifyContent: 'center', padding: '20px',
          }}
          onClick={() => setShowEnquiry(false)}
        >
          <div
            style={{
              background: '#fff', borderRadius: '18px',
              padding: '30px', width: '100%', maxWidth: '480px',
              maxHeight: '90vh', overflowY: 'auto',
              boxShadow: 'var(--shadow-lg)',
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{
              fontFamily: "'Cormorant Garamond',serif",
              fontSize: '24px', color: 'var(--navy)', marginBottom: '6px'
            }}>
              💬 Custom Enquiry
            </div>
            <div style={{
              fontSize: '13px', color: 'var(--muted)',
              marginBottom: '20px', lineHeight: 1.6,
            }}>
              {enquiryProduct
                ? `Enquiring about: ${enquiryProduct.name}`
                : "Tell us what you need and we'll check if we can fulfil it."}
            </div>

            {/* ERROR */}
            {enquiryError && (
              <div style={{
                background: 'var(--red-bg)',
                border: '1px solid rgba(217,79,79,0.3)',
                borderRadius: '8px', padding: '10px 14px',
                fontSize: '13px', color: 'var(--red)', marginBottom: '16px',
              }}>
                ⚠️ {enquiryError}
              </div>
            )}

            {/* WHAT */}
            <div className="form-group">
              <label className="form-label">What are you looking for? *</label>
              <input
                className="form-input"
                placeholder="e.g. Block print fabric, 200 meters, custom colours"
                value={enquiryForm.what}
                onChange={e => setEnquiryForm(f => ({ ...f, what: e.target.value }))}
              />
            </div>

            {/* ISSUES */}
            <div className="form-group">
              <label className="form-label">What's the issue? (optional)</label>
              <div className="cr-chips">
                {ISSUES.map(issue => (
                  <div
                    key={issue}
                    className={`cr-chip ${selectedIssues.includes(issue) ? 'sel' : ''}`}
                    onClick={() => toggleIssue(issue)}
                  >
                    {issue}
                  </div>
                ))}
              </div>

              {/* OTHER FIELD — only when Other selected */}
              {selectedIssues.includes('Other') && (
                <div style={{ marginTop: '10px' }}>
                  <input
                    className="form-input"
                    placeholder="Please describe your issue *"
                    value={enquiryForm.otherIssue}
                    onChange={e => setEnquiryForm(f => ({
                      ...f, otherIssue: e.target.value
                    }))}
                    style={{
                      borderColor: enquiryError && !enquiryForm.otherIssue.trim()
                        ? 'var(--red)' : undefined
                    }}
                  />
                  <div style={{
                    fontSize: '11.5px', color: 'var(--muted)', marginTop: '4px'
                  }}>
                    Required — please describe your issue
                  </div>
                </div>
              )}
            </div>

            {/* NAME */}
            <div className="form-group">
              <label className="form-label">Your Name *</label>
              <input
                className="form-input"
                placeholder="Ahmed Hassan"
                value={enquiryForm.name}
                onChange={e => setEnquiryForm(f => ({ ...f, name: e.target.value }))}
              />
            </div>

            {/* PHONE */}
            <div className="form-group">
              <label className="form-label">Your WhatsApp Number *</label>
              <input
                className="form-input"
                placeholder="+971 50 123 4567"
                type="tel"
                value={enquiryForm.phone}
                onChange={e => setEnquiryForm(f => ({ ...f, phone: e.target.value }))}
              />
            </div>

            <div className="modal-actions">
              <button
                className="btn btn-outline"
                onClick={() => setShowEnquiry(false)}
              >
                Cancel
              </button>
              <button
                className="wa-quot-btn"
                style={{ flex: 2, padding: '11px 18px' }}
                onClick={sendEnquiry}
              >
                {WA_ICON}
                Send via WhatsApp
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── TOAST ── */}
      {toast && <div className="gtoast show">{toast}</div>}

    </div>
  )
}