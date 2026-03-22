import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const { supabaseAuthId, email, fullName } = await req.json()
    const supabase = createServiceClient()

    const { data, error } = await supabase
      .from('users')
      .upsert({ supabase_auth_id: supabaseAuthId, email, full_name: fullName }, { onConflict: 'supabase_auth_id' })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ user: data })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
