import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { BellmanDashboardClient } from "@/components/bellman-dashboard-client"

export default async function BellmanDashboardPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  let userProfile = null
  const { data: profileData, error: profileError } = await supabase.from("users").select("*").eq("id", user.id).single()

  if (profileError) {
    // Fallback to user metadata
    userProfile = {
      id: user.id,
      email: user.email || "",
      full_name: user.user_metadata?.full_name || user.email?.split("@")[0] || "User",
      role: user.user_metadata?.role || "bellman",
      is_active: true,
      bellman_status: "available",
    }
  } else {
    userProfile = profileData
  }

  // Users must have a hotel assigned
  if (!userProfile?.hotel_id) {
    redirect("/auth/onboarding")
  }

  if (!userProfile || userProfile.role !== "bellman") {
    redirect("/dashboard")
  }

  // Get all pending tasks (tickets/calls from hotel staff)
  const { data: pendingTasks } = await supabase
    .from("tasks")
    .select("*")
    .eq("status", "pending")
    .is("assigned_to", null)
    .order("created_at", { ascending: true })

  // Get all bellmen and their current status
  const { data: allBellmen } = await supabase
    .from("users")
    .select("id, full_name, bellman_status")
    .eq("role", "bellman")
    .order("full_name")

  // Get tasks currently in progress
  const { data: inProgressTasks } = await supabase.from("tasks").select("*").eq("status", "in_progress")

  return (
    <BellmanDashboardClient
      pendingTasks={pendingTasks || []}
      allBellmen={allBellmen || []}
      inProgressTasks={inProgressTasks || []}
      currentUser={{ id: userProfile.id, hotel_id: userProfile.hotel_id, role: userProfile.role }}
    />
  )
}
