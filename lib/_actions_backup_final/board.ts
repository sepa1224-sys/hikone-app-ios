'use server'

import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'

export interface Post {
  id: string
  user_id: string
  content: string
  university_name: string
  created_at: string
  profiles: {
    full_name: string | null
    avatar_url: string | null
    grade: string | null
  } | null
}

export async function getPosts(universityName: string): Promise<{ success: boolean; data?: Post[]; error?: string }> {
  try {
    const supabase = createClient(cookies())

    const { data, error } = await supabase
      .from('posts')
      .select(`
        *,
        profiles (
          full_name,
          avatar_url,
          grade
        )
      `)
      .eq('university_name', universityName)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching posts:', error)
      return { success: false, error: error.message }
    }

    return { success: true, data: data as Post[] }
  } catch (err: any) {
    console.error('Unexpected error in getPosts:', err)
    return { success: false, error: err.message }
  }
}

export async function createPost(content: string, universityName: string): Promise<{ success: boolean; data?: Post; error?: string }> {
  try {
    const supabase = createClient(cookies())
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return { success: false, error: 'Unauthorized' }
    }

    const { data, error } = await supabase
      .from('posts')
      .insert({
        user_id: user.id,
        content,
        university_name: universityName
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating post:', error)
      return { success: false, error: error.message }
    }

    return { success: true, data }
  } catch (err: any) {
    console.error('Unexpected error in createPost:', err)
    return { success: false, error: err.message }
  }
}
