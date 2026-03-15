'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'

export default function SettingsPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [profileId, setProfileId] = useState(null)
  const [userId, setUserId] = useState(null)
  const [toast, setToast] = useState('')
  const [slugAvailable, setSlugAvailable] = useState(null)
  const [checkingSlug, setCheckingSlug] = useState(false)
  const [originalSlug, setOriginalSlug] = useState('')

  // Logo
  const [logoFile, setLogoFile] = useState(null)
  const [logoPreview, setLogoPreview] = useState(null)
  const logoRef = useRef()

  const [form, setForm] = useState({
    business_name: '',
    slug: '',
    location: '',
    whatsapp_number: '',
    established_year: '',
    description: '',
    tags: '',
    logo_url: '',
  })

  useEffect(() => {
    fetchProfile()
  }, [])

  async function fetchProfile() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    setUserId(user.id)

    const { data } = await supabase
      .from('exporter_profiles')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (data) {
      setProfileId(data.id)
      setOriginalSlug(data.slug)
      setForm({
        business_name: data.business_name || '',
        slug: data.slug || '',
        location: data.location || '',
        whatsapp_number: data.whatsapp_number || '',
        established_year: data.established_year || '',
        description: data.description || '',
        tags: Array.isArray(data.tags) ? data.tags.join(', ') : (data.tags || ''),
        logo_url: data.logo_url || '',
      })
      if (data.logo_url) setLogoPreview(data.logo_url)
    }
    setLoading(false)
  }

  function handleChange(e) {
    const { name, value } = e.target
    setForm(prev => ({ ...prev, [name]: value }))
    if (name === 'slug') setSlugAvailable(null)
  }

  async function checkSlug() {
    if (!form.slug || form.slug === originalSlug) {
      setSlugAvailable(true)
      return
    }
    setCheckingSlug(true)
    const { data } = await supabase
      .from('exporter_profiles')
      .select('slug')
      .eq('slug', form.slug)
      .single()
    setSlugAvailable(!data)
    setCheckingSlug(false)
  }

  function handleLogoChange(e) {
    const file = e.target.files[0]
    if (!file) return
    setLogoFile(file)
    setLogoPreview(URL.createObjectURL(file))
  }

  async function uploadLogo() {
    if (!logoFile || !userId) return null
    const ext = logoFile.name.split('.').pop()
    const path = `logos/${userId}.${ext}`
    const { error } = await supabase.storage
      .from('product-images')
      .upload(path, logoFile, { upsert: true })
    if (error) return null
    const { data } = supabase.storage
      .from('product-images')
      .getPublicUrl(path)
    return data.publicUrl
  }

  async function handleSave() {
    if (!form.business_name.trim()) {
      showToast('⚠️ Business name is required')
      return
    }

    // If slug changed, must check availability first
    if (form.slug !== originalSlug && slugAvailable === null) {
      showToast('⚠️ Please check your catalogue URL availability first')
      return
    }
    if (form.slug !== originalSlug && slugAvailable === false) {
      showToast('⚠️ That URL is taken — choose a different one')
      return
    }

    setSaving(true)

    const tagsArray = form.tags
      .split(',')
      .map(t => t.trim())
      .filter(t => t.length > 0)

    let logoUrl = form.logo_url
    if (logoFile) {
      const uploaded = await uploadLogo()
      if (uploaded) logoUrl = uploaded
    }

    const { error } = await supabase
      .from('exporter_profiles')
      .update({
        business_name: form.business_name,
        slug: form.slug,
        location: form.location,
        whatsapp_number: form.whatsapp_number,
        established_year: form.established_year,
        description: form.description,
        tags: tagsArray,
        logo_url: logoUrl,
      })
      .eq('id', profileId)

    setSaving(false)

    if (error) {
      showToast('❌ Failed to save — ' + error.message)
      return
    }

    setOriginalSlug(form.slug)
    setSlugAvailable(null)
    setLogoFile(null)
    showToast('✅ Profile saved successfully')
  }

  function showToast(msg) {
    setToast(msg)
    setTimeout(() => setToast(''), 3500)
  }

  if (loading) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center',
        justifyContent: 'center', height: '60vh',
        fontSize: '14px', color: 'var(--muted)',
      }}>
        Loading settings...
      </div>
    )
  }

  return (
    <div>

      {/* PAGE HEADER */}
      <div className="ph">
        <div>
          <div className="ph-title">Business Settings</div>
          <div className="ph-sub">
            Update your profile — changes appear on your catalogue instantly
          </div>
        </div>
        <div className="ph-actions">
          <button
            className="btn btn-gold"
            onClick={handleSave}
            disabled={saving}
            style={{ opacity: saving ? 0.7 : 1 }}
          >
            {saving ? 'Saving...' : '✓ Save Changes'}
          </button>
        </div>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 340px',
        gap: '20px',
        alignItems: 'start',
      }}
        className="settings-grid"
      >

        {/* LEFT — MAIN FORM */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

          {/* BUSINESS INFO */}
          <div className="card">
            <div className="card-hd">
              <div className="card-title">🏢 Business Information</div>
            </div>
            <div style={{ padding: '4px 20px 20px' }}>

              <div className="form-group">
                <label className="form-label">Business Name *</label>
                <input
                  className="form-input"
                  name="business_name"
                  placeholder="e.g. Ramkishan Textiles & Handicrafts"
                  value={form.business_name}
                  onChange={handleChange}
                />
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label">Location</label>
                  <input
                    className="form-input"
                    name="location"
                    placeholder="e.g. Jaipur, Rajasthan"
                    value={form.location}
                    onChange={handleChange}
                  />
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label">Established Year</label>
                  <input
                    className="form-input"
                    name="established_year"
                    placeholder="e.g. 1995"
                    value={form.established_year}
                    onChange={handleChange}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">WhatsApp Number *</label>
                <input
                  className="form-input"
                  name="whatsapp_number"
                  placeholder="+91 98765 43210"
                  value={form.whatsapp_number}
                  onChange={handleChange}
                />
                <div style={{ fontSize: '11.5px', color: 'var(--muted)', marginTop: '4px' }}>
                  Buyers contact you on this number from the catalogue
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Product Tags</label>
                <input
                  className="form-input"
                  name="tags"
                  placeholder="Block Print Fabrics, Blue Pottery, Gemstones"
                  value={form.tags}
                  onChange={handleChange}
                />
                <div style={{ fontSize: '11.5px', color: 'var(--muted)', marginTop: '4px' }}>
                  Separate with commas — shown as pills on your catalogue header
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Business Description</label>
                <textarea
                  className="form-input"
                  name="description"
                  rows={4}
                  placeholder="Tell buyers about your business, speciality, export experience, certifications..."
                  value={form.description}
                  onChange={handleChange}
                />
              </div>
            </div>
          </div>

          {/* CATALOGUE URL */}
          <div className="card">
            <div className="card-hd">
              <div className="card-title">🔗 Catalogue URL</div>
            </div>
            <div style={{ padding: '4px 20px 20px' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Your Public Catalogue Link</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    background: 'var(--cream)',
                    border: '1.5px solid var(--border)',
                    borderRadius: '9px',
                    padding: '10px 12px',
                    fontSize: '12.5px',
                    color: 'var(--muted)',
                    whiteSpace: 'nowrap',
                  }}>
                    exportly.app/catalogue/
                  </div>
                  <input
                    className="form-input"
                    name="slug"
                    placeholder="your-business-name"
                    value={form.slug}
                    onChange={handleChange}
                    style={{
                      borderColor: slugAvailable === true
                        ? 'var(--green)'
                        : slugAvailable === false
                        ? 'var(--red)'
                        : undefined,
                    }}
                  />
                  <button
                    type="button"
                    className="btn btn-outline btn-sm"
                    onClick={checkSlug}
                    style={{ whiteSpace: 'nowrap', flexShrink: 0 }}
                  >
                    {checkingSlug ? '...' : 'Check'}
                  </button>
                </div>
                {form.slug === originalSlug && (
                  <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '5px' }}>
                    🔗 Current URL — change it if you want a different link
                  </div>
                )}
                {slugAvailable === true && form.slug !== originalSlug && (
                  <div style={{ fontSize: '12px', color: 'var(--green)', marginTop: '5px' }}>
                    ✅ Available — this URL is yours
                  </div>
                )}
                {slugAvailable === false && (
                  <div style={{ fontSize: '12px', color: 'var(--red)', marginTop: '5px' }}>
                    ❌ Already taken — try a different name
                  </div>
                )}
              </div>
            </div>
          </div>

        </div>

        {/* RIGHT — LOGO */}
        <div className="card">
          <div className="card-hd">
            <div className="card-title">🖼️ Business Logo</div>
          </div>
          <div style={{ padding: '4px 20px 20px' }}>

            {/* LOGO PREVIEW */}
            <div
              onClick={() => logoRef.current.click()}
              style={{
                width: '100%',
                aspectRatio: '1',
                maxHeight: '200px',
                border: '2px dashed var(--border)',
                borderRadius: '12px',
                background: 'var(--cream)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexDirection: 'column',
                gap: '8px',
                cursor: 'pointer',
                overflow: 'hidden',
                position: 'relative',
                marginBottom: '12px',
                transition: 'border-color .18s',
              }}
            >
              {logoPreview ? (
                <img
                  src={logoPreview}
                  alt="Logo"
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'contain',
                    padding: '16px',
                  }}
                />
              ) : (
                <>
                  <div style={{ fontSize: '36px' }}>🏢</div>
                  <div style={{ fontSize: '13px', color: 'var(--muted)', textAlign: 'center' }}>
                    Click to upload logo
                  </div>
                  <div style={{ fontSize: '11.5px', color: 'var(--muted)' }}>
                    PNG, JPG · Shown in catalogue header
                  </div>
                </>
              )}
              <input
                ref={logoRef}
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={handleLogoChange}
              />
            </div>

            {logoPreview && (
              <button
                className="btn btn-outline btn-sm"
                style={{ width: '100%', justifyContent: 'center', marginBottom: '8px' }}
                onClick={() => logoRef.current.click()}
              >
                📷 Change Logo
              </button>
            )}

            {logoPreview && (
              <button
                style={{
                  width: '100%',
                  background: 'none',
                  border: 'none',
                  color: 'var(--red)',
                  fontSize: '12px',
                  cursor: 'pointer',
                  padding: '4px',
                }}
                onClick={() => {
                  setLogoPreview(null)
                  setLogoFile(null)
                  setForm(f => ({ ...f, logo_url: '' }))
                }}
              >
                🗑️ Remove logo
              </button>
            )}

            <div style={{
              marginTop: '16px',
              padding: '12px',
              background: 'var(--cream)',
              borderRadius: '8px',
              fontSize: '11.5px',
              color: 'var(--muted)',
              lineHeight: 1.6,
            }}>
              Your logo appears in the gold box on the catalogue header. Square images work best. Transparent PNG recommended.
            </div>
          </div>
        </div>

      </div>

      {/* SAVE BUTTON — BOTTOM */}
      <div style={{
        marginTop: '20px',
        display: 'flex',
        justifyContent: 'flex-end',
        gap: '10px',
      }}>
        <button
          className="btn btn-gold"
          onClick={handleSave}
          disabled={saving}
          style={{
            padding: '12px 32px',
            fontSize: '14px',
            opacity: saving ? 0.7 : 1,
          }}
        >
          {saving ? 'Saving...' : '✓ Save All Changes'}
        </button>
      </div>

      {/* TOAST */}
      {toast && <div className="gtoast">{toast}</div>}

    </div>
  )
}