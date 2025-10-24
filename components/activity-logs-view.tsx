"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Search, Download, FileText, Clock } from "lucide-react"
import { format } from "date-fns"

interface ActivityLog {
  id: string
  task_id?: string
  user_id: string
  action: string
  old_value?: string
  new_value?: string
  description: string
  created_at: string
  user?: { full_name: string; role: string }
  task?: { title: string; category: string; priority: string }
}

interface CurrentUser {
  id: string
  full_name: string
  role: "admin" | "manager" | "operator" | "bell_staff" | "bellman"
  email: string
}

interface ActivityLogsViewProps {
  currentUser: CurrentUser
  activityLogs: ActivityLog[]
}

export function ActivityLogsView({ currentUser, activityLogs }: ActivityLogsViewProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const [actionFilter, setActionFilter] = useState<string>("all")
  const [userFilter, setUserFilter] = useState<string>("all")
  const [isExporting, setIsExporting] = useState(false)

  const filteredLogs = activityLogs.filter((log) => {
    const matchesSearch =
      log.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.user?.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.task?.title?.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesAction = actionFilter === "all" || log.action === actionFilter
    const matchesUser = userFilter === "all" || log.user_id === userFilter

    return matchesSearch && matchesAction && matchesUser
  })

  const uniqueUsers = Array.from(new Set(activityLogs.map((log) => log.user_id)))
    .map((userId) => {
      const log = activityLogs.find((l) => l.user_id === userId)
      return { id: userId, name: log?.user?.full_name || "Unknown User" }
    })
    .filter((user) => user.name !== "Unknown User")

  const uniqueActions = Array.from(new Set(activityLogs.map((log) => log.action)))

  const handleExportPDF = async () => {
    setIsExporting(true)
    try {
      const response = await fetch("/api/export/activity-logs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          logs: filteredLogs,
          filters: { searchTerm, actionFilter, userFilter },
        }),
      })

      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.style.display = "none"
        a.href = url
        a.download = `activity-logs-${format(new Date(), "yyyy-MM-dd")}.pdf`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
      }
    } catch (error) {
      console.error("Error exporting PDF:", error)
    } finally {
      setIsExporting(false)
    }
  }

  const getActionColor = (action: string) => {
    switch (action) {
      case "created":
        return "bg-green-100 text-green-800"
      case "updated":
      case "status_changed":
        return "bg-blue-100 text-blue-800"
      case "assigned":
        return "bg-purple-100 text-purple-800"
      case "completed":
        return "bg-emerald-100 text-emerald-800"
      case "deleted":
        return "bg-red-100 text-red-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const getActionIcon = (action: string) => {
    switch (action) {
      case "created":
        return "➕"
      case "updated":
      case "status_changed":
        return "✏️"
      case "assigned":
        return "👤"
      case "completed":
        return "✅"
      case "deleted":
        return "🗑️"
      default:
        return "📝"
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Activity Logs</h1>
          <p className="text-gray-600">Track all system activities and user actions</p>
        </div>
        <Button onClick={handleExportPDF} disabled={isExporting}>
          <Download className="h-4 w-4 mr-2" />
          {isExporting ? "Exporting..." : "Export PDF"}
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Activities</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activityLogs.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Today's Activities</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {
                activityLogs.filter(
                  (log) => format(new Date(log.created_at), "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd"),
                ).length
              }
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Active Users</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{uniqueUsers.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Task Activities</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{activityLogs.filter((log) => log.task_id).length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search activities..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        <div className="flex gap-2">
          <Select value={actionFilter} onValueChange={setActionFilter}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Action" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Actions</SelectItem>
              {uniqueActions.map((action) => (
                <SelectItem key={action} value={action}>
                  {action.replace("_", " ").toUpperCase()}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={userFilter} onValueChange={setUserFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="User" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Users</SelectItem>
              {uniqueUsers.map((user) => (
                <SelectItem key={user.id} value={user.id}>
                  {user.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Activity Timeline */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Activity Timeline
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {filteredLogs.map((log) => (
              <div key={log.id} className="flex items-start space-x-4 p-4 border rounded-lg hover:bg-gray-50">
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center text-lg">
                    {getActionIcon(log.action)}
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge className={getActionColor(log.action)}>{log.action.replace("_", " ").toUpperCase()}</Badge>
                    {log.task && (
                      <Badge variant="outline" className="text-xs">
                        {log.task.title}
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-gray-900 font-medium">{log.description}</p>
                  <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      <span>{format(new Date(log.created_at), "MMM d, yyyy h:mm a")}</span>
                    </div>
                  </div>
                  {(log.old_value || log.new_value) && (
                    <div className="mt-2 text-xs">
                      {log.old_value && (
                        <span className="text-red-600">
                          From: <code className="bg-red-50 px-1 rounded">{log.old_value}</code>
                        </span>
                      )}
                      {log.old_value && log.new_value && <span className="mx-2">→</span>}
                      {log.new_value && (
                        <span className="text-green-600">
                          To: <code className="bg-green-50 px-1 rounded">{log.new_value}</code>
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
          {filteredLogs.length === 0 && (
            <div className="text-center py-8">
              <p className="text-gray-500">No activity logs found matching your criteria.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
