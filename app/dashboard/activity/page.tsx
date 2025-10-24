import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { RoleBasedLayout } from "@/components/role-based-layout"
import { ActivityLogsView } from "@/components/activity-logs-view"

export default async function ActivityPage() {
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

  // Get activity logs with user information
  const { data: activityLogs } = await supabase
    .from("activity_logs")
    .select(`
      *,
      user:user_id(full_name, role),
      task:task_id(title, category, priority)
    `)
    .order("created_at", { ascending: false })
    .limit(100)

  return (
    <RoleBasedLayout user={userProfile} currentPage="activity">
      <ActivityLogsView currentUser={userProfile} activityLogs={activityLogs || []} />
    </RoleBasedLayout>
  )
}
