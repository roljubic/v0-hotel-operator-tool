import "server-only"
import { createClient } from "@/lib/supabase/server"

export interface UserContext {
  userId: string
  hotelId: string | null
  role: string
  email: string
}

export async function getUserContext(): Promise<UserContext | null> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return null
  }

  const { data: profile, error } = await supabase.from("users").select("hotel_id, role").eq("id", user.id).single()

  if (error) {
    console.log("[v0] Could not fetch user profile from users table, using metadata:", error.message)

    // Fallback to user metadata if RLS policy fails
    const role = user.user_metadata?.role || "operator"
    const hotelId = user.user_metadata?.hotel_id || null

    console.log("[v0] Using role from metadata:", role)

    return {
      userId: user.id,
      hotelId: hotelId,
      role: role,
      email: user.email!,
    }
  }

  if (!profile) {
    return null
  }

  return {
    userId: user.id,
    hotelId: profile.hotel_id,
    role: profile.role,
    email: user.email!,
  }
}

export async function requireAuth(): Promise<UserContext> {
  const context = await getUserContext()

  if (!context) {
    throw new Error("Unauthorized")
  }

  return context
}

export async function requireHotel(): Promise<UserContext & { hotelId: string }> {
  const context = await requireAuth()

  if (!context.hotelId) {
    throw new Error("No hotel associated with user")
  }

  return context as UserContext & { hotelId: string }
}
