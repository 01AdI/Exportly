'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function AdminLayout({ children }) {
  const router = useRouter()
  const pathname = usePathname()
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    // skip auth check on login page
    if (pathname === '/admin/login') {
      setChecking(false)
      return
    }
    checkAdmin()
  }, [pathname])

  async function checkAdmin() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.replace('/admin/login'); return }

    const { data: profile } = await supabase
      .from('exporter_profiles')
      .select('is_admin')
      .eq('user_id', user.id)
      .single()

    if (!profile?.is_admin) {
      await supabase.auth.signOut()
      router.replace('/admin/login')
      return
    }
    setChecking(false)
  }

  if (checking && pathname !== '/admin/login') {
    return (
      <div style={{
        minHeight: '100vh',
        background: '#0f172a',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'rgba(255,255,255,0.4)',
        fontSize: '14px',
        fontFamily: "'DM Sans', sans-serif",
      }}>
        ✦ Verifying admin access...
      </div>
    )
  }

  return <>{children}</>
}