'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

const TRIAL_DAYS = 14
const ADMIN_USER_ID = process.env.NEXT_PUBLIC_ADMIN_USER_ID 
const UPI_ID = process.env.NEXT_PUBLIC_UPI_ID       
const UPI_NAME = process.env.NEXT_PUBLIC_UPI_NAME  
const SUPPORT_WHATSAPP = process.env.NEXT_PUBLIC_SUPPORT_WHATSAPP 

const PLANS = [
  {
    id: 'free',
    name: 'Free Trial',
    price: '₹0',
    period: `${TRIAL_DAYS} days`,
    badge: null,
    color: 'var(--muted)',
    features: [
      'Unlimited products',
      'WhatsApp leads',
      'Analytics & alerts',
      'Buyer catalogue page',
      'All features unlocked',
      `Valid for ${TRIAL_DAYS} days`,
    ],
    cta: 'Current Plan',
    disabled: true,
  },
  {
    id: 'monthly',
    name: 'Monthly',
    price: '₹499',
    period: 'per month',
    badge: null,
    color: 'var(--blue)',
    features: [
      'Everything in Free',
      'Unlimited products',
      'Priority WhatsApp support',
      'Custom catalogue branding',
      'Lead export (CSV)',
      'Cancel anytime',
    ],
    cta: 'Upgrade to Monthly',
    disabled: false,
  },
  {
    id: '6months',
    name: '6 Months',
    price: '₹2499',
    period: '₹416/mo · save 17%',
    badge: 'POPULAR',
    color: 'var(--gold)',
    features: [
      'Everything in Monthly',
      'Unlimited products',
      'Priority WhatsApp support',
      'Custom catalogue branding',
      'Lead export (CSV)',
      '6 months uninterrupted',
    ],
    cta: 'Upgrade to 6 Months',
    disabled: false,
  },
  {
    id: 'yearly',
    name: 'Yearly',
    price: '₹3999',
    period: '₹333/mo · save 33%',
    badge: 'BEST VALUE',
    color: '#22c55e',
    features: [
      'Everything in 6 Months',
      'Unlimited products',
      'Dedicated support',
      'Early access to new features',
      'Invoice for GST',
      '12 months uninterrupted',
    ],
    cta: 'Upgrade to Yearly',
    disabled: false,
  },
]

