"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Download, BarChart3, Users, ClipboardList, TrendingUp } from "lucide-react"
import { format, subDays, startOfDay, endOfDay } from "date-fns"

interface User {
  id: string
  email: string
  full_name: string
  role: string
  phone?: string
  is_active: boolean
  created_at: string
}

interface Task {
  id: string
  title: string
  description?: string
  priority: "low" | "medium" | "high" | "urgent"
  status: "pending" | "in_progress" | "completed" | "cancelled"
  category: "maintenance" | "housekeeping" | "guest_service" | "delivery" | "other"
  assigned_to?: string
  created_by: string
  room_number?: string
  guest_name?: string
  due_date?: string
  completed_at?: string
  estimated_duration?: number
  actual_duration?: number
  created_at: string
  assigned_user?: { full_name: string; role: string }
  creator?: { full_name: string; role: string }
}

interface ActivityLog {
  id: string
  task_id?: string
  user_id: string
  action: string
  description: string
  created_at: string
  user?: { full_name: string; role: string }
  task?: { title: string; category: string; priority: string }
}

interface ReportsViewProps {
  currentUser: User
  tasks: Task[]
  users: User[]
  activityLogs: ActivityLog[]
}

export function ReportsView({ currentUser, tasks, users, activityLogs }: ReportsViewProps) {
  const [reportType, setReportType] = useState<string>("overview")
  const [dateRange, setDateRange] = useState<string>("7")
  const [isExporting, setIsExporting] = useState(false)

  const getDateRangeFilter = () => {
    const days = Number.parseInt(dateRange)
    const startDate = startOfDay(subDays(new Date(), days))
    const endDate = endOfDay(new Date())
    return { startDate, endDate }
  }

  const { startDate, endDate } = getDateRangeFilter()

  const filteredTasks = tasks.filter((task) => {
    const taskDate = new Date(task.created_at)
    return taskDate >= startDate && taskDate <= endDate
  })

  const filteredActivity = activityLogs.filter((log) => {
    const logDate = new Date(log.created_at)
    return logDate >= startDate && logDate <= endDate
  })

  const handleExportReport = async () => {
    setIsExporting(true)
    try {
      const response = await fetch("/api/export/reports", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          reportType,
          dateRange,
          tasks: filteredTasks,
          users,
          activityLogs: filteredActivity,
        }),
      })

      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.style.display = "none"
        a.href = url
        a.download = `${reportType}-report-${format(new Date(), "yyyy-MM-dd")}.pdf`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
      }
    } catch (error) {
      console.error("Error exporting report:", error)
    } finally {
      setIsExporting(false)
    }
  }

  const taskStats = {
    total: filteredTasks.length,
    completed: filteredTasks.filter((t) => t.status === "completed").length,
    pending: filteredTasks.filter((t) => t.status === "pending").length,
    inProgress: filteredTasks.filter((t) => t.status === "in_progress").length,
    urgent: filteredTasks.filter((t) => t.priority === "urgent").length,
    overdue: filteredTasks.filter((t) => t.due_date && new Date(t.due_date) < new Date() && t.status !== "completed")
      .length,
  }

  const categoryStats = {
    maintenance: filteredTasks.filter((t) => t.category === "maintenance").length,
    housekeeping: filteredTasks.filter((t) => t.category === "housekeeping").length,
    guest_service: filteredTasks.filter((t) => t.category === "guest_service").length,
    delivery: filteredTasks.filter((t) => t.category === "delivery").length,
    other: filteredTasks.filter((t) => t.category === "other").length,
  }

  const userStats = {
    total: users.length,
    active: users.filter((u) => u.is_active).length,
    admins: users.filter((u) => ["admin", "manager"].includes(u.role)).length,
    staff: users.filter((u) => ["operator", "bell_staff", "bellman"].includes(u.role)).length,
  }

  const completionRate = taskStats.total > 0 ? Math.round((taskStats.completed / taskStats.total) * 100) : 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reports & Analytics</h1>
          <p className="text-gray-600">Generate comprehensive reports and insights</p>
        </div>
        <div className="flex gap-2">
          <Select value={reportType} onValueChange={setReportType}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Report Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="overview">Overview</SelectItem>
              <SelectItem value="tasks">Task Report</SelectItem>
              <SelectItem value="users">User Report</SelectItem>
              <SelectItem value="performance">Performance</SelectItem>
            </SelectContent>
          </Select>
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Date Range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">Last 24h</SelectItem>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={handleExportReport} disabled={isExporting}>
            <Download className="h-4 w-4 mr-2" />
            {isExporting ? "Exporting..." : "Export PDF"}
          </Button>
        </div>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <ClipboardList className="h-4 w-4" />
              Total Tasks
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{taskStats.total}</div>
            <p className="text-xs text-gray-500">Last {dateRange} days</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Completion Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{completionRate}%</div>
            <p className="text-xs text-gray-500">{taskStats.completed} completed</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <Users className="h-4 w-4" />
              Active Users
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{userStats.active}</div>
            <p className="text-xs text-gray-500">of {userStats.total} total</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Activities
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{filteredActivity.length}</div>
            <p className="text-xs text-gray-500">Last {dateRange} days</p>
          </CardContent>
        </Card>
      </div>

      {/* Task Status Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Task Status Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Completed</span>
                <div className="flex items-center gap-2">
                  <Badge className="bg-green-100 text-green-800">{taskStats.completed}</Badge>
                  <div className="w-24 bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-green-500 h-2 rounded-full"
                      style={{ width: `${taskStats.total > 0 ? (taskStats.completed / taskStats.total) * 100 : 0}%` }}
                    ></div>
                  </div>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">In Progress</span>
                <div className="flex items-center gap-2">
                  <Badge className="bg-blue-100 text-blue-800">{taskStats.inProgress}</Badge>
                  <div className="w-24 bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-500 h-2 rounded-full"
                      style={{ width: `${taskStats.total > 0 ? (taskStats.inProgress / taskStats.total) * 100 : 0}%` }}
                    ></div>
                  </div>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Pending</span>
                <div className="flex items-center gap-2">
                  <Badge className="bg-yellow-100 text-yellow-800">{taskStats.pending}</Badge>
                  <div className="w-24 bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-yellow-500 h-2 rounded-full"
                      style={{ width: `${taskStats.total > 0 ? (taskStats.pending / taskStats.total) * 100 : 0}%` }}
                    ></div>
                  </div>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Urgent</span>
                <div className="flex items-center gap-2">
                  <Badge className="bg-red-100 text-red-800">{taskStats.urgent}</Badge>
                  <div className="w-24 bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-red-500 h-2 rounded-full"
                      style={{ width: `${taskStats.total > 0 ? (taskStats.urgent / taskStats.total) * 100 : 0}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Task Categories</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Object.entries(categoryStats).map(([category, count]) => (
                <div key={category} className="flex justify-between items-center">
                  <span className="text-sm font-medium capitalize">{category.replace("_", " ")}</span>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{count}</Badge>
                    <div className="w-24 bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-indigo-500 h-2 rounded-full"
                        style={{ width: `${taskStats.total > 0 ? (count / taskStats.total) * 100 : 0}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {filteredActivity.slice(0, 10).map((log) => (
              <div key={log.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex-1">
                  <p className="text-sm font-medium">{log.description}</p>
                  <p className="text-xs text-gray-500">
                    {log.user?.full_name} • {format(new Date(log.created_at), "MMM d, h:mm a")}
                  </p>
                </div>
                <Badge variant="outline" className="text-xs">
                  {log.action.replace("_", " ").toUpperCase()}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
