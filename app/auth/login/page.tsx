"use client"

import type React from "react"

import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { ArrowLeft } from "lucide-react"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    const supabase = createClient()
    setIsLoading(true)
    setError(null)

    try {
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (authError) {
        // Provide user-friendly error messages
        if (authError.message.includes("Invalid login credentials")) {
          throw new Error("Invalid email or password. Please check your credentials and try again.")
        } else if (authError.message.includes("Email not confirmed")) {
          throw new Error("Please verify your email address before logging in.")
        } else {
          throw new Error(`Login failed: ${authError.message}`)
        }
      }

      if (!authData.user) {
        throw new Error("Login failed. Please try again.")
      }

      console.log("[v0] Login successful for user:", authData.user.id)

      // Try to get user profile with RLS bypass using anon key with proper auth
      const { data: userProfile, error: profileError } = await supabase
        .from("users")
        .select("role")
        .eq("id", authData.user.id)
        .maybeSingle()

      // If RLS error, try to get role from user metadata as fallback
      if (profileError || !userProfile) {
        console.warn("[v0] Could not fetch from users table, checking metadata:", profileError)

        // Check if role is stored in user metadata
        const role = authData.user.user_metadata?.role

        if (!role) {
          throw new Error("Could not determine user role. Please contact support to fix your account.")
        }

        console.log("[v0] Using role from metadata:", role)

        if (role === "bellman" || role === "bell_staff") {
          console.log("[v0] Redirecting to bellman dashboard")
          router.push("/dashboard/bellman")
        } else {
          console.log("[v0] Redirecting to main dashboard")
          router.push("/dashboard")
        }
      } else {
        console.log("[v0] User role:", userProfile.role)

        if (userProfile.role === "bellman" || userProfile.role === "bell_staff") {
          console.log("[v0] Redirecting to bellman dashboard")
          router.push("/dashboard/bellman")
        } else {
          console.log("[v0] Redirecting to main dashboard")
          router.push("/dashboard")
        }
      }

      router.refresh()
    } catch (error: unknown) {
      console.error("[v0] Login error:", error)
      setError(error instanceof Error ? error.message : "An unexpected error occurred. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="w-full max-w-md">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-gray-700 hover:text-gray-900 mb-6 transition-colors group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          <span className="font-medium">Back to Website</span>
        </Link>

        <Card className="shadow-xl">
          <CardHeader className="text-center">
            <CardTitle className="text-3xl font-bold text-gray-900">TheBell</CardTitle>
            <CardDescription className="text-lg">Bell Staff Operations</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="your.email@hotel.com"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              {error && <p className="text-sm text-red-600 bg-red-50 p-3 rounded border border-red-200">{error}</p>}
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? "Signing in..." : "Sign In"}
              </Button>
            </form>
            <div className="mt-6 text-center text-sm">
              Need an account?{" "}
              <Link href="/auth/signup" className="text-blue-600 hover:underline font-medium">
                Sign up here
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
