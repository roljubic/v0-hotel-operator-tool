import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { RoleBasedLayout } from "@/components/role-based-layout"
import { MyTasksView } from "@/components/my-tasks-view"

export default async function MyTasksPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  const { data: userProfile } = await supabase.from("users").select("*").eq("id", user.id).single()

  // Users must have a hotel assigned
  if (!userProfile?.hotel_id) {
    redirect("/auth/onboarding")
  }

  if (!userProfile || !["bell_staff", "bellman"].includes(userProfile.role)) {
    redirect("/dashboard")
  }

  // Get tasks assigned to this user or available tasks they can take
  const { data: tasks } = await supabase
    .from("tasks")
    .select(`
      *,
      assigned_user:assigned_to(full_name, role),
      creator:created_by(full_name, role)
    `)
    .or(`assigned_to.eq.${user.id},and(assigned_to.is.null,category.in.(delivery,guest_service))`)
    .order("created_at", { ascending: false })

  return (
    <RoleBasedLayout user={userProfile} currentPage="my-tasks">
      <MyTasksView user={userProfile} tasks={tasks || []} />
    </RoleBasedLayout>
  )
}
