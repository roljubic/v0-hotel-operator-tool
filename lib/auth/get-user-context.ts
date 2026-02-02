import "server-only"
import { createClient } from "@/lib/supabase/server"

export interface UserContext {
  userId: string
  hotelId: string | null
  role: string
  email: string
  fullName: string
  isSuperAdmin: boolean
}

export async function getUserContext(): Promise<UserContext | null> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return null
  }

  const { data: profile, error } = await supabase
    .from("users")
    .select("hotel_id, role, full_name, is_super_admin")
    .eq("id", user.id)
    .single()

  if (error) {
    // Fallback to user metadata if profile fetch fails
    const role = user.user_metadata?.role || "bellman"
    const hotelId = user.user_metadata?.hotel_id || null
    const fullName = user.user_metadata?.full_name || user.email?.split("@")[0] || "User"

    return {
      userId: user.id,
      hotelId: hotelId,
      role: role,
      email: user.email!,
      fullName: fullName,
      isSuperAdmin: false,
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
    fullName: profile.full_name,
    isSuperAdmin: profile.is_super_admin || false,
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

/**
 * Validates that the current user belongs to the specified hotel
 * Used for additional security checks in API routes
 */
export async function validateHotelAccess(hotelId: string): Promise<boolean> {
  const context = await getUserContext()
  
  if (!context) {
    return false
  }
  
  // Super admins can access any hotel
  if (context.isSuperAdmin) {
    return true
  }
  
  return context.hotelId === hotelId
}
