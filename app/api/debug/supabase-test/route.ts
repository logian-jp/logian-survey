import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function GET(request: NextRequest) {
  try {
    console.log('=== Supabase Connection Test (Vercel) ===')
    console.log('SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL)
    console.log('NODE_ENV:', process.env.NODE_ENV)
    console.log('VERCEL:', process.env.VERCEL)
    
    // Test 1: Simple query to User table
    console.log('Test 1: Querying User table...')
    const { data: users, error: userError } = await supabase
      .from('User')
      .select('id, email, role')
      .limit(5)
    
    if (userError) {
      console.error('User query error:', userError)
      return NextResponse.json({
        success: false,
        test: 'user_query',
        error: String((userError as any)?.message || userError),
        details: userError
      }, { status: 500 })
    }
    
    console.log('User query successful:', users?.length, 'users found')
    
    // Test 2: Survey table query
    console.log('Test 2: Querying Survey table...')
    const { data: surveys, error: surveyError } = await supabase
      .from('Survey')
      .select('id, title, status')
      .limit(3)
    
    if (surveyError) {
      console.error('Survey query error:', surveyError)
      // Continue even if Survey query fails
    }
    
    console.log('Survey query result:', surveys?.length || 0, 'surveys found')
    
    // Test 3: Check specific user
    console.log('Test 3: Checking specific user...')
    const { data: specificUser, error: specificError } = await supabase
      .from('User')
      .select('id, email, role, name')
      .eq('email', 'noutomi0729@gmail.com')
      .single()
    
    if (specificError && specificError.code !== 'PGRST116') {
      console.error('Specific user query error:', specificError)
    }
    
    console.log('Specific user found:', specificUser ? 'Yes' : 'No')
    
    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      environment: {
        NODE_ENV: process.env.NODE_ENV,
        VERCEL: process.env.VERCEL,
        hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
        hasSupabaseKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      },
      tests: {
        userQuery: {
          success: !userError,
          count: users?.length || 0,
          error: userError ? String((userError as any)?.message || userError) : null
        },
        surveyQuery: {
          success: !surveyError,
          count: surveys?.length || 0,
          error: surveyError ? String((surveyError as any)?.message || surveyError) : null
        },
        specificUser: {
          found: !!specificUser,
          email: specificUser?.email || null,
          role: specificUser?.role || null,
          error: specificError ? String((specificError as any)?.message || specificError) : null
        }
      },
      data: {
        sampleUsers: users?.map(u => ({
          id: u.id,
          email: u.email,
          role: u.role
        })) || [],
        sampleSurveys: surveys?.map(s => ({
          id: s.id,
          title: s.title,
          status: s.status
        })) || []
      }
    })
    
  } catch (error) {
    console.error('Supabase test error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : null
    }, { status: 500 })
  }
}
