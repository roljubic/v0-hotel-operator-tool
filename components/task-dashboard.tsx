"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Plus, Search, LogOut, Bell, Clock, Wifi, WifiOff } from "lucide-react"
import { TaskCreateDialog } from "@/components/task-create-dialog"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { RealtimeNotifications } from "@/components/realtime-notifications"
import { useRealtimeTasks, type Task } from "@/hooks/use-realtime-tasks"
import { ClientDate } from "@/components/client-date"

interface TaskDashboardProps {
  user: any
  tasks: Task[]
}

export function TaskDashboard({ user, tasks: initialTasks }: TaskDashboardProps) {
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
  const router = useRouter()

  // Use realtime subscription instead of polling
  const { tasks, isConnected, lastUpdate } = useRealtimeTasks(initialTasks, {
    hotelId: user.hotel_id,
    onTaskInserted: (newTask) => {
      setNotifications((prev) => [
        ...prev,
        {
          id: Date.now().toString() + Math.random(),
          message: `New task: ${newTask.title} (Room ${newTask.room_number || "N/A"})`,
          type: "info",
        },
      ])
    },
    onTaskUpdated: (updatedTask, oldTask) => {
      if (oldTask && oldTask.status !== updatedTask.status) {
        let message = `Task updated: ${updatedTask.title}`
        let type: "info" | "success" | "warning" = "info"

        if (updatedTask.status === "completed") {
          message = `Task completed: ${updatedTask.title} (Room ${updatedTask.room_number || "N/A"})`
          type = "success"
        } else if (updatedTask.status === "cancelled") {
          message = `Task cancelled: ${updatedTask.title} (Room ${updatedTask.room_number || "N/A"})`
          type = "warning"
        } else if (updatedTask.status === "empty_room") {
          message = `Empty room: ${updatedTask.title} (Room ${updatedTask.room_number || "N/A"})`
          type = "info"
        } else if (updatedTask.status === "in_progress") {
          message = `Task in progress: ${updatedTask.title} (Room ${updatedTask.room_number || "N/A"})`
          type = "info"
        }

        setNotifications((prev) => [
          ...prev,
          {
            id: Date.now().toString() + Math.random(),
            message,
            type,
          },
        ])
      }
    },
  })

  useEffect(() => {
    const fetchBellmen = async () => {
      const supabase = createClient()
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

  const handleSignOut = async () => {
    try {
      const supabase = createClient()
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
              {isConnected ? (
                <div className="flex items-center space-x-2 text-green-600">
                  <Wifi className="h-3 w-3" />
                  <span className="text-xs">Live</span>
                </div>
              ) : (
                <div className="flex items-center space-x-2 text-yellow-600">
                  <WifiOff className="h-3 w-3" />
                  <span className="text-xs">Connecting...</span>
                </div>
              )}
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
                        <ClientDate date={task.created_at} />
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
