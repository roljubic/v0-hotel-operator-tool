"use client"

import { useState, useEffect, useTransition } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Plus, Search, LogOut, Bell, Clock, RefreshCw } from "lucide-react"
import { TaskCreateDialog } from "@/components/task-create-dialog"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { RealtimeNotifications } from "@/components/realtime-notifications"

interface Task {
  id: string
  title: string
  description?: string
  priority: "low" | "medium" | "high" | "urgent"
  status: "pending" | "in_progress" | "completed" | "cancelled" | "empty_room"
  category:
    | "maintenance"
    | "housekeeping"
    | "guest_service"
    | "delivery"
    | "other"
    | "check_in"
    | "check_out"
    | "room_move"
  assigned_to?: string
  created_by: string
  room_number?: string
  guest_name?: string
  due_date?: string
  completed_at?: string
  estimated_duration?: number
  actual_duration?: number
  notes?: string
  created_at: string
  updated_at: string
  assigned_user?: { full_name: string; role: string }
  creator?: { full_name: string; role: string }
}

interface TaskDashboardProps {
  user: any
  tasks: Task[]
}

export function TaskDashboard({ user, tasks: initialTasks }: TaskDashboardProps) {
  const [tasks, setTasks] = useState<Task[]>(initialTasks)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [categoryFilter, setCategoryFilter] = useState<string>("all")
  const [dateFilter, setDateFilter] = useState<string>("all")
  const [bellmanFilter, setBellmanFilter] = useState<string>("all")
  const [bellmenUsers, setBellmenUsers] = useState<Array<{ id: string; full_name: string }>>([])
  const [notifications, setNotifications] = useState<
    Array<{ id: string; message: string; type: "info" | "success" | "warning" }>
  >([])
  const [isPending, startTransition] = useTransition()
  const [lastUpdateTime, setLastUpdateTime] = useState(new Date().toLocaleTimeString())
  const [isRefreshing, setIsRefreshing] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const fetchBellmen = async () => {
      const { data } = await supabase
        .from("users")
        .select("id, full_name")
        .eq("role", "bellman")
        .eq("is_active", true)
        .order("full_name")

      if (data) {
        setBellmenUsers(data)
      }
    }

    fetchBellmen()
  }, [])

  useEffect(() => {
  console.log("=".repeat(80))
  console.log("[v0] 🔄 STARTING ENHANCED POLLING FOR MANAGER/FRONT DESK")
  console.log("[v0] Polling interval: Every 2 seconds")
  console.log("[v0] User:", user.full_name, "Role:", user.role)
  console.log("=".repeat(80))

  let isSubscribed = true // Prevent state updates after unmount

  const pollTasks = async () => {
    if (!isSubscribed) return

    try {
      setIsRefreshing(true)
      
      console.log("[v0] 🔍 Polling for task updates...")

      const { data: latestTasks, error } = await supabase
        .from("tasks")
        .select(`
          *,
          assigned_user:assigned_to(full_name, role),
          creator:created_by(full_name, role)
        `)
        .order("created_at", { ascending: false })

      if (error) {
        console.error("[v0] ❌ Error fetching tasks:", error)
        return
      }

      if (latestTasks && isSubscribed) {
        console.log(`[v0] ✅ Successfully fetched ${latestTasks.length} tasks`)

        setTasks((prevTasks) => {
          // Track status changes
          const statusChanges: Array<{
            task: any
            oldStatus: string
            newStatus: string
          }> = []

          // Check each task for status changes
          latestTasks.forEach((newTask) => {
            const oldTask = prevTasks.find((t) => t.id === newTask.id)

            if (oldTask && oldTask.status !== newTask.status) {
              statusChanges.push({
                task: newTask,
                oldStatus: oldTask.status,
                newStatus: newTask.status,
              })

              console.log("=".repeat(80))
              console.log("[v0] 🎉 STATUS CHANGE DETECTED!")
              console.log("=".repeat(80))
              console.log("[v0] Task ID:", newTask.id.slice(0, 8) + "...")
              console.log("[v0] Title:", newTask.title)
              console.log("[v0] Room:", newTask.room_number || "N/A")
              console.log("[v0] Guest:", newTask.guest_name || "N/A")
              console.log("[v0] Old Status:", oldTask.status)
              console.log("[v0] New Status:", newTask.status)
              console.log("[v0] Timestamp:", new Date().toISOString())
              console.log("=".repeat(80))
            }
          })

          // Show notifications for status changes
          if (statusChanges.length > 0 && isSubscribed) {
            console.log(`[v0] 🔔 Showing ${statusChanges.length} notification(s)`)
            
            statusChanges.forEach(({ task, oldStatus, newStatus }) => {
              let message = `Task updated: ${task.title}`
              let type: "info" | "success" | "warning" = "info"

              if (newStatus === "completed") {
                message = `✅ Task completed: ${task.title} (Room ${task.room_number || "N/A"})`
                type = "success"
              } else if (newStatus === "cancelled") {
                message = `❌ Task cancelled: ${task.title} (Room ${task.room_number || "N/A"})`
                type = "warning"
              } else if (newStatus === "empty_room") {
                message = `🚪 Empty room: ${task.title} (Room ${task.room_number || "N/A"})`
                type = "info"
              } else if (newStatus === "in_progress") {
                message = `🔄 Task started: ${task.title} (Room ${task.room_number || "N/A"})`
                type = "info"
              } else if (newStatus === "pending" && oldStatus === "in_progress") {
                message = `⏸️ Task paused: ${task.title} (Room ${task.room_number || "N/A"})`
                type = "warning"
              }

              console.log("[v0] 📣 Notification:", message)

              setNotifications((prev) => [
                ...prev,
                {
                  id: `${Date.now()}-${Math.random()}`,
                  message,
                  type,
                },
              ])
            })
          }

          // Check for new tasks
          const oldTaskIds = prevTasks.map((t) => t.id)
          const newTasks = latestTasks.filter((t) => !oldTaskIds.includes(t.id))

          if (newTasks.length > 0) {
            console.log(`[v0] ➕ ${newTasks.length} new task(s) detected:`)
            newTasks.forEach((task) => {
              console.log(`   - ${task.title} (Room ${task.room_number || "N/A"})`)
            })
            
            if (isSubscribed) {
              newTasks.forEach((task) => {
                setNotifications((prev) => [
                  ...prev,
                  {
                    id: `${Date.now()}-${Math.random()}`,
                    message: `📋 New task: ${task.title} (Room ${task.room_number || "N/A"})`,
                    type: "info",
                  },
                ])
              })
            }
          }

          // Check for deleted tasks
          const newTaskIds = latestTasks.map((t) => t.id)
          const deletedTasks = prevTasks.filter((t) => !newTaskIds.includes(t.id))

          if (deletedTasks.length > 0) {
            console.log(`[v0] 🗑️ ${deletedTasks.length} task(s) deleted:`)
            deletedTasks.forEach((task) => {
              console.log(`   - ${task.title}`)
            })
          }

          setLastUpdateTime(new Date().toLocaleTimeString())
          console.log(`[v0] ⏰ Last update: ${new Date().toLocaleTimeString()}`)
          
          return latestTasks
        })
      }
    } catch (error) {
      console.error("[v0] ❌ Polling error:", error)
    } finally {
      if (isSubscribed) {
        setIsRefreshing(false)
      }
    }
  }

  // Poll immediately on mount
  console.log("[v0] 🚀 Starting initial poll...")
  pollTasks()

  // Then poll every 2 seconds
  console.log("[v0] ⏱️ Setting up 2-second polling interval...")
  const interval = setInterval(() => {
    if (isSubscribed) {
      pollTasks()
    }
  }, 2000)

  return () => {
    console.log("[v0] 🛑 Stopping task polling and cleaning up...")
    isSubscribed = false
    clearInterval(interval)
  }
}, [user.full_name, user.role])

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut()
      router.push("/auth/login")
    } catch (error) {
      console.error("Error signing out:", error)
    }
  }

  const dismissNotification = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id))
  }

  const filteredTasks = tasks.filter((task) => {
    const matchesSearch =
      task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      task.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      task.room_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      task.guest_name?.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesStatus = statusFilter === "all" || task.status === statusFilter

    const matchesCategory =
      categoryFilter === "all" ||
      (categoryFilter === "check_in" && task.title.toLowerCase().includes("check in")) ||
      (categoryFilter === "check_out" && task.title.toLowerCase().includes("check out")) ||
      (categoryFilter === "room_move" && task.title.toLowerCase().includes("room move")) ||
      (categoryFilter === "other" &&
        !task.title.toLowerCase().includes("check in") &&
        !task.title.toLowerCase().includes("check out") &&
        !task.title.toLowerCase().includes("room move"))

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const taskDate = new Date(task.created_at)
    taskDate.setHours(0, 0, 0, 0)
    const matchesDate =
      dateFilter === "all" ||
      (dateFilter === "today" && taskDate.getTime() === today.getTime()) ||
      (dateFilter === "yesterday" && taskDate.getTime() === today.getTime() - 24 * 60 * 60 * 1000) ||
      (dateFilter === "week" && taskDate.getTime() >= today.getTime() - 7 * 24 * 60 * 60 * 1000)

    const matchesBellman = bellmanFilter === "all" || task.assigned_to === bellmanFilter

    return matchesSearch && matchesStatus && matchesCategory && matchesDate && matchesBellman
  })

  const tasksForStats = tasks.filter((task) => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const taskDate = new Date(task.created_at)
    taskDate.setHours(0, 0, 0, 0)

    if (dateFilter === "all") return true
    if (dateFilter === "today") return taskDate.getTime() === today.getTime()
    if (dateFilter === "yesterday") return taskDate.getTime() === today.getTime() - 24 * 60 * 60 * 1000
    if (dateFilter === "week") return taskDate.getTime() >= today.getTime() - 7 * 24 * 60 * 60 * 1000
    return true
  })

  const taskStats = {
    total: tasksForStats.length,
    pending: tasksForStats.filter((t) => t.status === "pending").length,
    inProgress: tasksForStats.filter((t) => t.status === "in_progress").length,
    completed: tasksForStats.filter((t) => t.status === "completed").length,
  }

  const canCreateTasks = ["operator", "manager", "admin", "phone_operator", "front_desk"].includes(user.role)

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-800"
      case "in_progress":
        return "bg-blue-100 text-blue-800"
      case "completed":
        return "bg-green-100 text-green-800"
      case "cancelled":
        return "bg-gray-100 text-gray-800"
      case "empty_room":
        return "bg-red-100 text-red-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <RealtimeNotifications notifications={notifications} onDismiss={dismissNotification} />

      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <h1 className="text-2xl font-bold text-gray-900">TheBell</h1>
              <Badge variant="secondary" className="text-sm">
                {user.role.replace("_", " ").toUpperCase()}
              </Badge>
              <div className="flex items-center space-x-2 text-green-600">
                <RefreshCw className="h-3 w-3" />
                <span className="text-xs">Real-time updates active</span>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="relative">
                <Bell className="h-5 w-5 text-gray-600" />
                {notifications.length > 0 && (
                  <div className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center">
                    {notifications.length}
                  </div>
                )}
              </div>
              <span className="text-sm text-gray-600">Welcome, {user.full_name}</span>
              <Button variant="outline" size="sm" onClick={handleSignOut}>
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Total Tasks</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{taskStats.total}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Pending</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">{taskStats.pending}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">In Progress</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{taskStats.inProgress}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Completed</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{taskStats.completed}</div>
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search tasks..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
                <SelectItem value="empty_room">Empty Room</SelectItem>
              </SelectContent>
            </Select>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-36">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="check_in">Check In</SelectItem>
                <SelectItem value="check_out">Check Out</SelectItem>
                <SelectItem value="room_move">Room Move</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
            <Select value={dateFilter} onValueChange={setDateFilter}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Date" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Time</SelectItem>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="yesterday">Yesterday</SelectItem>
                <SelectItem value="week">Last 7 Days</SelectItem>
              </SelectContent>
            </Select>
            <Select value={bellmanFilter} onValueChange={setBellmanFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Bellman" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Bellmen</SelectItem>
                {bellmenUsers.map((bellman) => (
                  <SelectItem key={bellman.id} value={bellman.id}>
                    {bellman.full_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {canCreateTasks && (
              <Button onClick={() => setIsCreateDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                New Task
              </Button>
            )}
          </div>
        </div>

        <Card>
          <CardContent className="p-0">
            <div className="divide-y">
              {filteredTasks.map((task) => (
                <div key={task.id} className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3">
                      <h3 className="font-medium text-gray-900 truncate">{task.title}</h3>
                      <Badge className={`${getStatusColor(task.status)} text-xs`}>
                        {task.status.replace("_", " ")}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
                      {task.room_number && <span>Room {task.room_number}</span>}
                      {task.guest_name && <span>{task.guest_name}</span>}
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {new Date(task.created_at).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {filteredTasks.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">No tasks found matching your criteria.</p>
          </div>
        )}
      </div>

      {canCreateTasks && (
        <TaskCreateDialog
          isOpen={isCreateDialogOpen}
          onClose={() => setIsCreateDialogOpen(false)}
          onTaskCreated={(newTask: Task) => {}}
          currentUser={user}
        />
      )}
    </div>
  )
}
