import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

export const createClient = (request: NextRequest) => {
  // Create an unmodified response
  let response = NextResponse.next({
    request: {
      headers: request.headers
    }
  })

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  // During build, return a minimal response if env vars are not available
  if (!url || !anonKey) {
    return {
      supabase: null as any,
      response
    }
  }

  const supabase = createServerClient(url, anonKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          // Update cookies on the request
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value)
          })
          
          // Create new response with updated request
          response = NextResponse.next({
            request: {
              headers: request.headers
            }
          })
          
          // Set cookies on the response
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options)
          })
        },
        removeAll(cookiesToRemove) {
          // Remove cookies from request
          cookiesToRemove.forEach(({ name, options }) => {
            request.cookies.set(name, '')
          })
          
          // Create new response
          response = NextResponse.next({
            request: {
              headers: request.headers
            }
          })
          
          // Remove cookies from response
          cookiesToRemove.forEach(({ name, options }) => {
            response.cookies.set(name, '', { ...options, maxAge: 0 })
          })
        }
      }
    }
  )

  return { supabase, response }
}
