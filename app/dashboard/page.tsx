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

  let userProfile = null
  const { data: profileData, error: profileError } = await supabase.from("users").select("*").eq("id", user.id).single()

  if (profileError) {
    // Fallback to user metadata - but hotel_id must come from DB
    userProfile = {
      id: user.id,
      email: user.email || "",
      full_name: user.user_metadata?.full_name || user.email?.split("@")[0] || "User",
      role: user.user_metadata?.role || "operator",
      is_active: true,
      hotel_id: user.user_metadata?.hotel_id || null, // Will trigger redirect to onboarding
    }
  } else {
    userProfile = profileData
  }

  if (!userProfile) {
    redirect("/auth/login")
  }

  // Users must have a hotel assigned to access the dashboard
  if (!userProfile.hotel_id) {
    redirect("/auth/onboarding")
  }

  if (userProfile.role === "super_admin") {
    redirect("/admin")
  }

  if (userProfile.role === "bellman") {
    redirect("/dashboard/bellman")
  }

  if (userProfile.role === "bell_staff") {
    redirect("/dashboard/my-tasks")
  }

  const { data: tasks } = await supabase.from("tasks").select("*").order("created_at", { ascending: false })

  return (
    <RoleBasedLayout user={userProfile} currentPage="dashboard">
      <TaskDashboard user={userProfile} tasks={tasks || []} />
    </RoleBasedLayout>
  )
}
