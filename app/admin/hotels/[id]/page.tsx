import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { getUserContext } from "@/lib/auth/get-user-context"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Building2, Users, ClipboardList, Mail, Phone, MapPin } from "lucide-react"

export default async function HotelDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const context = await getUserContext()

  if (!context || context.role !== "super_admin") {
    redirect("/dashboard")
  }

  const { id } = await params
  const supabase = await createClient()

  // Get hotel details
  const { data: hotel } = await supabase.from("hotels").select("*").eq("id", id).single()

  if (!hotel) {
    redirect("/admin")
  }

  // Get hotel statistics
  const [{ count: usersCount }, { count: tasksCount }, { count: activeTasksCount }] = await Promise.all([
    supabase.from("users").select("*", { count: "exact", head: true }).eq("hotel_id", id),
    supabase.from("tasks").select("*", { count: "exact", head: true }).eq("hotel_id", id),
    supabase.from("tasks").select("*", { count: "exact", head: true }).eq("hotel_id", id).neq("status", "completed"),
  ])

  return (
    <div className="min-h-screen bg-black p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-white">{hotel.name}</h1>
          <p className="text-zinc-400 mt-2">Hotel details and statistics</p>
        </div>

        {/* Hotel Info */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader>
              <CardTitle className="text-white">Hotel Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <Building2 className="h-5 w-5 text-zinc-400" />
                <div>
                  <p className="text-sm text-zinc-400">Property Name</p>
                  <p className="text-white font-medium">{hotel.name}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Mail className="h-5 w-5 text-zinc-400" />
                <div>
                  <p className="text-sm text-zinc-400">Email</p>
                  <p className="text-white font-medium">{hotel.email}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Phone className="h-5 w-5 text-zinc-400" />
                <div>
                  <p className="text-sm text-zinc-400">Phone</p>
                  <p className="text-white font-medium">{hotel.phone}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <MapPin className="h-5 w-5 text-zinc-400" />
                <div>
                  <p className="text-sm text-zinc-400">Address</p>
                  <p className="text-white font-medium">
                    {hotel.address}, {hotel.city}, {hotel.country}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Building2 className="h-5 w-5 text-zinc-400" />
                <div>
                  <p className="text-sm text-zinc-400">Total Rooms</p>
                  <p className="text-white font-medium">{hotel.rooms}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
              <CardTitle className="text-sm font-medium text-zinc-400">Active Tasks</CardTitle>
              <ClipboardList className="h-4 w-4 text-zinc-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{activeTasksCount || 0}</div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
