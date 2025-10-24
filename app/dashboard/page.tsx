import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { RoleBasedLayout } from "@/components/role-based-layout"
import { TaskDashboard } from "@/components/task-dashboard"

export default async function DashboardPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  console.log("[v0] Dashboard: User ID:", user.id)

  let userProfile = null
  const { data: profileData, error: profileError } = await supabase.from("users").select("*").eq("id", user.id).single()

  if (profileError) {
    console.log("[v0] Dashboard: Could not fetch from users table, using metadata:", profileError.message)
    // Fallback to user metadata
    userProfile = {
      id: user.id,
      email: user.email || "",
      full_name: user.user_metadata?.full_name || user.email?.split("@")[0] || "User",
      role: user.user_metadata?.role || "operator",
      is_active: true,
    }
  } else {
    userProfile = profileData
  }

  if (!userProfile) {
    console.log("[v0] Dashboard: No user profile found, redirecting to login")
    redirect("/auth/login")
  }

  console.log("[v0] Dashboard: User role:", userProfile.role)

  if (userProfile.role === "super_admin") {
    redirect("/admin")
  }

  if (userProfile.role === "bellman") {
    console.log("[v0] Dashboard: Redirecting bellman to /dashboard/bellman")
    redirect("/dashboard/bellman")
  }

  if (userProfile.role === "bell_staff") {
    console.log("[v0] Dashboard: Redirecting bell_staff to /dashboard/my-tasks")
    redirect("/dashboard/my-tasks")
  }

  console.log("[v0] Dashboard: Loading main dashboard for role:", userProfile.role)

  const { data: tasks } = await supabase.from("tasks").select("*").order("created_at", { ascending: false })

  console.log("[v0] Dashboard: Fetched tasks:", tasks?.length || 0)

  return (
    <RoleBasedLayout user={userProfile} currentPage="dashboard">
      <TaskDashboard user={userProfile} tasks={tasks || []} />
    </RoleBasedLayout>
  )
}
