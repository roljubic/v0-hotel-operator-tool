"use client"

import { useState, useEffect, useTransition } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { TaskCard } from "@/components/task-card"
import { Search } from "lucide-react"
import { createClient } from "@/lib/supabase/client"

interface User {
  id: string
  email: string
  full_name: string
  role: "operator" | "admin" | "manager" | "bell_staff" | "bellman"
  phone?: string
  is_active: boolean
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
  notes?: string
  created_at: string
  updated_at: string
  assigned_user?: { full_name: string; role: string }
  creator?: { full_name: string; role: string }
}

interface MyTasksViewProps {
  user: User
  tasks: Task[]
}

export function MyTasksView({ user, tasks: initialTasks }: MyTasksViewProps) {
  const [tasks, setTasks] = useState<Task[]>(initialTasks)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [priorityFilter, setPriorityFilter] = useState<string>("all")
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    const supabase = createClient()

    const tasksSubscription = supabase
      .channel("my-tasks-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "tasks",
        },
        (payload) => {
          console.log("[v0] My tasks real-time change received:", payload)

          startTransition(async () => {
            try {
              if (payload.eventType === "INSERT") {
                const { data: newTask } = await supabase
                  .from("tasks")
                  .select(`
                    *,
                    assigned_user:assigned_to(full_name, role),
                    creator:created_by(full_name, role)
                  `)
                  .eq("id", payload.new.id)
                  .single()

                if (
                  newTask &&
                  (newTask.assigned_to === user.id ||
                    (!newTask.assigned_to && ["delivery", "guest_service"].includes(newTask.category)))
                ) {
                  setTasks((prev) => [newTask, ...prev])
                }
              } else if (payload.eventType === "UPDATE") {
                const { data: updatedTask } = await supabase
                  .from("tasks")
                  .select(`
                    *,
                    assigned_user:assigned_to(full_name, role),
                    creator:created_by(full_name, role)
                  `)
                  .eq("id", payload.new.id)
                  .single()

                if (updatedTask) {
                  if (
                    updatedTask.assigned_to === user.id ||
                    (!updatedTask.assigned_to && ["delivery", "guest_service"].includes(updatedTask.category))
                  ) {
                    setTasks((prev) => prev.map((task) => (task.id === updatedTask.id ? updatedTask : task)))
                  } else {
                    setTasks((prev) => prev.filter((task) => task.id !== updatedTask.id))
                  }
                }
              } else if (payload.eventType === "DELETE") {
                setTasks((prev) => prev.filter((task) => task.id !== payload.old.id))
              }
            } catch (error) {
              console.error("Error handling my tasks real-time update:", error)
            }
          })
        },
      )
      .subscribe()

    return () => {
      console.log("[v0] Cleaning up my tasks subscription")
      supabase.removeChannel(tasksSubscription)
    }
  }, [user.id])

  const filteredTasks = tasks.filter((task) => {
    const matchesSearch =
      task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      task.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      task.room_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      task.guest_name?.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesStatus = statusFilter === "all" || task.status === statusFilter
    const matchesPriority = priorityFilter === "all" || task.priority === priorityFilter

    return matchesSearch && matchesStatus && matchesPriority
  })

  const myTasks = filteredTasks.filter((task) => task.assigned_to === user.id)
  const availableTasks = filteredTasks.filter((task) => !task.assigned_to && task.status === "pending")

  const taskStats = {
    myTasks: myTasks.length,
    inProgress: myTasks.filter((t) => t.status === "in_progress").length,
    completed: myTasks.filter((t) => t.status === "completed").length,
    available: availableTasks.length,
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">My Tasks</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{taskStats.myTasks}</div>
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
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Available</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{taskStats.available}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
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
        <div className="flex gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
            </SelectContent>
          </Select>
          <Select value={priorityFilter} onValueChange={setPriorityFilter}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Priority" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Priority</SelectItem>
              <SelectItem value="urgent">Urgent</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="low">Low</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* My Tasks Section */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">My Tasks</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {myTasks.map((task) => (
            <TaskCard key={task.id} task={task} currentUser={user} onTaskUpdate={setTasks} />
          ))}
        </div>
        {myTasks.length === 0 && (
          <div className="text-center py-8">
            <p className="text-gray-500">No tasks assigned to you yet.</p>
          </div>
        )}
      </div>

      {/* Available Tasks Section */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Available Tasks</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {availableTasks.map((task) => (
            <TaskCard key={task.id} task={task} currentUser={user} onTaskUpdate={setTasks} />
          ))}
        </div>
        {availableTasks.length === 0 && (
          <div className="text-center py-8">
            <p className="text-gray-500">No available tasks at the moment.</p>
          </div>
        )}
      </div>
    </div>
  )
}
