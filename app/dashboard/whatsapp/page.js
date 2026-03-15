'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

export default function WhatsAppSetupPage() {
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [number, setNumber] = useState('')
  const [toast, setToast] = useState('')
  const [copyDone, setCopyDone] = useState(false)

  useEffect(() => { fetchProfile() }, [])

  async function fetchProfile() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase
      .from('exporter_profiles')
      .select('*')
      .eq('user_id', user.id)
      .single()
    if (data) {
      setProfile(data)
      setNumber(data.whatsapp_number || '')
    }
    setLoading(false)
  }

  async function saveNumber() {
    if (!number.trim()) {
      showToast('⚠️ Enter a WhatsApp number first')
      return
    }
    setSaving(true)
    const { error } = await supabase
      .from('exporter_profiles')
      .update({ whatsapp_number: number })
      .eq('id', profile.id)
    setSaving(false)
    if (error) {
      showToast('❌ Failed to save')
      return
    }
    setProfile(p => ({ ...p, whatsapp_number: number }))
    showToast('✅ WhatsApp number saved')
  }

  function testWhatsApp() {
    const clean = number.replace(/[^0-9]/g, '')
    if (!clean) {
      showToast('⚠️ Enter a WhatsApp number first')
      return
    }
    const msg = encodeURIComponent(
      `✅ Test from Exportly — your WhatsApp is connected! Buyers will send enquiries to this number when they tap "Enquire" on your catalogue.`
    )
    window.open(`https://wa.me/${clean}?text=${msg}`, '_blank')
  }

  function shareOnWhatsApp() {
    if (!profile?.whatsapp_number) {
      showToast('⚠️ Save your number first')
      return
    }
    const link = `${window.location.origin}/catalogue/${profile.slug}`
    const msg = encodeURIComponent(
      `🛍️ *${profile.business_name}* — Export Catalogue\n\nBrowse our full product catalogue with pricing and details:\n${link}\n\nTap any product to enquire directly on WhatsApp.`
    )
    window.open(`https://wa.me/?text=${msg}`, '_blank')
  }

  function copyLink() {
    const link = `${window.location.origin}/catalogue/${profile?.slug}`
    navigator.clipboard.writeText(link)
    setCopyDone(true)
    setTimeout(() => setCopyDone(false), 2500)
    showToast('🔗 Catalogue link copied!')
  }

  function showToast(msg) {
    setToast(msg)
    setTimeout(() => setToast(''), 3000)
  }

  const catalogueUrl = profile
    ? `${typeof window !== 'undefined' ? window.location.origin : 'https://yoursite.com'}/catalogue/${profile.slug}`
    : ''

  const qrUrl = profile
    ? `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(catalogueUrl)}`
    : ''

  if (loading) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center',
        justifyContent: 'center', height: '60vh',
        fontSize: '14px', color: 'var(--muted)',
      }}>
        Loading...
      </div>
    )
  }

  return (
    <div>

      {/* PAGE HEADER */}
      <div className="ph">
        <div>
          <div className="ph-title">💬 WhatsApp Setup</div>
          <div className="ph-sub">
            Connect your WhatsApp so buyers can reach you from your catalogue
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', alignItems: 'start' }}
        className="settings-grid"
      >

        {/* LEFT COLUMN */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

          {/* WHATSAPP NUMBER */}
          <div className="card">
            <div className="card-hd">
              <div className="card-title">📱 Your WhatsApp Number</div>
            </div>
            <div style={{ padding: '4px 20px 20px' }}>
              <div className="form-group">
                <label className="form-label">WhatsApp Number (with country code)</label>
                <input
                  className="form-input"
                  placeholder="+91 98765 43210"
                  value={number}
                  onChange={e => setNumber(e.target.value)}
                  style={{ fontSize: '15px' }}
                />
                <div style={{ fontSize: '11.5px', color: 'var(--muted)', marginTop: '5px' }}>
                  Include country code — e.g. +91 for India, +971 for UAE
                </div>
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  className="btn btn-gold"
                  onClick={saveNumber}
                  disabled={saving}
                  style={{ flex: 1, justifyContent: 'center', opacity: saving ? 0.7 : 1 }}
                >
                  {saving ? 'Saving...' : '✓ Save Number'}
                </button>
                <button
                  className="btn btn-outline"
                  onClick={testWhatsApp}
                  style={{ flex: 1, justifyContent: 'center' }}
                >
                  🧪 Send Test Message
                </button>
              </div>

              {/* STATUS */}
              <div style={{
                marginTop: '16px',
                padding: '12px 14px',
                background: profile?.whatsapp_number
                  ? '#e8f5e9'
                  : 'var(--red-bg)',
                border: `1px solid ${profile?.whatsapp_number ? '#a5d6a7' : 'rgba(217,79,79,0.2)'}`,
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                fontSize: '13px',
              }}>
                <span style={{ fontSize: '20px' }}>
                  {profile?.whatsapp_number ? '✅' : '⚠️'}
                </span>
                <div>
                  <div style={{
                    fontWeight: 600,
                    color: profile?.whatsapp_number ? '#2e7d32' : 'var(--red)',
                    marginBottom: '2px',
                  }}>
                    {profile?.whatsapp_number
                      ? 'WhatsApp Connected'
                      : 'No WhatsApp Number Set'}
                  </div>
                  <div style={{
                    fontSize: '11.5px',
                    color: profile?.whatsapp_number ? '#388e3c' : 'var(--red)',
                  }}>
                    {profile?.whatsapp_number
                      ? `Buyers will message ${profile.whatsapp_number}`
                      : 'Enquiry buttons on your catalogue won\'t work'}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* SHARE CATALOGUE */}
          <div className="card">
            <div className="card-hd">
              <div className="card-title">📤 Share Your Catalogue</div>
            </div>
            <div style={{ padding: '4px 20px 20px' }}>

              {/* LINK BOX */}
              <div style={{
                background: 'var(--cream)',
                border: '1.5px dashed var(--gold)',
                borderRadius: '10px',
                padding: '12px 14px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                marginBottom: '14px',
              }}>
                <div style={{
                  flex: 1,
                  fontSize: '12.5px',
                  color: 'var(--navy)',
                  fontWeight: 500,
                  wordBreak: 'break-all',
                }}>
                  {catalogueUrl}
                </div>
                <button
                  className="btn btn-outline btn-sm"
                  onClick={copyLink}
                  style={{ flexShrink: 0 }}
                >
                  {copyDone ? '✅ Copied' : '📋 Copy'}
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <button
                  onClick={shareOnWhatsApp}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    background: '#25D366',
                    border: 'none',
                    borderRadius: '10px',
                    padding: '13px 18px',
                    fontSize: '13.5px',
                    fontWeight: 600,
                    color: '#fff',
                    cursor: 'pointer',
                    fontFamily: "'DM Sans', sans-serif",
                    width: '100%',
                  }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                  </svg>
                  Share Catalogue on WhatsApp
                </button>

                <div style={{
                  fontSize: '11.5px',
                  color: 'var(--muted)',
                  lineHeight: 1.6,
                  padding: '10px 12px',
                  background: 'var(--cream)',
                  borderRadius: '8px',
                }}>
                  Opens WhatsApp with a pre-written message including your business name and catalogue link — ready to forward to buyers.
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* RIGHT — QR CODE */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="card">
            <div className="card-hd">
              <div className="card-title">📱 QR Code</div>
            </div>
            <div style={{ padding: '4px 20px 20px', textAlign: 'center' }}>
              <div style={{
                display: 'inline-block',
                padding: '16px',
                background: '#fff',
                border: '1px solid var(--border)',
                borderRadius: '12px',
                marginBottom: '14px',
              }}>
                <img
                  src={qrUrl}
                  alt="QR Code"
                  style={{ width: '180px', height: '180px', display: 'block' }}
                />
              </div>
              <div style={{
                fontSize: '12.5px',
                color: 'var(--navy)',
                fontWeight: 600,
                marginBottom: '4px',
              }}>
                {profile?.business_name}
              </div>
              <div style={{
                fontSize: '11.5px',
                color: 'var(--muted)',
                marginBottom: '16px',
              }}>
                Buyers scan this to open your catalogue instantly
              </div>

              <button
                className="btn btn-outline"
                style={{ width: '100%', justifyContent: 'center' }}
                onClick={() => {
                  const a = document.createElement('a')
                  a.href = qrUrl
                  a.download = `${profile?.slug}-qr.png`
                  a.click()
                }}
              >
                ⬇️ Download QR Code
              </button>

              <div style={{
                marginTop: '16px',
                padding: '12px',
                background: 'var(--cream)',
                borderRadius: '8px',
                fontSize: '11.5px',
                color: 'var(--muted)',
                lineHeight: 1.6,
                textAlign: 'left',
              }}>
                💡 <strong style={{ color: 'var(--navy)' }}>Print this QR</strong> on your business cards, packaging, or trade fair booth. Buyers just scan and they're browsing your catalogue.
              </div>
            </div>
          </div>

          {/* HOW IT WORKS */}
          <div className="card">
            <div className="card-hd">
              <div className="card-title">ℹ️ How It Works</div>
            </div>
            <div style={{ padding: '4px 20px 20px' }}>
              {[
                { icon: '🔗', title: 'Buyer opens your catalogue link', desc: 'Via WhatsApp, email, QR code, or any link you share' },
                { icon: '👀', title: 'Buyer browses your products', desc: 'Views details, adds to wishlist, checks MOQ and pricing' },
                { icon: '💬', title: 'Buyer taps Enquire', desc: 'WhatsApp opens with a pre-filled message to your number' },
                { icon: '📊', title: 'You get alerted instantly', desc: 'Lead saved in your dashboard — view, follow up, track stage' },
              ].map((step, i) => (
                <div key={i} style={{
                  display: 'flex',
                  gap: '12px',
                  marginBottom: i < 3 ? '14px' : 0,
                }}>
                  <div style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '10px',
                    background: 'var(--cream)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '18px',
                    flexShrink: 0,
                  }}>
                    {step.icon}
                  </div>
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--navy)', marginBottom: '2px' }}>
                      {step.title}
                    </div>
                    <div style={{ fontSize: '11.5px', color: 'var(--muted)', lineHeight: 1.5 }}>
                      {step.desc}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>

      {toast && <div className="gtoast">{toast}</div>}

    </div>
  )
}
