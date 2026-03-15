'use client'

import { useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

export default function DashboardLayout({ children }) {
  const router = useRouter()
  const pathname = usePathname()
  const [profile, setProfile] = useState(null)
  const [showProfileMenu, setShowProfileMenu] = useState(false)
  const [mobOpen, setMobOpen] = useState(false)
  const [copyDone, setCopyDone] = useState(false)
  const [subscription, setSubscription] = useState(null)
  const [alertCount, setAlertCount] = useState(0)

  useEffect(() => {
    checkAuth()
    fetchProfile()
    fetchUnreadAlerts()
  }, [])

  async function checkAuth() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      router.push('/login')
    }
  }

  async function fetchProfile() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data } = await supabase
      .from('exporter_profiles')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (!data) {
      router.push('/onboarding')
      return
    }

    const { data: subData } = await supabase
      .from('subscriptions')
       .select('plan')
      .eq('user_id', user.id)
      .single()

    setSubscription(subData)
    setProfile(data)
  }

  async function fetchUnreadAlerts() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { count } = await supabase
      .from('alerts')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('is_read', false)
      .eq('is_deleted', false)   // ← add this line

    setAlertCount(count || 0)
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  function closeSidebar() {
    setMobOpen(false)
  }

  const navItems = [
    { href: '/dashboard', label: 'Dashboard', icon: '📊' },
    { href: '/dashboard/products', label: 'Products', icon: '📦' },
    { href: '/dashboard/alerts', label: 'Alerts', icon: '🔔', badge: alertCount },
    { href: '/dashboard/leads', label: 'Leads', icon: '👥' },
    { href: '/dashboard/analytics', label: 'Analytics', icon: '📈' },
  ]

  const initials = profile?.business_name
    ? profile.business_name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
    : 'EX'

  return (
    <div style={{ minHeight: '100vh', background: 'var(--cream)' }}>

      {/* ── TOPBAR ── */}
      <div className="topbar">

        {/* HAMBURGER */}
        <button
          className="mob-menu-btn"
          onClick={() => setMobOpen(!mobOpen)}
        >
          ☰
        </button>

        {/* LOGO */}
        <div className="logo">
          ✦ Exportly
          <span className="logo-tag">Smart Catalogue</span>
        </div>

        {/* VIEW PILLS */}
        <div className="view-pills">
          <button className="vpill active">
            ⚙️ Exporter Dashboard
          </button>
          {profile && (
            <button
              className="vpill"
              onClick={() => router.push(`/catalogue/${profile.slug}`)}
            >
              🛍️ Buyer Catalogue
            </button>
          )}
        </div>

        {/* RIGHT SIDE */}
        <div className="tb-right">
          <button
            className="tb-btn"
            onClick={() => router.push('/dashboard/alerts')}
            style={{ position: 'relative' }}
          >
            🔔
            {alertCount > 0 && <span className="notif-badge" />}
          </button>

          {/* AVATAR + DROPDOWN */}
          <div style={{ position: 'relative' }}>
            <div
              className="avatar"
              style={{ cursor: 'pointer' }}
              onClick={() => setShowProfileMenu(p => !p)}
            >
              {initials}
            </div>

            {showProfileMenu && (
              <>
                {/* backdrop */}
                <div
                  style={{ position: 'fixed', inset: 0, zIndex: 199 }}
                  onClick={() => setShowProfileMenu(false)}
                />
                {/* menu */}
                <div style={{
                  position: 'absolute',
                  top: 'calc(100% + 10px)',
                  right: 0,
                  background: '#fff',
                  border: '1px solid var(--border)',
                  borderRadius: '12px',
                  boxShadow: '0 8px 32px rgba(14,28,56,0.14)',
                  width: '220px',
                  zIndex: 200,
                  overflow: 'hidden',
                }}>
                  {/* Profile info */}
                  <div style={{
                    padding: '14px 16px',
                    borderBottom: '1px solid var(--border)',
                    background: 'var(--cream)',
                  }}>
                    <div style={{
                      fontWeight: 700,
                      fontSize: '13px',
                      color: 'var(--navy)',
                      marginBottom: '2px',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}>
                      {profile?.business_name}
                    </div>
                    <div style={{ fontSize: '11.5px', color: 'var(--muted)' }}>
                      {profile?.location || 'Free plan'}
                    </div>
                  </div>

                  {/* Menu items */}
                  {[
                    { icon: '🏢', label: 'Business Settings', action: () => { router.push('/dashboard/settings'); setShowProfileMenu(false) } },
                    { icon: '💬', label: 'WhatsApp Setup', action: () => { router.push('/dashboard/whatsapp'); setShowProfileMenu(false) } },
                    { icon: '👁️', label: 'Preview Catalogue', action: () => { window.open(`/catalogue/${profile?.slug}`, '_blank'); setShowProfileMenu(false) } },
                    { icon: '🔗', label: 'Copy Catalogue Link', action: () => {
                      navigator.clipboard.writeText(`${window.location.origin}/catalogue/${profile?.slug}`)
                      setCopyDone(true)
                      setTimeout(() => setCopyDone(false), 2000)
                      setShowProfileMenu(false)
                    }},
                  ].map((item, i) => (
                    <div
                      key={i}
                      onClick={item.action}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        padding: '11px 16px',
                        fontSize: '13px',
                        color: 'var(--text)',
                        cursor: 'pointer',
                        borderBottom: i < 3 ? '1px solid var(--border)' : 'none',
                        transition: 'background .15s',
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = 'var(--cream)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      <span style={{ fontSize: '16px' }}>{item.icon}</span>
                      {item.label}
                    </div>
                  ))}

                  {/* Logout */}
                  <div
                    onClick={handleLogout}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      padding: '11px 16px',
                      fontSize: '13px',
                      color: 'var(--red)',
                      cursor: 'pointer',
                      background: 'var(--red-bg)',
                    }}
                    onMouseEnter={e => e.currentTarget.style.opacity = '0.8'}
                    onMouseLeave={e => e.currentTarget.style.opacity = '1'}
                  >
                    <span style={{ fontSize: '16px' }}>🚪</span>
                    Sign Out
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── MOBILE BACKDROP ── */}
      {mobOpen && (
        <div
          className="sidebar-backdrop show"
          onClick={closeSidebar}
        />
      )}

      <div style={{ display: 'flex', minHeight: 'calc(100vh - 58px)' }}>

        {/* ── SIDEBAR ── */}
        <div className={`sidebar ${mobOpen ? 'mob-open' : ''}`}>

          {/* NAV ITEMS */}
          <div className="sb-section">Main</div>
          {navItems.map(item => (
            <Link
              key={item.href}
              href={item.href}
              className={`sb-item ${pathname === item.href ? 'active' : ''}`}
              onClick={closeSidebar}
              style={{ textDecoration: 'none' }}
            >
              <span className="sb-icon">{item.icon}</span>
              {item.label}
              {item.badge > 0 && (
                <span className="sb-badge">{item.badge}</span>
              )}
            </Link>
          ))}

          <div className="sb-section">Catalogue</div>
          {profile && (
            <Link
              href={`/catalogue/${profile.slug}`}
              className="sb-item"
              style={{ textDecoration: 'none' }}
              target="_blank"
            >
              <span className="sb-icon">👁️</span>
              Preview Catalogue
            </Link>
          )}
          <div
            className="sb-item"
            style={{ cursor: 'pointer' }}
            onClick={() => {
              navigator.clipboard.writeText(
                `${window.location.origin}/catalogue/${profile?.slug}`
              )
              // Show a quick visual feedback — reuse toast via a state
              // (easiest: just use alert for now, or add a copyDone state)
              setCopyDone(true)
              setTimeout(() => setCopyDone(false), 2000)
            }}
          >
            <span className="sb-icon">{copyDone ? '✅' : '🔗'}</span>
            {copyDone ? 'Copied!' : 'Copy Link'}
          </div>

          <div className="sb-section">Settings</div>

          <Link
            href="/dashboard/subscription"
            className={`sb-item ${pathname === '/dashboard/subscription' ? 'active' : ''}`}
            onClick={closeSidebar}
            style={{ textDecoration: 'none' }}
          >
            <span className="sb-icon">💎</span>
            Subscription
            {subscription?.plan === 'free' && (
              <span style={{
                marginLeft: 'auto',
                background: 'var(--gold)',
                color: '#fff',
                fontSize: '9px',
                fontWeight: 800,
                padding: '2px 6px',
                borderRadius: '99px',
                letterSpacing: '.5px',
              }}>
                TRIAL
              </span>
            )}
          </Link>

          <Link
            href="/dashboard/settings"
            className={`sb-item ${pathname === '/dashboard/settings' ? 'active' : ''}`}
            onClick={closeSidebar}
            style={{ textDecoration: 'none' }}
          >
            <span className="sb-icon">🏢</span>
            Business Profile
          </Link>
          <Link
            href="/dashboard/whatsapp"
            className={`sb-item ${pathname === '/dashboard/whatsapp' ? 'active' : ''}`}
            onClick={closeSidebar}
            style={{ textDecoration: 'none' }}
          >
            <span className="sb-icon">💬</span>
            WhatsApp Setup
          </Link>

          {/* SIDEBAR FOOTER */}
          <div className="sidebar-foot">
            <div className="cat-link-box">
              <div className="cl-label">🔗 Your Live Catalogue</div>
              <div className="cl-url">
                /catalogue/{profile?.slug}
              </div>
              <button
                className="share-btn"
                onClick={() => {
                  const link = `${window.location.origin}/catalogue/${profile?.slug}`
                  navigator.clipboard.writeText(link)
                  setCopyDone(true)
                  setTimeout(() => setCopyDone(false), 2500)
                }}
              >
                {copyDone ? '✅ Link Copied!' : '📤 Copy & Share Link'}
              </button>
              <button
                style={{
                  width: '100%',
                  marginTop: '7px',
                  background: '#25D366',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '9px',
                  fontSize: '12px',
                  fontWeight: 600,
                  color: '#fff',
                  cursor: 'pointer',
                  fontFamily: "'DM Sans', sans-serif",
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                }}
                onClick={() => {
                  const link = `${window.location.origin}/catalogue/${profile?.slug}`
                  const msg = encodeURIComponent(
                    `🛍️ *${profile?.business_name}* — Browse our export catalogue:\n${link}`
                  )
                  window.open(`https://wa.me/?text=${msg}`, '_blank')
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>
                Send on WhatsApp
              </button>
            </div>
          </div>
        </div>

        {/* ── PAGE CONTENT ── */}
        <div className="admin-main">
          {children}
        </div>

      </div>
    </div>
  )
}