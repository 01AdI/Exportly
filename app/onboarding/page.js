'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function OnboardingPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [slugAvailable, setSlugAvailable] = useState(null)
  const [checkingSlug, setCheckingSlug] = useState(false)

  const [form, setForm] = useState({
    business_name: '',
    slug: '',
    location: '',
    whatsapp_number: '',
    established_year: '',
    description: '',
    tags: '',
  })

  function handleChange(e) {
    const { name, value } = e.target
    setForm(prev => ({ ...prev, [name]: value }))

    // Auto generate slug from business name
    if (name === 'business_name') {
      const autoSlug = value
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .trim()
      setForm(prev => ({ ...prev, slug: autoSlug }))
      setSlugAvailable(null)
    }

    // Reset slug availability when slug changes
    if (name === 'slug') {
      setSlugAvailable(null)
    }
  }

  async function checkSlug() {
    if (!form.slug) return
    setCheckingSlug(true)

    const { data } = await supabase
      .from('exporter_profiles')
      .select('slug')
      .eq('slug', form.slug)
      .single()

    setSlugAvailable(!data)
    setCheckingSlug(false)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    if (!slugAvailable) {
      setError('Please check your catalogue URL availability first')
      return
    }

    setLoading(true)

    // Get current logged in user
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      router.push('/login')
      return
    }

    // Convert tags string to array
    const tagsArray = form.tags
      .split(',')
      .map(t => t.trim())
      .filter(t => t.length > 0)

    // Insert exporter profile
    const { error } = await supabase
      .from('exporter_profiles')
      .insert({
        user_id: user.id,
        business_name: form.business_name,
        slug: form.slug,
        location: form.location,
        whatsapp_number: form.whatsapp_number,
        established_year: form.established_year,
        description: form.description,
        tags: tagsArray,
      })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    // Also create a free subscription for this user
    await supabase
      .from('subscriptions')
      .insert({
        user_id: user.id,
        plan: 'free',
        status: 'active',
      })

    // Done — go to dashboard
    router.push('/dashboard')
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--cream)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px 20px',
    }}>
      <div style={{
        background: '#fff',
        borderRadius: '16px',
        border: '1px solid var(--border)',
        boxShadow: 'var(--shadow-lg)',
        padding: '40px',
        width: '100%',
        maxWidth: '520px',
      }}>

        {/* HEADER */}
        <div style={{ marginBottom: '32px' }}>
          <div style={{
            fontFamily: "'Cormorant Garamond', serif",
            fontSize: '28px',
            color: 'var(--navy)',
            marginBottom: '6px',
          }}>
            ✦ Welcome to Exportly
          </div>
          <div style={{ fontSize: '13px', color: 'var(--muted)' }}>
            Set up your business profile — takes 2 minutes.
            This is what buyers will see on your catalogue.
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

        <form onSubmit={handleSubmit}>

          {/* BUSINESS NAME */}
          <div className="form-group">
            <label className="form-label">Business Name *</label>
            <input
              className="form-input"
              name="business_name"
              placeholder="e.g. Ramkishan Textiles & Handicrafts"
              value={form.business_name}
              onChange={handleChange}
              required
            />
          </div>

          {/* CATALOGUE URL / SLUG */}
          <div className="form-group">
            <label className="form-label">Your Catalogue URL *</label>
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
                exportly.app/
              </div>
              <input
                className="form-input"
                name="slug"
                placeholder="your-business-name"
                value={form.slug}
                onChange={handleChange}
                required
                style={{
                  borderColor: slugAvailable === true
                    ? 'var(--green)'
                    : slugAvailable === false
                    ? 'var(--red)'
                    : undefined
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

            {/* SLUG FEEDBACK */}
            {slugAvailable === true && (
              <div style={{ fontSize: '12px', color: 'var(--green)', marginTop: '4px' }}>
                ✅ Available — this URL is yours
              </div>
            )}
            {slugAvailable === false && (
              <div style={{ fontSize: '12px', color: 'var(--red)', marginTop: '4px' }}>
                ❌ Already taken — try a different name
              </div>
            )}
          </div>

          {/* LOCATION */}
          <div className="form-group">
            <label className="form-label">Location</label>
            <input
              className="form-input"
              name="location"
              placeholder="e.g. Jaipur, Rajasthan"
              value={form.location}
              onChange={handleChange}
            />
          </div>

          {/* WHATSAPP */}
          <div className="form-group">
            <label className="form-label">WhatsApp Number *</label>
            <input
              className="form-input"
              name="whatsapp_number"
              placeholder="+91 98765 43210"
              value={form.whatsapp_number}
              onChange={handleChange}
              required
            />
            <div style={{ fontSize: '11.5px', color: 'var(--muted)', marginTop: '4px' }}>
              Buyers will contact you on this number
            </div>
          </div>

          {/* TWO COL ROW */}
          <div style={{ display: 'flex', gap: '12px' }}>
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

          {/* TAGS */}
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
              Separate with commas — shown on your catalogue header
            </div>
          </div>

          {/* DESCRIPTION */}
          <div className="form-group">
            <label className="form-label">Business Description</label>
            <textarea
              className="form-input"
              name="description"
              placeholder="Tell buyers about your business, speciality, export experience..."
              value={form.description}
              onChange={handleChange}
              rows={3}
            />
          </div>

          {/* SUBMIT */}
          <button
            type="submit"
            className="btn btn-gold"
            disabled={loading}
            style={{
              width: '100%',
              justifyContent: 'center',
              padding: '13px',
              fontSize: '14px',
              marginTop: '8px',
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? 'Setting up your account...' : 'Launch My Catalogue →'}
          </button>

        </form>
      </div>
    </div>
  )
}
