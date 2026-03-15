'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import {
  AreaChart, Area, BarChart, Bar,
  PieChart, Pie, Cell, Tooltip,
  XAxis, YAxis, CartesianGrid,
  ResponsiveContainer, Legend
} from 'recharts'

const COLORS = ['#C9A84C', '#1a2340', '#4f6fa5', '#e07b54', '#6cc5a1', '#a78bfa']

export default function AnalyticsPage() {
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState(null)
  const [products, setProducts] = useState([])
  const [views, setViews] = useState([])
  const [leads, setLeads] = useState([])
  const [range, setRange] = useState('7d')

  useEffect(() => {
    fetchUser()
  }, [])

  useEffect(() => {
    if (userId) fetchAll()
  }, [userId, range])

  async function fetchUser() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    setUserId(user.id)
  }

  async function fetchAll() {
    setLoading(true)
    const days = range === '7d' ? 7 : range === '30d' ? 30 : 90
    const since = new Date()
    since.setDate(since.getDate() - days)

    const [
      { data: productsData },
      { data: viewsData },
      { data: leadsData },
    ] = await Promise.all([
      supabase
        .from('products')
        .select('*')
        .eq('user_id', userId),
      supabase
        .from('catalogue_views')
        .select('*')
        .eq('user_id', userId)
        .gte('created_at', since.toISOString()),
      supabase
        .from('leads')
        .select('*')
        .eq('user_id', userId)
        .gte('created_at', since.toISOString()),
    ])

    setProducts(productsData || [])
    setViews(viewsData || [])
    setLeads(leadsData || [])
    setLoading(false)
  }

  // ── VIEWS OVER TIME (area chart) ──
  function buildViewsOverTime() {
    const days = range === '7d' ? 7 : range === '30d' ? 30 : 90
    const map = {}

    for (let i = days - 1; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      const key = d.toLocaleDateString('en-IN', {
        day: 'numeric', month: 'short'
      })
      map[key] = { date: key, views: 0, leads: 0 }
    }

    views.forEach(v => {
      const key = new Date(v.created_at).toLocaleDateString('en-IN', {
        day: 'numeric', month: 'short'
      })
      if (map[key]) map[key].views++
    })

    leads.forEach(l => {
      const key = new Date(l.created_at).toLocaleDateString('en-IN', {
        day: 'numeric', month: 'short'
      })
      if (map[key]) map[key].leads++
    })

    return Object.values(map)
  }

  // ── TOP PRODUCTS BY VIEWS (bar chart) ──
  function buildTopProducts() {
    return [...products]
      .sort((a, b) => b.views - a.views)
      .slice(0, 6)
      .map(p => ({
        name: p.name.length > 18 ? p.name.slice(0, 18) + '…' : p.name,
        views: p.views,
        leads: p.leads,
      }))
  }

  // ── CATEGORY BREAKDOWN (pie chart) ──
  function buildCategoryData() {
    const map = {}
    products.forEach(p => {
      map[p.category] = (map[p.category] || 0) + p.views
    })
    return Object.entries(map)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
  }

  // ── COUNTRY BREAKDOWN ──
  function buildCountryData() {
    const map = {}
    views.forEach(v => {
      const c = v.buyer_country || 'Unknown'
      map[c] = (map[c] || 0) + 1
    })
    return Object.entries(map)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6)
  }

  const totalViews = views.length
  const totalLeads = leads.length
  const convRate = totalViews > 0
    ? ((totalLeads / totalViews) * 100).toFixed(1)
    : '0.0'
  const avgDaily = totalViews > 0
    ? (totalViews / (range === '7d' ? 7 : range === '30d' ? 30 : 90)).toFixed(1)
    : '0'

  const viewsData = buildViewsOverTime()
  const topProducts = buildTopProducts()
  const categoryData = buildCategoryData()
  const countryData = buildCountryData()
  const totalCatViews = categoryData.reduce((s, d) => s + d.value, 0)

  // ── CUSTOM PIE LABEL ──
  function renderCustomLabel({ cx, cy, midAngle, innerRadius, outerRadius, percent }) {
    if (percent < 0.06) return null
    const RADIAN = Math.PI / 180
    const r = innerRadius + (outerRadius - innerRadius) * 0.5
    const x = cx + r * Math.cos(-midAngle * RADIAN)
    const y = cy + r * Math.sin(-midAngle * RADIAN)
    return (
      <text
        x={x} y={y}
        fill="#fff"
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={11}
        fontWeight={700}
        fontFamily="DM Sans, sans-serif"
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    )
  }

  // ── CUSTOM TOOLTIP ──
  function CustomTooltip({ active, payload, label }) {
    if (!active || !payload?.length) return null
    return (
      <div style={{
        background: '#fff',
        border: '1px solid var(--border)',
        borderRadius: '10px',
        padding: '10px 14px',
        boxShadow: 'var(--shadow)',
        fontSize: '12.5px',
        fontFamily: "'DM Sans', sans-serif",
      }}>
        <div style={{
          fontWeight: 700,
          color: 'var(--navy)',
          marginBottom: '6px',
        }}>
          {label}
        </div>
        {payload.map((p, i) => (
          <div key={i} style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            color: p.color,
            marginBottom: '2px',
          }}>
            <div style={{
              width: '8px', height: '8px',
              borderRadius: '50%',
              background: p.color,
              flexShrink: 0,
            }} />
            {p.name}: <strong>{p.value}</strong>
          </div>
        ))}
      </div>
    )
  }

  if (loading) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center',
        justifyContent: 'center', height: '60vh',
        fontSize: '14px', color: 'var(--muted)',
      }}>
        Loading analytics...
      </div>
    )
  }

  return (
    <div>

      {/* PAGE HEADER */}
      <div className="ph">
        <div>
          <div className="ph-title">Analytics</div>
          <div className="ph-sub">
            Catalogue performance and buyer insights
          </div>
        </div>
        {/* DATE RANGE */}
        <div className="ph-actions">
          {['7d', '30d', '90d'].map(r => (
            <button
              key={r}
              className={`alert-filter-btn ${range === r ? 'active' : ''}`}
              onClick={() => setRange(r)}
            >
              {r === '7d' ? 'Last 7 days'
                : r === '30d' ? 'Last 30 days'
                : 'Last 90 days'}
            </button>
          ))}
        </div>
      </div>

      {/* KPI CARDS */}
      <div className="stats-row">
        <div className="scard">
          <div className="scard-accent" style={{ background: 'var(--gold)' }} />
          <div className="scard-icon">👁️</div>
          <div>
            <div className="scard-num">{totalViews.toLocaleString()}</div>
            <div className="scard-label">Total Views</div>
            <div className="scard-delta delta-up">
              ~{avgDaily}/day average
            </div>
          </div>
        </div>
        <div className="scard">
          <div className="scard-accent" style={{ background: 'var(--green)' }} />
          <div className="scard-icon">📩</div>
          <div>
            <div className="scard-num">{totalLeads}</div>
            <div className="scard-label">WhatsApp Leads</div>
            <div className="scard-delta delta-up">
              From {range === '7d' ? '7' : range === '30d' ? '30' : '90'} days
            </div>
          </div>
        </div>
        <div className="scard">
          <div className="scard-accent" style={{ background: 'var(--blue)' }} />
          <div className="scard-icon">📊</div>
          <div>
            <div className="scard-num">{convRate}%</div>
            <div className="scard-label">Conversion Rate</div>
            <div className="scard-delta delta-neutral">
              Views → WhatsApp
            </div>
          </div>
        </div>
        <div className="scard">
          <div className="scard-accent" style={{ background: '#a78bfa' }} />
          <div className="scard-icon">📦</div>
          <div>
            <div className="scard-num">{products.length}</div>
            <div className="scard-label">Active Products</div>
            <div className="scard-delta delta-neutral">
              In your catalogue
            </div>
          </div>
        </div>
      </div>

      {/* VIEWS + LEADS OVER TIME */}
      <div className="card" style={{ marginBottom: '16px' }}>
        <div className="card-hd">
          <div className="card-title">📈 Views & Leads Over Time</div>
          <span style={{ fontSize: '12px', color: 'var(--muted)' }}>
            Daily breakdown
          </span>
        </div>
        <div style={{ padding: '0 8px 16px' }}>
          {totalViews === 0 ? (
            <EmptyChart message="No views yet — share your catalogue to start seeing data" />
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={viewsData}>
                <defs>
                  <linearGradient id="gViews" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#C9A84C" stopOpacity={0.18} />
                    <stop offset="95%" stopColor="#C9A84C" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gLeads" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4f6fa5" stopOpacity={0.18} />
                    <stop offset="95%" stopColor="#4f6fa5" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="rgba(0,0,0,0.06)"
                  vertical={false}
                />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11, fill: '#8a8fa8', fontFamily: 'DM Sans' }}
                  axisLine={false}
                  tickLine={false}
                  interval={range === '90d' ? 9 : range === '30d' ? 4 : 0}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: '#8a8fa8', fontFamily: 'DM Sans' }}
                  axisLine={false}
                  tickLine={false}
                  width={28}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend
                  iconType="circle"
                  iconSize={8}
                  wrapperStyle={{
                    fontSize: '12px',
                    fontFamily: 'DM Sans, sans-serif',
                    paddingTop: '8px',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="views"
                  name="Catalogue Views"
                  stroke="#C9A84C"
                  strokeWidth={2}
                  fill="url(#gViews)"
                  dot={false}
                  activeDot={{ r: 4, fill: '#C9A84C' }}
                />
                <Area
                  type="monotone"
                  dataKey="leads"
                  name="WhatsApp Leads"
                  stroke="#4f6fa5"
                  strokeWidth={2}
                  fill="url(#gLeads)"
                  dot={false}
                  activeDot={{ r: 4, fill: '#4f6fa5' }}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* TWO COLUMN — TOP PRODUCTS + CATEGORY PIE */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1.4fr 1fr',
        gap: '16px',
        marginBottom: '16px',
      }}
        className="analytics-two-col"
      >

        {/* TOP PRODUCTS BAR CHART */}
        <div className="card">
          <div className="card-hd">
            <div className="card-title">📦 Top Products by Views</div>
          </div>
          <div style={{ padding: '0 8px 16px' }}>
            {topProducts.length === 0 ? (
              <EmptyChart message="Add products to see performance" />
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart
                  data={topProducts}
                  layout="vertical"
                  margin={{ left: 0, right: 20 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="rgba(0,0,0,0.06)"
                    horizontal={false}
                  />
                  <XAxis
                    type="number"
                    tick={{ fontSize: 11, fill: '#8a8fa8', fontFamily: 'DM Sans' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    tick={{ fontSize: 11, fill: '#4a4f6a', fontFamily: 'DM Sans' }}
                    axisLine={false}
                    tickLine={false}
                    width={100}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar
                    dataKey="views"
                    name="Views"
                    fill="#C9A84C"
                    radius={[0, 6, 6, 0]}
                    maxBarSize={18}
                  />
                  <Bar
                    dataKey="leads"
                    name="Leads"
                    fill="#1a2340"
                    radius={[0, 6, 6, 0]}
                    maxBarSize={18}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* CATEGORY PIE CHART */}
        <div className="card">
          <div className="card-hd">
            <div className="card-title">🏷️ Views by Category</div>
          </div>
          <div style={{ padding: '0 8px 8px' }}>
            {categoryData.length === 0 || totalCatViews === 0 ? (
              <EmptyChart message="No views data yet" />
            ) : (
              <>
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie
                      data={categoryData}
                      cx="50%"
                      cy="50%"
                      innerRadius={52}
                      outerRadius={82}
                      paddingAngle={3}
                      dataKey="value"
                      labelLine={false}
                      label={renderCustomLabel}
                    >
                      {categoryData.map((_, i) => (
                        <Cell
                          key={i}
                          fill={COLORS[i % COLORS.length]}
                          stroke="none"
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value, name) => [
                        `${value} views (${((value / totalCatViews) * 100).toFixed(1)}%)`,
                        name
                      ]}
                      contentStyle={{
                        borderRadius: '10px',
                        fontSize: '12.5px',
                        fontFamily: 'DM Sans, sans-serif',
                        border: '1px solid var(--border)',
                        boxShadow: 'var(--shadow)',
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>

                {/* CUSTOM LEGEND */}
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                  padding: '0 8px 8px',
                }}>
                  {categoryData.map((d, i) => (
                    <div key={i} style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                    }}>
                      <div style={{
                        width: '10px',
                        height: '10px',
                        borderRadius: '3px',
                        background: COLORS[i % COLORS.length],
                        flexShrink: 0,
                      }} />
                      <span style={{
                        fontSize: '12px',
                        color: 'var(--navy)',
                        flex: 1,
                        fontWeight: 500,
                      }}>
                        {d.name}
                      </span>
                      <span style={{
                        fontSize: '11.5px',
                        color: 'var(--muted)',
                      }}>
                        {d.value} views ·{' '}
                        <strong style={{ color: 'var(--navy)' }}>
                          {((d.value / totalCatViews) * 100).toFixed(1)}%
                        </strong>
                      </span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* COUNTRY BREAKDOWN */}
      <div className="card">
        <div className="card-hd">
          <div className="card-title">🌍 Top Buyer Countries</div>
          <span style={{ fontSize: '12px', color: 'var(--muted)' }}>
            By catalogue views
          </span>
        </div>
        {countryData.length === 0 ? (
          <div style={{
            padding: '32px',
            textAlign: 'center',
            fontSize: '13px',
            color: 'var(--muted)',
          }}>
            Country data appears once buyers start viewing your catalogue
          </div>
        ) : (
          <div style={{ padding: '8px 16px 16px' }}>
            {countryData.map((c, i) => {
              const pct = ((c.value / totalViews) * 100).toFixed(1)
              return (
                <div key={i} style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  marginBottom: '10px',
                }}>
                  <div style={{
                    width: '100px',
                    fontSize: '12.5px',
                    color: 'var(--navy)',
                    fontWeight: 500,
                    flexShrink: 0,
                  }}>
                    {c.name}
                  </div>
                  <div style={{
                    flex: 1,
                    height: '8px',
                    background: 'var(--cream)',
                    borderRadius: '99px',
                    overflow: 'hidden',
                  }}>
                    <div style={{
                      height: '100%',
                      width: `${pct}%`,
                      background: COLORS[i % COLORS.length],
                      borderRadius: '99px',
                      transition: 'width 0.6s ease',
                    }} />
                  </div>
                  <div style={{
                    width: '70px',
                    textAlign: 'right',
                    fontSize: '12px',
                    color: 'var(--muted)',
                    flexShrink: 0,
                  }}>
                    {c.value} · {pct}%
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

    </div>
  )
}

// ── EMPTY CHART PLACEHOLDER ──
function EmptyChart({ message }) {
  return (
    <div style={{
      height: '180px',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '8px',
      background: 'var(--cream)',
      borderRadius: '10px',
      margin: '8px 0',
    }}>
      <div style={{ fontSize: '28px' }}>📊</div>
      <div style={{
        fontSize: '12.5px',
        color: 'var(--muted)',
        textAlign: 'center',
        maxWidth: '220px',
        lineHeight: 1.5,
      }}>
        {message}
      </div>
    </div>
  )
}