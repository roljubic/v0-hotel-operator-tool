import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { RoleBasedLayout } from "@/components/role-based-layout"
import { UserManagement } from "@/components/user-management"

export default async function UsersPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  const { data: userProfile } = await supabase.from("users").select("*").eq("id", user.id).single()

  if (!userProfile || !["admin", "manager"].includes(userProfile.role)) {
    redirect("/dashboard")
  }

  const { data: allUsers } = await supabase.from("users").select("*").order("created_at", { ascending: false })

  return (
    <RoleBasedLayout user={userProfile} currentPage="users">
      <UserManagement currentUser={userProfile} users={allUsers || []} />
    </RoleBasedLayout>
  )
}
