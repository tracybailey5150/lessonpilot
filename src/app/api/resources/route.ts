export const dynamic = "force-dynamic"

import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const courseId = searchParams.get('courseId')
  if (!courseId) return NextResponse.json({ error: 'courseId required' }, { status: 400 })

  const supabase = createServiceClient()

  // Verify auth
  const authHeader = req.headers.get('authorization')
  const token = authHeader?.replace('Bearer ', '')
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: { user }, error: authError } = await supabase.auth.getUser(token)
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Verify user owns the course
  const { data: userRec } = await supabase.from('users').select('id').eq('supabase_auth_id', user.id).single()
  if (!userRec) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  const { data: course } = await supabase.from('courses').select('id').eq('id', courseId).eq('user_id', userRec.id).single()
  if (!course) return NextResponse.json({ error: 'Course not found' }, { status: 404 })

  const { data: resources, error } = await supabase
    .from('course_resources')
    .select('*')
    .eq('course_id', courseId)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ resources })
}

export async function POST(req: NextRequest) {
  const supabase = createServiceClient()

  // Verify auth
  const authHeader = req.headers.get('authorization')
  const token = authHeader?.replace('Bearer ', '')
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: { user }, error: authError } = await supabase.auth.getUser(token)
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: userRec } = await supabase.from('users').select('id').eq('supabase_auth_id', user.id).single()
  if (!userRec) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  const body = await req.json()
  const { courseId, lessonId, type, name, url, filePath, fileSize, mimeType } = body

  if (!courseId || !type || !name) {
    return NextResponse.json({ error: 'courseId, type, name required' }, { status: 400 })
  }

  // Verify user owns the course
  const { data: course } = await supabase.from('courses').select('id').eq('id', courseId).eq('user_id', userRec.id).single()
  if (!course) return NextResponse.json({ error: 'Course not found' }, { status: 404 })

  const { data: resource, error } = await supabase
    .from('course_resources')
    .insert({
      course_id: courseId,
      lesson_id: lessonId || null,
      type,
      name,
      url: url || null,
      file_path: filePath || null,
      file_size: fileSize || null,
      mime_type: mimeType || null,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ resource })
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const supabase = createServiceClient()

  const authHeader = req.headers.get('authorization')
  const token = authHeader?.replace('Bearer ', '')
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: { user }, error: authError } = await supabase.auth.getUser(token)
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: userRec } = await supabase.from('users').select('id').eq('supabase_auth_id', user.id).single()
  if (!userRec) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  // Get the resource to verify ownership via course
  const { data: resource } = await supabase.from('course_resources').select('*, courses!inner(user_id)').eq('id', id).single()
  if (!resource) return NextResponse.json({ error: 'Resource not found' }, { status: 404 })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if ((resource as any).courses?.user_id !== userRec.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { error } = await supabase.from('course_resources').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
