import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { getUserContext } from "@/lib/auth/get-user-context"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { HotelsTable } from "@/components/admin/hotels-table"
import { Building2, Users, ClipboardList, DollarSign } from "lucide-react"

export default async function AdminDashboard() {
  const context = await getUserContext()

  if (!context || context.role !== "super_admin") {
    redirect("/dashboard")
  }

  const supabase = await createClient()

  // Get platform statistics
  const [{ count: hotelsCount }, { count: usersCount }, { count: tasksCount }, { data: subscriptions }] =
    await Promise.all([
      supabase.from("hotels").select("*", { count: "exact", head: true }),
      supabase.from("users").select("*", { count: "exact", head: true }),
      supabase.from("tasks").select("*", { count: "exact", head: true }),
      supabase.from("subscriptions").select("plan_id"),
    ])

  // Calculate MRR (Monthly Recurring Revenue)
  const mrr = subscriptions?.reduce((total, sub) => {
    if (sub.plan_id === "starter") return total + 299
    if (sub.plan_id === "professional") return total + 599
    return total
  }, 0)

  // Get all hotels with their subscription info
  const { data: hotels } = await supabase
    .from("hotels")
    .select(
      `
      *,
      subscriptions (
        plan_id,
        status,
        trial_end,
        current_period_end
      )
    `,
    )
    .order("created_at", { ascending: false })

  return (
    <div className="min-h-screen bg-black p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-white">Super Admin Dashboard</h1>
          <p className="text-zinc-400 mt-2">Platform-wide overview and management</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-zinc-400">Total Hotels</CardTitle>
              <Building2 className="h-4 w-4 text-zinc-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{hotelsCount || 0}</div>
            </CardContent>
          </Card>

          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-zinc-400">Total Users</CardTitle>
              <Users className="h-4 w-4 text-zinc-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{usersCount || 0}</div>
            </CardContent>
          </Card>

          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-zinc-400">Total Tasks</CardTitle>
              <ClipboardList className="h-4 w-4 text-zinc-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{tasksCount || 0}</div>
            </CardContent>
          </Card>

          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-zinc-400">Monthly Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-zinc-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">${mrr?.toLocaleString() || 0}</div>
            </CardContent>
          </Card>
        </div>

        {/* Hotels Table */}
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-white">All Hotels</CardTitle>
          </CardHeader>
          <CardContent>
            <HotelsTable hotels={hotels || []} />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
