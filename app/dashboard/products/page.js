'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'

const CATEGORIES = ['Fabric', 'Pottery', 'Jewelry', 'Rug', 'Other']
const STATUSES = [
  { value: 'hot', label: '🔥 Hot Seller' },
  { value: 'new', label: '🆕 New Arrival' },
  { value: 'normal', label: '✅ Available' },
]
const LOW_STOCK = 20

const EMPTY_FORM = {
  name: '',
  category: 'Fabric',
  customCategory: '',
  description: '',
  moq: '',
  price_range: '',
  stock: 0,
  status: 'normal',
  emoji: '📦',
  image_url: '',
}

export default function ProductsPage() {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState(null)

  // Modals
  const [showAddModal, setShowAddModal] = useState(false)
  const [editProduct, setEditProduct] = useState(null)
  const [stockModal, setStockModal] = useState(null)
  const [deleteProduct, setDeleteProduct] = useState(null)

  // Form state
  const [form, setForm] = useState(EMPTY_FORM)
  const [imgFile, setImgFile] = useState(null)
  const [imgPreview, setImgPreview] = useState(null)
  const [formLoading, setFormLoading] = useState(false)
  const [formError, setFormError] = useState('')

  // Stock modal state
  const [stockType, setStockType] = useState('in')
  const [stockQty, setStockQty] = useState(10)
  const [stockNote, setStockNote] = useState('')

  // Toast
  const [toast, setToast] = useState('')

  const fileRef = useRef()

  useEffect(() => {
    fetchUser()
  }, [])

  async function fetchUser() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    setUserId(user.id)
    fetchProducts(user.id)
  }

  async function fetchProducts(uid) {
    const { data } = await supabase
      .from('products')
      .select('*')
      .eq('user_id', uid)
      .order('created_at', { ascending: false })
    setProducts(data || [])
    setLoading(false)
  }

  function showToast(msg) {
    setToast(msg)
    setTimeout(() => setToast(''), 3000)
  }

  // ── IMAGE UPLOAD ──
  function handleImgChange(e) {
    const file = e.target.files[0]
    if (!file) return
    setImgFile(file)
    setImgPreview(URL.createObjectURL(file))
  }

  async function uploadImage(productId) {
    if (!imgFile) return null
    const ext = imgFile.name.split('.').pop()
    const path = `${userId}/${productId}.${ext}`
    const { error } = await supabase.storage
      .from('product-images')
      .upload(path, imgFile, { upsert: true })
    if (error) return null
    const { data } = supabase.storage
      .from('product-images')
      .getPublicUrl(path)
    return data.publicUrl
  }

  // ── ADD PRODUCT ──
  function openAddModal() {
    setForm(EMPTY_FORM)
    setImgFile(null)
    setImgPreview(null)
    setFormError('')
    setShowAddModal(true)
    setEditProduct(null)
  }

  // ── EDIT PRODUCT ──
  function openEditModal(product) {
    setForm({
      name: product.name,
      category: product.category,
      description: product.description || '',
      moq: product.moq || '',
      price_range: product.price_range || '',
      stock: product.stock,
      status: product.status,
      emoji: product.emoji || '📦',
      image_url: product.image_url || '',
    })
    setImgFile(null)
    setImgPreview(product.image_url || null)
    setFormError('')
    setEditProduct(product)
    setShowAddModal(true)
  }

  // ── SAVE PRODUCT (add or edit) ──
  async function saveProduct() {
    setFormError('')
    if (!form.name.trim()) {
      setFormError('Product name is required')
      return
    }
    setFormLoading(true)

    try {
        const finalCategory = form.category === 'Other'? form.customCategory.trim() || 'Other': form.category

      if (editProduct) {
        // EDIT
        let imageUrl = editProduct.image_url
        if (imgFile) {
          imageUrl = await uploadImage(editProduct.id)
        }
        const { error } = await supabase
          .from('products')
          .update({
            name: form.name,
            category: finalCategory,
            description: form.description,
            moq: form.moq,
            price_range: form.price_range,
            stock: Number(form.stock),
            status: form.status,
            emoji: form.emoji,
            image_url: imageUrl,
          })
          .eq('id', editProduct.id)

        if (error) throw error
        showToast('✅ Product updated successfully')

      } else {
        // ADD
        const tempId = crypto.randomUUID()
        let imageUrl = null
        if (imgFile) {
          imageUrl = await uploadImage(tempId)
        }
        const { error } = await supabase
          .from('products')
          .insert({
            user_id: userId,
            name: form.name,
            category: finalCategory,
            description: form.description,
            moq: form.moq,
            price_range: form.price_range,
            stock: Number(form.stock),
            status: form.status,
            emoji: form.emoji,
            image_url: imageUrl,
          })

        if (error) throw error
        showToast('✅ Product added to catalogue')
      }

      setShowAddModal(false)
      setEditProduct(null)
      fetchProducts(userId)

    } catch (err) {
      setFormError(err.message)
    } finally {
      setFormLoading(false)
    }
  }

  // ── DELETE PRODUCT ──
  async function confirmDelete() {
    if (!deleteProduct) return
    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', deleteProduct.id)

    if (error) {
      showToast('❌ Failed to delete product')
      return
    }
    setProducts(prev => prev.filter(p => p.id !== deleteProduct.id))
    setDeleteProduct(null)
    showToast('🗑️ Product deleted')
  }

  // ── STOCK UPDATE ──
  async function applyStock() {
    if (!stockModal) return
    const newStock = stockType === 'in'
      ? stockModal.stock + stockQty
      : Math.max(0, stockModal.stock - stockQty)

    const { error } = await supabase
      .from('products')
      .update({ stock: newStock })
      .eq('id', stockModal.id)

    if (error) {
      showToast('❌ Failed to update stock')
      return
    }

    // Stock history
    await supabase.from('stock_history').insert({
      user_id: userId,
      product_id: stockModal.id,
      type: stockType,
      quantity: stockQty,
      note: stockNote,
      stock_before: stockModal.stock,
      stock_after: newStock,
    })

    // Low stock alert
    if (newStock <= LOW_STOCK && newStock > 0) {
      await supabase.from('alerts').insert({
        user_id: userId,
        type: 'stock',
        title: `Low stock — ${stockModal.name}`,
        subtitle: `Only ${newStock} units remaining.`,
        product_id: stockModal.id,
      })
    }

    setProducts(prev => prev.map(p =>
      p.id === stockModal.id ? { ...p, stock: newStock } : p
    ))
    setStockModal(null)
    setStockQty(10)
    setStockNote('')
    showToast(`✅ Stock updated → ${newStock} units`)
  }

  // ── STATUS BADGE ──
  function statusBadge(status) {
    const map = {
      hot: { label: '🔥 Hot Seller', cls: 'b-hot' },
      new: { label: '🆕 New Arrival', cls: 'b-new' },
      normal: { label: 'Available', cls: 'b-norm' },
    }
    const s = map[status] || map.normal
    return <span className={`badge ${s.cls}`}>{s.label}</span>
  }

  const oosCount = products.filter(p => p.stock === 0).length
  const lowCount = products.filter(p => p.stock > 0 && p.stock <= LOW_STOCK).length

  return (
    <div>

      {/* PAGE HEADER */}
      <div className="ph">
        <div>
          <div className="ph-title">Products</div>
          <div className="ph-sub">
            {products.length} products ·{' '}
            {oosCount > 0 && (
              <span style={{ color: 'var(--red)' }}>
                {oosCount} out of stock ·{' '}
              </span>
            )}
            {lowCount > 0 && (
              <span style={{ color: 'var(--orange)' }}>
                {lowCount} low stock
              </span>
            )}
          </div>
        </div>
        <div className="ph-actions">
          <button className="btn btn-gold" onClick={openAddModal}>
            ＋ Add Product
          </button>
        </div>
      </div>

      {/* PRODUCTS TABLE */}
      <div className="card">
        <div className="card-hd">
          <div className="card-title">All Products</div>
          <span style={{ fontSize: '12px', color: 'var(--muted)' }}>
            {products.length} total
          </span>
        </div>

        {loading ? (
          <div style={{
            padding: '48px',
            textAlign: 'center',
            color: 'var(--muted)',
            fontSize: '13px',
          }}>
            Loading products...
          </div>
        ) : products.length === 0 ? (
          <div style={{
            padding: '64px 24px',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: '48px', marginBottom: '12px' }}>📦</div>
            <div style={{
              fontFamily: "'Cormorant Garamond', serif",
              fontSize: '22px',
              color: 'var(--navy)',
              marginBottom: '8px',
            }}>
              No products yet
            </div>
            <div style={{
              fontSize: '13px',
              color: 'var(--muted)',
              marginBottom: '20px',
            }}>
              Add your first product and it'll appear in your buyer catalogue instantly
            </div>
            <button className="btn btn-gold" onClick={openAddModal}>
              ＋ Add First Product
            </button>
          </div>
        ) : (
          <div className="table-scroll-wrap">
            <table>
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Category</th>
                  <th>Price Range</th>
                  <th>Status</th>
                  <th>Stock</th>
                  <th>Views</th>
                  <th>Leads</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {products.map(p => (
                  <tr
                    key={p.id}
                    style={{
                      background: p.stock === 0
                        ? 'rgba(217,79,79,0.03)'
                        : 'transparent'
                    }}
                  >
                    {/* PRODUCT */}
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
                          <div className="pt-cat">MOQ: {p.moq || '—'}</div>
                        </div>
                      </div>
                    </td>

                    {/* CATEGORY */}
                    <td>
                      <span style={{
                        fontSize: '11.5px',
                        color: 'var(--muted)',
                      }}>
                        {p.category}
                      </span>
                    </td>

                    {/* PRICE RANGE */}
                    <td>
                      <span style={{
                        fontSize: '12px',
                        color: 'var(--navy)',
                        fontWeight: 500,
                      }}>
                        {p.price_range || '—'}
                      </span>
                    </td>

                    {/* STATUS */}
                    <td>{statusBadge(p.status)}</td>

                    {/* STOCK */}
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
                          {p.stock === 0 ? 'Out of Stock' : `${p.stock} units`}
                        </span>
                        <div className="stock-actions">
                          <button
                            className="stock-btn stock-in"
                            onClick={() => {
                              setStockModal(p)
                              setStockType('in')
                            }}
                          >
                            +In
                          </button>
                          <button
                            className="stock-btn stock-out"
                            disabled={p.stock === 0}
                            onClick={() => {
                              setStockModal(p)
                              setStockType('out')
                            }}
                          >
                            −Out
                          </button>
                        </div>
                      </div>
                    </td>

                    {/* VIEWS */}
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

                    {/* LEADS */}
                    <td>
                      <b style={{ color: 'var(--navy)' }}>{p.leads}</b>
                    </td>

                    {/* ACTIONS */}
                    <td>
                      <div style={{ display: 'flex', gap: '5px' }}>
                        <button
                          className="stock-btn"
                          style={{
                            background: 'var(--blue-bg)',
                            color: 'var(--blue)',
                          }}
                          onClick={() => openEditModal(p)}
                        >
                          ✏️ Edit
                        </button>
                        <button
                          className="stock-btn"
                          style={{
                            background: 'var(--red-bg)',
                            color: 'var(--red)',
                          }}
                          onClick={() => setDeleteProduct(p)}
                        >
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ══ ADD / EDIT PRODUCT MODAL ══ */}
      {showAddModal && (
        <div className="modal-ov" onClick={() => setShowAddModal(false)}>
          <div
            className="modal-box"
            style={{ maxWidth: '520px', maxHeight: '90vh', overflowY: 'auto' }}
            onClick={e => e.stopPropagation()}
          >
            <div className="modal-title">
              {editProduct ? '✏️ Edit Product' : '＋ Add New Product'}
            </div>
            <div className="modal-sub">
              {editProduct
                ? 'Update product details in your catalogue'
                : 'Fill details and it appears in your catalogue instantly'}
            </div>

            {formError && (
              <div style={{
                background: 'var(--red-bg)',
                border: '1px solid rgba(217,79,79,0.3)',
                borderRadius: '8px',
                padding: '10px 14px',
                fontSize: '13px',
                color: 'var(--red)',
                marginBottom: '16px',
              }}>
                ⚠️ {formError}
              </div>
            )}

            {/* IMAGE UPLOAD */}
            <div className="form-group">
              <label className="form-label">Product Photo</label>
              <div
                onClick={() => fileRef.current.click()}
                style={{
                  border: '2px dashed var(--border)',
                  borderRadius: '10px',
                  padding: '20px',
                  textAlign: 'center',
                  cursor: 'pointer',
                  background: 'var(--cream)',
                  position: 'relative',
                  minHeight: '100px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexDirection: 'column',
                  gap: '6px',
                  transition: 'border-color .18s',
                }}
              >
                {imgPreview ? (
                  <img
                    src={imgPreview}
                    alt="preview"
                    style={{
                      width: '100%',
                      maxHeight: '180px',
                      objectFit: 'cover',
                      borderRadius: '8px',
                    }}
                  />
                ) : (
                  <>
                    <div style={{ fontSize: '28px' }}>📷</div>
                    <div style={{ fontSize: '13px', color: 'var(--muted)' }}>
                      Click to upload photo
                    </div>
                    <div style={{ fontSize: '11.5px', color: 'var(--muted)' }}>
                      JPG, PNG · From gallery or camera
                    </div>
                  </>
                )}
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  style={{ display: 'none' }}
                  onChange={handleImgChange}
                />
              </div>
            </div>

            {/* NAME */}
            <div className="form-group">
              <label className="form-label">Product Name *</label>
              <input
                className="form-input"
                placeholder="e.g. Hand Block Print Fabric — Indigo Blue"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              />
            </div>

            {/* CATEGORY + STATUS */}
            <div style={{ display: 'flex', gap: '12px' }}>
                <div className="form-group" style={{ flex: 1 }}>
                <label className="form-label">Category</label>
                <select
                className="form-input"
                value={form.category}
                onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                >
                {CATEGORIES.map(c => (
                    <option key={c} value={c}>{c}</option>
                ))}
                </select>
                {/* Show custom input when Other is selected */}
                {form.category === 'Other' && (
                <input
                    className="form-input"
                    placeholder="Enter your category name e.g. Leather Goods"
                    style={{ marginTop: '8px' }}
                    value={form.customCategory || ''}
                    onChange={e => setForm(f => ({
                    ...f,
                    customCategory: e.target.value
                    }))}
                />
                )}
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                    <label className="form-label">Status</label>
                    <select
                        className="form-input"
                        value={form.status}
                        onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
                    >
                    {STATUSES.map(s => (
                        <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                    </select>
                </div>
            </div>

            {/* MOQ + PRICE RANGE */}
            <div style={{ display: 'flex', gap: '12px' }}>
              <div className="form-group" style={{ flex: 1 }}>
                <label className="form-label">Min. Order Quantity</label>
                <input
                  className="form-input"
                  placeholder="e.g. 50 meters"
                  value={form.moq}
                  onChange={e => setForm(f => ({ ...f, moq: e.target.value }))}
                />
              </div>
              <div className="form-group" style={{ flex: 1 }}>
                <label className="form-label">Price Range</label>
                <input
                  className="form-input"
                  placeholder="e.g. $2–$5 per meter"
                  value={form.price_range}
                  onChange={e => setForm(f => ({
                    ...f, price_range: e.target.value
                  }))}
                />
              </div>
            </div>

            {/* STOCK + EMOJI */}
            <div style={{ display: 'flex', gap: '12px' }}>
              <div className="form-group" style={{ flex: 2 }}>
                <label className="form-label">Initial Stock (units)</label>
                <input
                  className="form-input"
                  type="number"
                  min="0"
                  value={form.stock}
                  onChange={e => setForm(f => ({
                    ...f, stock: e.target.value
                  }))}
                />
              </div>
              <div className="form-group" style={{ flex: 1 }}>
                <label className="form-label">Emoji (if no photo)</label>
                <input
                  className="form-input"
                  placeholder="🧵"
                  maxLength={2}
                  value={form.emoji}
                  onChange={e => setForm(f => ({ ...f, emoji: e.target.value }))}
                />
              </div>
            </div>

            {/* DESCRIPTION */}
            <div className="form-group">
              <label className="form-label">Description</label>
              <textarea
                className="form-input"
                rows={3}
                placeholder="Material, finish, available colours, export details..."
                value={form.description}
                onChange={e => setForm(f => ({
                  ...f, description: e.target.value
                }))}
              />
            </div>

            {/* ACTIONS */}
            <div className="modal-actions">
              <button
                className="btn btn-outline"
                onClick={() => setShowAddModal(false)}
              >
                Cancel
              </button>
              <button
                className="btn btn-gold"
                onClick={saveProduct}
                disabled={formLoading}
                style={{
                  flex: 2,
                  justifyContent: 'center',
                  opacity: formLoading ? 0.7 : 1,
                }}
              >
                {formLoading
                  ? 'Saving...'
                  : editProduct
                  ? '✓ Save Changes'
                  : '✓ Add to Catalogue'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══ STOCK MODAL ══ */}
      {stockModal && (
        <div className="modal-ov" onClick={() => setStockModal(null)}>
          <div
            className="modal-box"
            style={{ maxWidth: '380px' }}
            onClick={e => e.stopPropagation()}
          >
            <div className="modal-title">Update Stock</div>
            <div className="modal-sub">
              {stockModal.name} · Current: {stockModal.stock} units
            </div>

            <div className="stock-modal-type">
              <button
                className={`smt-btn in ${stockType === 'in' ? 'sel' : ''}`}
                onClick={() => setStockType('in')}
              >
                📦 Stock In
                <br />
                <small style={{ fontWeight: 400, fontSize: '11px' }}>
                  Add inventory
                </small>
              </button>
              <button
                className={`smt-btn out ${stockType === 'out' ? 'sel' : ''}`}
                onClick={() => setStockType('out')}
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
                style={{ flex: 2, justifyContent: 'center' }}
              >
                ✓ Update Stock
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══ DELETE CONFIRM MODAL ══ */}
      {deleteProduct && (
        <div className="modal-ov" onClick={() => setDeleteProduct(null)}>
          <div
            className="modal-box"
            style={{ maxWidth: '380px' }}
            onClick={e => e.stopPropagation()}
          >
            <div className="modal-title">🗑️ Delete Product</div>
            <div className="modal-sub">
              Are you sure you want to delete{' '}
              <strong>{deleteProduct.name}</strong>?
              This cannot be undone.
            </div>
            <div className="modal-actions">
              <button
                className="btn btn-outline"
                onClick={() => setDeleteProduct(null)}
              >
                Cancel
              </button>
              <button
                className="btn btn-red"
                onClick={confirmDelete}
                style={{ flex: 2, justifyContent: 'center' }}
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
