import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

export async function updateSession(request: NextRequest) {
  // In Edge runtime, we need to use the public variables that are embedded at build time
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  console.log("[v0] Middleware: Checking environment variables", {
    hasUrl: !!supabaseUrl,
    hasKey: !!supabaseAnonKey,
    url: supabaseUrl ? `${supabaseUrl.substring(0, 20)}...` : "missing",
  })

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error("[v0] Middleware: Missing Supabase environment variables!")
    console.error("[v0] Middleware: NEXT_PUBLIC_SUPABASE_URL:", supabaseUrl ? "present" : "MISSING")
    console.error("[v0] Middleware: NEXT_PUBLIC_SUPABASE_ANON_KEY:", supabaseAnonKey ? "present" : "MISSING")

    return NextResponse.next({
      request,
    })
  }

  console.log("[v0] Middleware: Creating Supabase client with valid credentials")

  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(supabaseUrl!, supabaseAnonKey!, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
        supabaseResponse = NextResponse.next({
          request,
        })
        cookiesToSet.forEach(({ name, value, options }) => supabaseResponse.cookies.set(name, value, options))
      },
    },
  })

  const {
    data: { user },
  } = await supabase.auth.getUser()

  console.log("[v0] Middleware: Auth check", {
    hasUser: !!user,
    userId: user?.id,
    path: request.nextUrl.pathname,
  })

  const publicPaths = [
    "/",
    "/pricing",
    "/signup",
    "/contact",
    "/about",
    "/features",
    "/demo",
    "/privacy",
    "/terms",
    "/security",
    "/careers",
  ]

  const isPublicPath = publicPaths.some((path) => request.nextUrl.pathname === path)
  const isAuthPath = request.nextUrl.pathname.startsWith("/auth")

  if (!user && !isPublicPath && !isAuthPath) {
    console.log("[v0] Middleware: Redirecting to login - no authenticated user")
    const url = request.nextUrl.clone()
    url.pathname = "/auth/login"
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}
