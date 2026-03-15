'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'

const WA_ICON = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
  </svg>
)

export default function CataloguePage() {
  const { slug } = useParams()
  const [profile, setProfile] = useState(null)
  const [products, setProducts] = useState([])
  const [filtered, setFiltered] = useState([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  // Filters
  const [activeCategory, setActiveCategory] = useState('all')
  const [search, setSearch] = useState('')

  // Wishlist
  const [wishlist, setWishlist] = useState([])
  const [showWishlist, setShowWishlist] = useState(false)

  // Detail panel
  const [selectedProduct, setSelectedProduct] = useState(null)
  const [panelOpen, setPanelOpen] = useState(false)

  // Enquiry modal
  const [enquiryModal, setEnquiryModal] = useState(false) // product
  const [buyerName, setBuyerName] = useState('')
  const [buyerPhone, setBuyerPhone] = useState('')
  const [enquirySaving, setEnquirySaving] = useState(false)

  // Tracking refs
  const sessionId = useRef(Math.random().toString(36).slice(2))
  const viewTimerRef = useRef(null)
  const categoryTimerRef = useRef(null)
  const lastCategoryRef = useRef('all')
  const productsOpenedRef = useRef(0)
  const productOpenedAtRef = useRef(null)

  useEffect(() => {
    fetchCatalogue()
  }, [slug])

  useEffect(() => {
    applyFilters()
  }, [products, search, activeCategory])

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (viewTimerRef.current) clearTimeout(viewTimerRef.current)
      if (categoryTimerRef.current) clearTimeout(categoryTimerRef.current)
    }
  }, [])

  async function fetchCatalogue() {
    const { data: profileData } = await supabase
      .from('exporter_profiles')
      .select('*')
      .eq('slug', slug)
      .single()

    if (!profileData) {
      setNotFound(true)
      setLoading(false)
      return
    }

    setProfile(profileData)

    const { data: productsData } = await supabase
      .from('products')
      .select('*')
      .eq('user_id', profileData.user_id)
      .order('created_at', { ascending: false })

    setProducts(productsData || [])
    setLoading(false)

    // ── ALERT: Catalogue opened (once per session) ──
    const sessionAlertKey = `catalogue_alerted_${profileData.slug}`
    if (!sessionStorage.getItem(sessionAlertKey)) {
      sessionStorage.setItem(sessionAlertKey, '1')
      await supabase.from('catalogue_views').insert({
        user_id: profileData.user_id,
        buyer_session_id: sessionId.current,
        buyer_country: null,
      })
      await supabase.from('alerts').insert({
        user_id: profileData.user_id,
        type: 'hot',
        title: 'Someone is viewing your catalogue',
        subtitle: 'A buyer just opened your catalogue',
      })
    }
  }

  function applyFilters() {
    let list = [...products]
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(p =>
        p.name.toLowerCase().includes(q) ||
        p.category?.toLowerCase().includes(q) ||
        (p.description || '').toLowerCase().includes(q)
      )
    }
    if (activeCategory !== 'all') {
      list = list.filter(p => p.category === activeCategory)
    }
    setFiltered(list)
  }

  async function openProduct(product) {
    setSelectedProduct(product)
    setPanelOpen(true)
    productOpenedAtRef.current = Date.now()

    // Track product view
    productsOpenedRef.current += 1

    await supabase
      .from('products')
      .update({ views: (product.views || 0) + 1 })
      .eq('id', product.id)

    await supabase.from('catalogue_views').insert({
      user_id: product.user_id,
      product_id: product.id,
      buyer_session_id: sessionId.current,
    })

    // Milestone view alert (every 10 views)
    const newViews = (product.views || 0) + 1
    if (newViews >= 10 && newViews % 10 === 0) {
      await supabase.from('alerts').insert({
        user_id: product.user_id,
        type: 'hot',
        title: `🔥 ${product.name} hit ${newViews} views`,
        subtitle: 'This product is getting serious buyer attention',
        product_id: product.id,
      })
    }

    // ── ALERT: 15s deep interest (once per product per session) ──
    if (viewTimerRef.current) clearTimeout(viewTimerRef.current)
    viewTimerRef.current = setTimeout(async () => {
      const viewKey = `view15_alerted_${product.id}`
      if (!sessionStorage.getItem(viewKey)) {
        sessionStorage.setItem(viewKey, '1')
        await supabase.from('alerts').insert({
          user_id: product.user_id,
          type: 'hot',
          title: `👀 Buyer spending time on ${product.name}`,
          subtitle: 'A buyer has been viewing this product for over 15 seconds',
          product_id: product.id,
        })
      }
    }, 15000)

    // ── ALERT: Hot buyer — 3 products opened (once per session) ──
    if (productsOpenedRef.current === 3) {
      const hotKey = `hot_buyer_alerted_${sessionId.current}`
      if (!sessionStorage.getItem(hotKey)) {
        sessionStorage.setItem(hotKey, '1')
        await supabase.from('alerts').insert({
          user_id: product.user_id,
          type: 'hot',
          title: '🔥 Hot Buyer — browsing multiple products',
          subtitle: 'A buyer has now opened 3+ products in your catalogue',
        })
      }
    }
  }

  function closePanel() {
    setPanelOpen(false)

    // Clear 15s timer
    if (viewTimerRef.current) {
      clearTimeout(viewTimerRef.current)
      viewTimerRef.current = null
    }

    // Update duration_in_seconds
    if (selectedProduct && productOpenedAtRef.current) {
      const seconds = Math.floor((Date.now() - productOpenedAtRef.current) / 1000)
      supabase
        .from('catalogue_views')
        .update({ duration_in_seconds: seconds })
        .eq('product_id', selectedProduct.id)
        .eq('buyer_session_id', sessionId.current)
    }

    setTimeout(() => setSelectedProduct(null), 380)
  }

  function toggleWishlist(product, e) {
    if (e && e.stopPropagation) e.stopPropagation()

    const isAlreadyWishlisted = wishlist.some(p => p.id === product.id)

    if (isAlreadyWishlisted) {
      setWishlist(prev => prev.filter(p => p.id !== product.id))
    } else {
      setWishlist(prev => [...prev, product])

      // Update wishlist_count in DB
      supabase
        .from('products')
        .update({ wishlist_count: (product.wishlist_count || 0) + 1 })
        .eq('id', product.id)

      // ── ALERT: Wishlist add (once per product per session) ──
      const wlKey = `wl_alerted_${product.id}`
      if (!sessionStorage.getItem(wlKey)) {
        sessionStorage.setItem(wlKey, '1')
        supabase.from('alerts').insert({
          user_id: product.user_id,
          type: 'hot',
          title: `❤️ Buyer wishlisted ${product.name}`,
          subtitle: 'A buyer saved this product to their wishlist',
          product_id: product.id,
        })
      }
    }
  }

  function isWishlisted(id) {
    return wishlist.some(p => p.id === id)
  }

 function openEnquiry(product, e) {
  if (e && e.stopPropagation) e.stopPropagation()
  setBuyerName('')
  setBuyerPhone('')
  setEnquiryModal(product || null) // null = general enquiry, product = specific product
}

  async function submitEnquiry() {
    if (!buyerName.trim() || !buyerPhone.trim()) return
    if (!profile?.whatsapp_number) return

    setEnquirySaving(true)

    const number = profile.whatsapp_number.replace(/[^0-9]/g, '')
    const productList = enquiryModal
      ? [enquiryModal.name]
      : wishlist.map(p => p.name)
    const msg = enquiryModal
      ? `Hello! I'm interested in *${enquiryModal.name}* from your catalogue.\n\nCould you share pricing, MOQ and availability details?\n\nMy name: ${buyerName}\nWhatsApp: ${buyerPhone}`
      : `Hello! I'm interested in the following products:\n${productList.map(n => `• ${n}`).join('\n')}\n\nCould you share pricing and availability?\n\nMy name: ${buyerName}\nWhatsApp: ${buyerPhone}`

    window.open(`https://wa.me/${number}?text=${encodeURIComponent(msg)}`, '_blank')

    // Save lead (with buyer details)
    await supabase.from('leads').insert({
      user_id: profile.user_id,
      buyer_name: buyerName,
      buyer_whatsapp: buyerPhone,
      buyer_country: null,
      products_interested: productList,
      stage: 'new',
      note: enquiryModal ? `Enquired from product detail panel` : `Enquired from wishlist`,
    })

    // Increment products.leads counter
    if (enquiryModal) {
      await supabase
        .from('products')
        .update({ leads: (enquiryModal.leads || 0) + 1 })
        .eq('id', enquiryModal.id)
    }

    // Alert
    await supabase.from('alerts').insert({
      user_id: profile.user_id,
      type: 'lead',
      title: `📩 New WhatsApp enquiry — ${buyerName}`,
      subtitle: enquiryModal
        ? `Buyer enquired about ${enquiryModal.name}`
        : `Buyer enquired about ${productList.length} wishlisted products`,
      product_id: enquiryModal?.id || null,
    })

    setEnquirySaving(false)
    setEnquiryModal(null)
  }

  function openWhatsAppDirect(product) {
    if (!profile?.whatsapp_number) return
    const number = profile.whatsapp_number.replace(/[^0-9]/g, '')
    const msg = `Hello! I'm interested in *${product.name}* from your catalogue. Could you share pricing, MOQ and availability details?`
    window.open(`https://wa.me/${number}?text=${encodeURIComponent(msg)}`, '_blank')

    // Save anonymous lead
    supabase.from('leads').insert({
      user_id: profile.user_id,
      buyer_name: null,
      buyer_whatsapp: null,
      buyer_country: null,
      products_interested: [product.name],
      stage: 'new',
      note: 'Quick enquiry from product card (no details collected)',
    })

    // Increment leads counter
    supabase.from('products')
      .update({ leads: (product.leads || 0) + 1 })
      .eq('id', product.id)

    // Alert
    supabase.from('alerts').insert({
      user_id: profile.user_id,
      type: 'lead',
      title: `📩 New WhatsApp enquiry — ${product.name}`,
      subtitle: 'Buyer tapped Enquire directly from the product card',
      product_id: product.id,
    })
  }

  const categories = ['all', ...new Set(products.map(p => p.category).filter(Boolean))]

  if (notFound) {
    return (
      <div style={{
        minHeight: '100vh', background: 'var(--cream)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexDirection: 'column', gap: '12px', padding: '24px', textAlign: 'center',
      }}>
        <div style={{ fontSize: '48px' }}>🔍</div>
        <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '28px', color: 'var(--navy)' }}>
          Catalogue not found
        </div>
        <div style={{ fontSize: '13.5px', color: 'var(--muted)' }}>
          This link may be incorrect or no longer active.
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh', background: 'var(--cream)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '14px', color: 'var(--muted)',
      }}>
        Loading catalogue...
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--cream)' }}>

      {/* ── HERO HEADER ── */}
      <div className="buyer-hero">
        <div className="bh-inner">
          <div className="bh-left">
            <div className="bh-logo">
              {profile.logo_url
                ? <img src={profile.logo_url} alt={profile.business_name} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '14px' }} />
                : <span>✦</span>
              }
            </div>
            <div>
              <div className="bh-name">{profile.business_name}</div>
              <div className="bh-meta">
                {profile.location && <><span>📍 {profile.location}</span><div className="bh-divider"/></>}
                {profile.established_year && <><span>🏛️ Est. {profile.established_year}</span><div className="bh-divider"/></>}
                <span>📦 {products.length} Products</span>
              </div>
              {profile.tags?.length > 0 && (
                <div className="bh-tags">
                  {profile.tags.map((tag, i) => (
                    <span key={i} className="bh-tag">{tag}</span>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div className="bh-right">
            <button
              className="custom-wa-btn"
              onClick={() => setEnquiryModal(null) || openEnquiry(null, null)}
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
              onClick={() => {
                setActiveCategory(cat)

                // ── ALERT: Category browsing (2 min, once per category per session) ──
                if (categoryTimerRef.current) clearTimeout(categoryTimerRef.current)
                if (cat === 'all') return
                lastCategoryRef.current = cat
                categoryTimerRef.current = setTimeout(() => {
                  if (!profile) return
                  const catKey = `cat_alerted_${cat}`
                  if (!sessionStorage.getItem(catKey)) {
                    sessionStorage.setItem(catKey, '1')
                    supabase.from('alerts').insert({
                      user_id: profile.user_id,
                      type: 'hot',
                      title: `🔍 Buyer browsing ${cat} category`,
                      subtitle: `A buyer has been browsing your ${cat} products for 2 minutes`,
                    })
                  }
                }, 120000)
              }}
            >
              {cat === 'all' ? 'All Collections' : cat}
              {cat !== 'all' && (
                <span style={{ marginLeft: '4px', fontSize: '11px', opacity: 0.6 }}>
                  ({products.filter(p => p.category === cat).length})
                </span>
              )}
            </button>
          ))}
        </div>
        <div className="bfb-right">
          <div style={{ position: 'relative' }}>
            <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', fontSize: '13px' }}>🔍</span>
            <input
              className="form-input"
              placeholder="Search products..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ paddingLeft: '32px', fontSize: '12.5px', padding: '7px 12px 7px 30px', width: '180px' }}
            />
          </div>
          {wishlist.length > 0 && (
            <button className="wl-float-btn" onClick={() => setShowWishlist(true)}>
              ❤️ Wishlist <span className="wl-count-badge">{wishlist.length}</span>
            </button>
          )}
        </div>
      </div>

      {/* ── PRODUCT GRID ── */}
      <div className={`buyer-body`}>
        <div className={`buyer-left ${panelOpen ? 'panel-open' : ''}`}>

          {filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '80px 24px' }}>
              <div style={{ fontSize: '48px', marginBottom: '12px' }}>🔍</div>
              <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '24px', color: 'var(--navy)', marginBottom: '8px' }}>
                No products found
              </div>
              <div style={{ fontSize: '13px', color: 'var(--muted)' }}>Try a different search or category</div>
            </div>
          ) : (
            <div className="prem-grid">
              {filtered.map(product => (
                <div
                  key={product.id}
                  className={`pcard ${product.stock === 0 ? 'oos' : ''} ${isWishlisted(product.id) ? 'wishlisted' : ''}`}
                  onClick={() => openProduct(product)}
                >
                  {/* IMAGE */}
                  <div className="pc-img-wrap" style={{ height: '220px' }}>
                    {product.image_url
                      ? <img src={product.image_url} alt={product.name} />
                      : <div className="pc-emoji-display" style={{ height: '220px' }}><span>{product.emoji || '📦'}</span></div>
                    }

                    {/* BADGES */}
                    <div className="pc-badge-row">
                      {product.status === 'hot' && <span className="pc-badge pcb-hot">🔥 HOT</span>}
                      {product.status === 'new' && <span className="pc-badge pcb-new">🆕 NEW</span>}
                      {product.stock === 0 && <span className="pc-badge pcb-oos">OUT OF STOCK</span>}
                    </div>

                    {/* HEART */}
                    <button
                      className={`heart-btn ${isWishlisted(product.id) ? 'hearted' : ''}`}
                      onClick={e => toggleWishlist(product, e)}
                    >
                      {isWishlisted(product.id) ? '❤️' : '🤍'}
                    </button>
                  </div>

                  {/* BODY */}
                  <div className="pc-body">
                    <div className="pc-category">{product.category}</div>
                    <div className="pc-name">{product.name}</div>
                    {product.description && (
                      <div className="pc-desc">
                        {product.description.length > 80
                          ? product.description.slice(0, 80) + '…'
                          : product.description}
                      </div>
                    )}
                    <div className="pc-foot">
                      <div className="pc-moq">
                        {product.moq ? <><strong>MOQ</strong> {product.moq}</> : product.price_range || ''}
                      </div>
                      <button
                        style={{
                          display: 'flex', alignItems: 'center', gap: '5px',
                          background: '#25d366', border: 'none', borderRadius: '6px',
                          padding: '6px 11px', fontSize: '11.5px', fontWeight: 700,
                          color: '#fff', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif",
                        }}
                        onClick={e => { e.stopPropagation(); openEnquiry(product, e) }}
                      >
                        {WA_ICON} Enquire
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── DETAIL PANEL ── */}
        <div className={`buyer-right-panel ${panelOpen ? 'open' : ''}`}>
          {selectedProduct && (
            <>
              <div className="dp-scroll">
                <div className="dp-img-box" style={{ height: '260px' }}>
                  {selectedProduct.image_url
                    ? <img src={selectedProduct.image_url} alt={selectedProduct.name} />
                    : <div className="dp-emoji">{selectedProduct.emoji || '📦'}</div>
                  }
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
                        <div className="dp-meta-val" style={{ color: 'var(--gold)' }}>{selectedProduct.price_range}</div>
                      </div>
                    )}
                    <div className="dp-meta-item">
                      <div className="dp-meta-label">Availability</div>
                      <div className="dp-meta-val" style={{ color: selectedProduct.stock > 0 ? 'var(--green)' : 'var(--red)' }}>
                        {selectedProduct.stock > 0 ? 'In Stock' : 'Out of Stock'}
                      </div>
                    </div>
                    <div className="dp-meta-item">
                      <div className="dp-meta-label">Views</div>
                      <div className="dp-meta-val">{(selectedProduct.views || 0) + 1}</div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="dp-actions">
                <button
                  className="wa-quot-btn"
                  onClick={() => openEnquiry(selectedProduct, null)}
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
          <div className="wl-hd-title">❤️ My Wishlist</div>
          <button className="dp-close" style={{ position: 'static' }} onClick={() => setShowWishlist(false)}>✕</button>
        </div>
        <div className="wl-items-wrap">
          {wishlist.length === 0 ? (
            <div className="wl-empty-state">
              <div className="wl-empty-icon">🤍</div>
              <div>No items yet — tap 🤍 on any product</div>
            </div>
          ) : (
            wishlist.map(p => (
              <div key={p.id} className="wl-item">
                <div className="wl-img">
                  {p.image_url
                    ? <img src={p.image_url} alt={p.name} />
                    : <span>{p.emoji || '📦'}</span>
                  }
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="wl-iname">{p.name}</div>
                  <div className="wl-icat">{p.price_range || p.category}</div>
                </div>
                <button className="wl-rm" onClick={() => toggleWishlist(p, {})}>✕</button>
              </div>
            ))
          )}
        </div>
        {wishlist.length > 0 && (
          <div className="wl-foot">
            <button
              className="wa-quot-btn"
              onClick={() => { setShowWishlist(false); openEnquiry(null, null) }}
            >
              {WA_ICON}
              Enquire About All ({wishlist.length})
            </button>
          </div>
        )}
      </div>

      {/* ── ENQUIRY MODAL ── */}
      {enquiryModal !== false && (
        <div className="modal-ov" style={{ display: enquiryModal !== false ? 'flex' : 'none' }} onClick={() => setEnquiryModal(false)}>
          <div className="modal-box" style={{ maxWidth: '420px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-title">
              {enquiryModal ? `📩 Enquire about ${enquiryModal.name}` : '📩 WhatsApp Enquiry'}
            </div>
            <div className="modal-sub">
              {enquiryModal
                ? 'Share your details — the exporter will contact you on WhatsApp'
                : wishlist.length > 0
                  ? `Enquire about ${wishlist.length} product(s) in your wishlist`
                  : 'Get in touch about the catalogue'}
            </div>
            <div className="form-group">
              <label className="form-label">Your Name *</label>
              <input
                className="form-input"
                placeholder="e.g. Ahmed Hassan"
                value={buyerName}
                onChange={e => setBuyerName(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Your WhatsApp Number *</label>
              <input
                className="form-input"
                placeholder="+971 50 123 4567"
                type="tel"
                value={buyerPhone}
                onChange={e => setBuyerPhone(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && submitEnquiry()}
              />
            </div>
            <div className="modal-actions">
              <button className="btn btn-outline" onClick={() => setEnquiryModal(false)}>Cancel</button>
              <button
                className="wa-quot-btn"
                disabled={!buyerName.trim() || !buyerPhone.trim() || enquirySaving}
                onClick={submitEnquiry}
                style={{ flex: 2, padding: '12px', opacity: (!buyerName.trim() || !buyerPhone.trim()) ? 0.5 : 1 }}
              >
                {WA_ICON}
                {enquirySaving ? 'Opening...' : 'Send via WhatsApp'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── FOOTER ── */}
      <div style={{
        textAlign: 'center', padding: '32px 24px',
        borderTop: '1px solid var(--border)', marginTop: '24px',
      }}>
        <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '15px', color: 'var(--muted)' }}>
          Powered by ✦ Exportly
        </div>
      </div>

    </div>
  )
}