export default function SubscriptionPage() {
  const [subscription, setSubscription] = useState(null)
  const [profile, setProfile] = useState(null)
  const [userId, setUserId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState('')
  const [showQR, setShowQR] = useState(false)
  const [selectedPlan, setSelectedPlan] = useState(null)
  const [copyDone, setCopyDone] = useState(false)

  useEffect(() => { fetchData() }, [])

  async function fetchData() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    setUserId(user.id)

    const [{ data: profileData }, { data: subData }] = await Promise.all([
      supabase.from('exporter_profiles').select('*').eq('user_id', user.id).single(),
      supabase.from('subscriptions').select('*').eq('user_id', user.id).single(),
    ])

    setProfile(profileData)
    setSubscription(subData)
    setLoading(false)
  }

  function handleUpgrade(plan) {
    setSelectedPlan(plan)
    setShowQR(true)
  }

  function showToast(msg) {
    setToast(msg)
    setTimeout(() => setToast(''), 4000)
  }

  function daysLeft() {
    if (!subscription?.trial_started_at) return null // not started yet
    const started = new Date(subscription.trial_started_at)
    const expiry = new Date(started.getTime() + TRIAL_DAYS * 24 * 60 * 60 * 1000)
    const diff = Math.ceil((expiry - new Date()) / (1000 * 60 * 60 * 24))
    return Math.max(0, diff)
  }

  const isAdmin = userId === ADMIN_USER_ID
  const currentPlan = subscription?.plan || 'free'
  const remaining = daysLeft()
  const trialStarted = subscription?.trial_started_at != null
  const trialExpired = !isAdmin && trialStarted && remaining === 0
  const trialPending = !isAdmin && !trialStarted && currentPlan === 'free'

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
          <div className="ph-title">💎 Subscription</div>
          <div className="ph-sub">Choose a plan that works for your export business</div>
        </div>
      </div>

      {/* STATUS BANNER */}
      <div style={{
        background: isAdmin
          ? 'linear-gradient(135deg, #1a2340, #2a3560)'
          : trialExpired
          ? 'var(--red-bg)'
          : trialPending
          ? 'linear-gradient(135deg, #f5f0e8, #fff9ef)'
          : currentPlan !== 'free'
          ? 'linear-gradient(135deg, #e8f5e9, #f1f8e9)'
          : 'linear-gradient(135deg, #fdf6e7, #fff9ef)',
        border: `1px solid ${
          isAdmin ? 'rgba(201,168,76,0.4)'
          : trialExpired ? 'rgba(217,79,79,0.3)'
          : 'rgba(201,168,76,0.3)'
        }`,
        borderRadius: '14px',
        padding: '20px 24px',
        marginBottom: '28px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '16px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ fontSize: '36px' }}>
            {isAdmin ? '👑' : trialExpired ? '⚠️' : trialPending ? '🎁' : currentPlan !== 'free' ? '✨' : '⏳'}
          </div>
          <div>
            <div style={{
              fontFamily: "'Cormorant Garamond', serif",
              fontSize: '20px',
              color: isAdmin ? '#fff' : 'var(--navy)',
              fontWeight: 600,
              marginBottom: '3px',
            }}>
              {isAdmin
                ? 'Admin — Unlimited Access'
                : trialExpired
                ? 'Trial Ended — Upgrade to Continue'
                : trialPending
                ? 'Trial Not Started Yet'
                : currentPlan !== 'free'
                ? `Active — ${currentPlan} plan`
                : `Free Trial — ${remaining} days left`}
            </div>
            <div style={{
              fontSize: '12.5px',
              color: isAdmin ? 'rgba(255,255,255,0.6)' : 'var(--muted)',
            }}>
              {isAdmin
                ? 'You have permanent full access — no restrictions, no expiry'
                : trialExpired
                ? 'Choose a plan below to keep your catalogue live for buyers'
                : trialPending
                ? 'All features are available. Your trial countdown starts when activated.'
                : currentPlan !== 'free'
                ? 'Your catalogue is live and all features are active'
                : 'Full access to all features until your trial ends. Upgrade anytime.'}
            </div>
          </div>
        </div>

        {/* TRIAL PROGRESS BAR — only when running */}
        {!isAdmin && trialStarted && !trialExpired && remaining !== null && (
          <div style={{ minWidth: '180px' }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: '11px',
              color: 'var(--muted)',
              marginBottom: '5px',
            }}>
              <span>Day 1</span>
              <span>Day {TRIAL_DAYS}</span>
            </div>
            <div style={{
              height: '7px',
              background: 'rgba(201,168,76,0.2)',
              borderRadius: '99px',
              overflow: 'hidden',
            }}>
              <div style={{
                height: '100%',
                width: `${((TRIAL_DAYS - remaining) / TRIAL_DAYS) * 100}%`,
                background: 'var(--gold)',
                borderRadius: '99px',
                transition: 'width .6s ease',
              }} />
            </div>
            <div style={{
              fontSize: '11px',
              color: 'var(--gold)',
              fontWeight: 600,
              marginTop: '4px',
              textAlign: 'right',
            }}>
              {remaining} days remaining
            </div>
          </div>
        )}
      </div>

      {/* PLANS GRID */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: '16px',
        marginBottom: '32px',
      }}
        className="plans-grid"
      >
        {PLANS.map(plan => {
          const isCurrent = currentPlan === plan.id
          const isPopular = plan.badge === 'POPULAR'
          const isBest = plan.badge === 'BEST VALUE'

          return (
            <div
              key={plan.id}
              style={{
                background: '#fff',
                borderRadius: '16px',
                border: `2px solid ${isCurrent ? plan.color : isPopular ? 'var(--gold)' : 'var(--border)'}`,
                padding: '24px',
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
                transition: 'box-shadow .2s, transform .2s',
                boxShadow: isPopular ? '0 8px 32px rgba(201,168,76,0.15)' : '0 2px 8px rgba(0,0,0,0.04)',
              }}
              onMouseEnter={e => {
                if (!isCurrent) {
                  e.currentTarget.style.transform = 'translateY(-4px)'
                  e.currentTarget.style.boxShadow = '0 16px 40px rgba(14,28,56,0.12)'
                }
              }}
              onMouseLeave={e => {
                e.currentTarget.style.transform = 'translateY(0)'
                e.currentTarget.style.boxShadow = isPopular
                  ? '0 8px 32px rgba(201,168,76,0.15)'
                  : '0 2px 8px rgba(0,0,0,0.04)'
              }}
            >
              {plan.badge && !isCurrent && (
                <div style={{
                  position: 'absolute',
                  top: '-12px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  background: isBest ? '#22c55e' : 'var(--gold)',
                  color: '#fff',
                  fontSize: '10px',
                  fontWeight: 800,
                  padding: '3px 12px',
                  borderRadius: '99px',
                  letterSpacing: '1px',
                  whiteSpace: 'nowrap',
                }}>
                  {plan.badge}
                </div>
              )}

              {isCurrent && (
                <div style={{
                  position: 'absolute',
                  top: '-12px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  background: 'var(--navy)',
                  color: '#fff',
                  fontSize: '10px',
                  fontWeight: 800,
                  padding: '3px 12px',
                  borderRadius: '99px',
                  letterSpacing: '1px',
                  whiteSpace: 'nowrap',
                }}>
                  CURRENT PLAN
                </div>
              )}

              <div style={{
                fontSize: '13px',
                fontWeight: 700,
                color: plan.color,
                textTransform: 'uppercase',
                letterSpacing: '1px',
                marginBottom: '10px',
              }}>
                {plan.name}
              </div>

              <div style={{
                fontFamily: "'Cormorant Garamond', serif",
                fontSize: '36px',
                color: 'var(--navy)',
                fontWeight: 700,
                lineHeight: 1,
                marginBottom: '4px',
              }}>
                {plan.price}
              </div>
              <div style={{ fontSize: '11.5px', color: 'var(--muted)', marginBottom: '20px' }}>
                {plan.period}
              </div>

              <div style={{ height: '1px', background: 'var(--border)', marginBottom: '16px' }} />

              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '9px',
                flex: 1,
                marginBottom: '20px',
              }}>
                {plan.features.map((f, i) => (
                  <div key={i} style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '8px',
                    fontSize: '12.5px',
                    color: 'var(--text)',
                  }}>
                    <span style={{ color: '#22c55e', flexShrink: 0, marginTop: '1px' }}>✓</span>
                    {f}
                  </div>
                ))}
              </div>

              <button
                onClick={() => !plan.disabled && !isCurrent && handleUpgrade(plan)}
                disabled={plan.disabled || isCurrent}
                style={{
                  width: '100%',
                  padding: '11px',
                  borderRadius: '10px',
                  border: isCurrent || plan.disabled
                    ? '1.5px solid var(--border)'
                    : isPopular ? 'none'
                    : '1.5px solid var(--navy)',
                  background: isCurrent || plan.disabled
                    ? 'var(--cream)'
                    : isPopular ? 'var(--gold)'
                    : isBest ? '#22c55e'
                    : 'var(--navy)',
                  color: isCurrent || plan.disabled ? 'var(--muted)' : '#fff',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: isCurrent || plan.disabled ? 'default' : 'pointer',
                  fontFamily: "'DM Sans', sans-serif",
                  transition: 'opacity .18s',
                }}
                onMouseEnter={e => {
                  if (!isCurrent && !plan.disabled) e.currentTarget.style.opacity = '0.88'
                }}
                onMouseLeave={e => e.currentTarget.style.opacity = '1'}
              >
                {isCurrent ? 'Current Plan' : plan.cta}
              </button>
            </div>
          )
        })}
      </div>

      {/* BOTTOM NOTE */}
      <div style={{
        textAlign: 'center',
        fontSize: '12.5px',
        color: 'var(--muted)',
        padding: '16px',
        background: '#fff',
        borderRadius: '12px',
        border: '1px solid var(--border)',
      }}>
        💳 Pay via UPI — scan QR on any plan · Activated within 2 hours after screenshot &nbsp;·&nbsp;
        Questions?{' '}
        <span
          style={{ color: 'var(--gold)', cursor: 'pointer', fontWeight: 600 }}
          onClick={() => window.open(`https://wa.me/${SUPPORT_WHATSAPP}`, '_blank')}
        >
          WhatsApp Support
        </span>
      </div>

      {/* ══ PAYMENT QR MODAL ══ */}
      {showQR && selectedPlan && (
        <div
          style={{
            position: 'fixed', inset: 0,
            background: 'rgba(14,28,56,0.5)',
            zIndex: 500,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
          }}
          onClick={() => setShowQR(false)}
        >
          <div
            style={{
              background: '#fff',
              borderRadius: '20px',
              padding: '32px',
              width: '100%',
              maxWidth: '380px',
              boxShadow: '0 24px 64px rgba(14,28,56,0.2)',
              textAlign: 'center',
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* HEADER */}
            <div style={{
              fontFamily: "'Cormorant Garamond', serif",
              fontSize: '26px',
              color: 'var(--navy)',
              marginBottom: '4px',
            }}>
              Pay via UPI
            </div>
            <div style={{ fontSize: '13px', color: 'var(--muted)', marginBottom: '20px' }}>
              Scan with GPay · PhonePe · Paytm · any UPI app
            </div>

            {/* PLAN PILL */}
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '10px',
              background: 'var(--cream)',
              border: '1px solid var(--border)',
              borderRadius: '99px',
              padding: '8px 20px',
              marginBottom: '20px',
            }}>
              <span style={{ fontSize: '13px', color: 'var(--muted)' }}>{selectedPlan.name}</span>
              <span style={{
                fontFamily: "'Cormorant Garamond', serif",
                fontSize: '20px',
                fontWeight: 700,
                color: 'var(--gold)',
              }}>
                {selectedPlan.price}
              </span>
            </div>

            {/* DYNAMIC QR — amount pre-filled */}
            {(() => {
              const amount = selectedPlan.price.replace('₹', '').replace(',', '')
              const upiString = `upi://pay?pa=${UPI_ID}&pn=${encodeURIComponent(UPI_NAME)}&am=${amount}&cu=INR&tn=${encodeURIComponent(`Exportly ${selectedPlan.name}`)}`
              const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=210x210&data=${encodeURIComponent(upiString)}`
              return (
                <div style={{
                  display: 'inline-block',
                  padding: '14px',
                  background: '#fff',
                  border: '2px solid var(--border)',
                  borderRadius: '16px',
                  marginBottom: '16px',
                  boxShadow: '0 4px 20px rgba(0,0,0,0.06)',
                }}>
                  <img src={qrUrl} alt="UPI QR" style={{ width: '200px', height: '200px', display: 'block' }} />
                </div>
              )
            })()}

            {/* UPI ID — copy button */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: 'var(--cream)',
              border: '1px solid var(--border)',
              borderRadius: '8px',
              padding: '8px 12px',
              marginBottom: '16px',
              gap: '10px',
            }}>
              <span style={{ fontSize: '11.5px', color: 'var(--muted)' }}>UPI ID</span>
              <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--navy)' }}>{UPI_ID}</span>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(UPI_ID)
                  setCopyDone(true)
                  setTimeout(() => setCopyDone(false), 2000)
                  showToast('✅ UPI ID copied')
                }}
                style={{
                  background: 'none',
                  border: '1px solid var(--border)',
                  borderRadius: '6px',
                  padding: '3px 8px',
                  fontSize: '11px',
                  cursor: 'pointer',
                  color: copyDone ? 'var(--green)' : 'var(--muted)',
                  fontFamily: "'DM Sans', sans-serif",
                }}
              >
                {copyDone ? '✅' : 'Copy'}
              </button>
            </div>

            <div style={{
              fontSize: '12px',
              color: 'var(--muted)',
              marginBottom: '20px',
              lineHeight: 1.6,
            }}>
              After paying, send us a screenshot on WhatsApp.<br />
              Plan activated within <strong style={{ color: 'var(--navy)' }}>2 hours</strong>.
            </div>

            {/* PAID BUTTON */}
            <button
              onClick={() => {
                const msg = encodeURIComponent(
                  `Hi! I've paid for *Exportly ${selectedPlan.name}* (${selectedPlan.price}).\n\nMy catalogue: ${window.location.origin}/catalogue/${profile?.slug}\n\nSending payment screenshot. Please activate my plan. 🙏`
                )
                window.open(`https://wa.me/${SUPPORT_WHATSAPP}?text=${msg}`, '_blank')
                setShowQR(false)
                showToast('✅ WhatsApp opened — send your screenshot!')
              }}
              style={{
                width: '100%',
                padding: '13px',
                borderRadius: '10px',
                border: 'none',
                background: '#25D366',
                color: '#fff',
                fontSize: '14px',
                fontWeight: 700,
                cursor: 'pointer',
                fontFamily: "'DM Sans', sans-serif",
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '9px',
                marginBottom: '10px',
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
              </svg>
              I've Paid — Send Screenshot
            </button>

            <button
              onClick={() => setShowQR(false)}
              style={{
                width: '100%',
                padding: '10px',
                borderRadius: '10px',
                border: '1px solid var(--border)',
                background: '#fff',
                color: 'var(--muted)',
                fontSize: '13px',
                cursor: 'pointer',
                fontFamily: "'DM Sans', sans-serif",
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {toast && <div className="gtoast">{toast}</div>}
    </div>
  )
}