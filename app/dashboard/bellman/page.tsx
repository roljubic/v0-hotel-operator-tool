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

  console.log("[v0] Bellman Dashboard: User ID:", user.id)

  let userProfile = null
  const { data: profileData, error: profileError } = await supabase.from("users").select("*").eq("id", user.id).single()

  if (profileError) {
    console.log("[v0] Bellman Dashboard: Could not fetch from users table, using metadata:", profileError.message)
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

  console.log("[v0] Bellman Dashboard: User role:", userProfile?.role, "hotel_id:", userProfile?.hotel_id)

  // Users must have a hotel assigned
  if (!userProfile?.hotel_id) {
    console.log("[v0] Bellman Dashboard: No hotel_id, redirecting to onboarding")
    redirect("/auth/onboarding")
  }

  if (!userProfile || userProfile.role !== "bellman") {
    console.log("[v0] Bellman Dashboard: Access denied, redirecting to main dashboard")
    redirect("/dashboard")
  }

  console.log("[v0] Bellman Dashboard: Access granted, loading bellman interface")

  // Get all pending tasks (tickets/calls from hotel staff)
  const { data: pendingTasks } = await supabase
    .from("tasks")
    .select("*")
    .eq("status", "pending")
    .is("assigned_to", null)
    .order("created_at", { ascending: true })

  console.log("[v0] Bellman Dashboard: Fetched pending tasks:", pendingTasks?.length || 0)

  // Get all bellmen and their current status
  const { data: allBellmen } = await supabase
    .from("users")
    .select("id, full_name, bellman_status")
    .eq("role", "bellman")
    .order("full_name")

  // Get tasks currently in progress
  const { data: inProgressTasks } = await supabase.from("tasks").select("*").eq("status", "in_progress")

  console.log("[v0] Bellman Dashboard: Fetched in-progress tasks:", inProgressTasks?.length || 0)

  return (
    <BellmanDashboardClient
      pendingTasks={pendingTasks || []}
      allBellmen={allBellmen || []}
      inProgressTasks={inProgressTasks || []}
    />
  )
}
