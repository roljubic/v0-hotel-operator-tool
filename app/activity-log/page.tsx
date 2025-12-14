"use client"

export const dynamic = "force-dynamic"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useRouter } from "next/navigation"

interface ActivityLog {
  id: string
  bellman_name: string
  task_type: string
  room_number: string
  status: string
  guest_name?: string
  ticket_number?: string
  timestamp: string
}

export default function ActivityLogPage() {
  const [logs, setLogs] = useState<ActivityLog[]>([])
  const [filteredLogs, setFilteredLogs] = useState<ActivityLog[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [taskTypeFilter, setTaskTypeFilter] = useState("All types")
  const [statusFilter, setStatusFilter] = useState("All statuses")
  const [dateFilter, setDateFilter] = useState("")
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    fetchLogs()
  }, [])

  useEffect(() => {
    filterLogs()
  }, [logs, searchTerm, taskTypeFilter, statusFilter, dateFilter])

  const fetchLogs = async () => {
    try {
      const { data, error } = await supabase.from("activity_logs").select("*").order("timestamp", { ascending: false })

      if (error) throw error
      setLogs(data || [])
    } catch (error) {
      console.error("Error fetching logs:", error)
    } finally {
      setLoading(false)
    }
  }

  const filterLogs = () => {
    let filtered = logs

    if (searchTerm) {
      filtered = filtered.filter(
        (log) =>
          log.bellman_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          log.room_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (log.guest_name && log.guest_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
          (log.ticket_number && log.ticket_number.toLowerCase().includes(searchTerm.toLowerCase())),
      )
    }

    if (taskTypeFilter !== "All types") {
      filtered = filtered.filter((log) => log.task_type === taskTypeFilter)
    }

    if (statusFilter !== "All statuses") {
      filtered = filtered.filter((log) => log.status === statusFilter)
    }

    if (dateFilter) {
      const filterDate = new Date(dateFilter)
      filtered = filtered.filter((log) => {
        const logDate = new Date(log.timestamp)
        return logDate.toDateString() === filterDate.toDateString()
      })
    }

    setFilteredLogs(filtered)
  }

  const clearFilters = () => {
    setSearchTerm("")
    setTaskTypeFilter("All types")
    setStatusFilter("All statuses")
    setDateFilter("")
  }

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString()
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-100 text-green-800"
      case "cancelled":
        return "bg-red-100 text-red-800"
      case "empty_room":
        return "bg-yellow-100 text-yellow-800"
      case "assigned":
        return "bg-blue-100 text-blue-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => router.push("/dashboard")}>
              ← Back to Dashboard
            </Button>
            <h1 className="text-2xl font-bold text-gray-900">Activity Log</h1>
          </div>
        </div>
      </header>

      <div className="p-6">
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Filters & Search</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Search</label>
                <Input
                  placeholder="Bellman name, room, guest, ticket..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Task Type</label>
                <Select value={taskTypeFilter} onValueChange={setTaskTypeFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="All types">All types</SelectItem>
                    <SelectItem value="Check In">Check In</SelectItem>
                    <SelectItem value="Check Out">Check Out</SelectItem>
                    <SelectItem value="Room Move">Room Move</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Status</label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="All statuses">All statuses</SelectItem>
                    <SelectItem value="assigned">Assigned</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                    <SelectItem value="empty_room">Empty Room</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Date</label>
                <Input type="date" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} />
              </div>
              <div className="flex items-end">
                <Button variant="outline" onClick={clearFilters}>
                  Clear Filters
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Activity History ({filteredLogs.length} records)</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">Loading...</div>
            ) : filteredLogs.length === 0 ? (
              <div className="text-center py-8 text-gray-500">No activity logs found</div>
            ) : (
              <div className="space-y-3 max-h-[calc(100vh-400px)] overflow-y-auto">
                {filteredLogs.map((log) => (
                  <div key={log.id} className="p-4 border rounded-lg bg-white">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h4 className="font-medium">{log.bellman_name}</h4>
                        <p className="text-sm text-gray-600">
                          {log.task_type} - Room {log.room_number}
                        </p>
                      </div>
                      <div className="text-right">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(log.status)}`}>
                          {log.status.charAt(0).toUpperCase() + log.status.slice(1)}
                        </span>
                        <p className="text-xs text-gray-500 mt-1">{formatTimestamp(log.timestamp)}</p>
                      </div>
                    </div>
                    {(log.guest_name || log.ticket_number) && (
                      <div className="text-sm text-gray-600">
                        {log.guest_name && <span>Guest: {log.guest_name}</span>}
                        {log.guest_name && log.ticket_number && <span> • </span>}
                        {log.ticket_number && <span>Ticket: {log.ticket_number}</span>}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
