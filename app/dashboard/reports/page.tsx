import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { RoleBasedLayout } from "@/components/role-based-layout"
import { ReportsView } from "@/components/reports-view"

export default async function ReportsPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  const { data: userProfile } = await supabase.from("users").select("*").eq("id", user.id).single()

  if (!userProfile || !["admin", "manager", "operator"].includes(userProfile.role)) {
    redirect("/dashboard")
  }

  // Get data for reports
  const [{ data: tasks }, { data: users }, { data: activityLogs }] = await Promise.all([
    supabase
      .from("tasks")
      .select(`
        *,
        assigned_user:assigned_to(full_name, role),
        creator:created_by(full_name, role)
      `)
      .order("created_at", { ascending: false }),
    supabase.from("users").select("*").order("created_at", { ascending: false }),
    supabase
      .from("activity_logs")
      .select(`
        *,
        user:user_id(full_name, role),
        task:task_id(title, category, priority)
      `)
      .order("created_at", { ascending: false })
      .limit(50),
  ])

  return (
    <RoleBasedLayout user={userProfile} currentPage="reports">
      <ReportsView
        currentUser={userProfile}
        tasks={tasks || []}
        users={users || []}
        activityLogs={activityLogs || []}
      />
    </RoleBasedLayout>
  )
}
