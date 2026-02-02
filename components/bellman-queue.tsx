"use client"

import { useState, useEffect, useTransition } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Clock,
  MapPin,
  UserIcon,
  CheckCircle,
  AlertCircle,
  ArrowRight,
  Timer,
  Bell,
  Users,
  Circle,
  Plus,
  UserPlus,
} from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import { format } from "date-fns"

interface Task {
  id: string
  title: string
  description: string
  status: "pending" | "in_progress" | "completed"
  priority: "low" | "medium" | "high" | "urgent"
  room_number?: string
  guest_name?: string
  ticket_number?: string
  created_at: string
  creator?: {
    full_name: string
    role: string
  }
}

interface Bellman {
  id: string
  full_name: string
  status: "in_line" | "in_process" | "off_duty"
  updated_at: string
}

interface BellmanQueueProps {
  user: any
  availableTasks: Task[]
  myTasks: Task[]
}

export function BellmanQueue({ user, availableTasks: initialAvailable, myTasks: initialMy }: BellmanQueueProps) {
  const [availableTasks, setAvailableTasks] = useState<Task[]>(initialAvailable)
  const [myTasks, setMyTasks] = useState<Task[]>(initialMy)
  const [bellmen, setBellmen] = useState<Bellman[]>([])
  const [myStatus, setMyStatus] = useState<"in_line" | "in_process" | "off_duty">("off_duty")
  const [isPending, startTransition] = useTransition()
  const supabase = createClient()

  const [isCreateTaskOpen, setIsCreateTaskOpen] = useState(false)
  const [isAssignTaskOpen, setIsAssignTaskOpen] = useState(false)
  const [selectedTaskForAssignment, setSelectedTaskForAssignment] = useState<string | null>(null)
  const [newTask, setNewTask] = useState({
    title: "",
    description: "",
    room_number: "",
    guest_name: "",
    ticket_number: "",
    priority: "medium" as "low" | "medium" | "high" | "urgent",
  })

  useEffect(() => {
    loadBellmenStatus()

    const channel = supabase
      .channel("bellman-tasks")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "tasks",
        },
        () => {
          refreshTasks()
        },
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "users",
        },
        () => {
          loadBellmenStatus()
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  const loadBellmenStatus = async () => {
    try {
      // Use 'users' table instead of 'user_profiles' - RLS will auto-filter by hotel_id
      const { data: bellmenData } = await supabase
        .from("users")
        .select("id, full_name, bellman_status, updated_at")
        .eq("role", "bellman")
        .order("full_name")

      if (bellmenData) {
        setBellmen(
          bellmenData.map((b) => ({
            id: b.id,
            full_name: b.full_name,
            status: b.bellman_status || "off_duty",
            updated_at: b.updated_at,
          })),
        )

        // Set current user's status
        const currentUserData = bellmenData.find((b) => b.id === user.id)
        if (currentUserData) {
          setMyStatus(currentUserData.bellman_status || "off_duty")
        }
      }
    } catch (error) {
      console.error("Error loading bellmen status:", error)
    }
  }

  const updateMyStatus = async (newStatus: "in_line" | "in_process" | "off_duty") => {
    startTransition(() => {
      const performStatusUpdate = async () => {
        try {
          // Use 'users' table instead of 'user_profiles'
          const { error } = await supabase
            .from("users")
            .update({
              bellman_status: newStatus,
              updated_at: new Date().toISOString(),
            })
            .eq("id", user.id)

          if (error) {
            throw error
          }

          // Log activity - hotel_id will be set by RLS
          await supabase.from("activity_logs").insert({
            user_id: user.id,
            action: "status_change",
            description: `Bellman changed status to: ${newStatus}`,
          })

          setMyStatus(newStatus)
          toast.success(`Status updated to ${newStatus.replace("_", " ")}`)
          loadBellmenStatus()
        } catch (error) {
          console.error("Error updating status:", error)
          toast.error("Failed to update status")
        }
      }

      performStatusUpdate()
    })
  }

  const refreshTasks = async () => {
    startTransition(() => {
      const performRefresh = async () => {
        try {
          // Get available tasks
          const { data: available } = await supabase
            .from("tasks")
            .select(`
              *,
              creator:created_by(full_name, role)
            `)
            .is("assigned_to", null)
            .eq("status", "pending")
            .order("created_at", { ascending: true })

          // Get my tasks
          const { data: my } = await supabase
            .from("tasks")
            .select(`
              *,
              creator:created_by(full_name, role)
            `)
            .eq("assigned_to", user.id)
            .in("status", ["in_progress", "pending"])
            .order("created_at", { ascending: true })

          setAvailableTasks(available || [])
          setMyTasks(my || [])
        } catch (error) {
          console.error("Error refreshing tasks:", error)
        }
      }

      performRefresh()
    })
  }

  const takeTask = async (taskId: string) => {
    startTransition(() => {
      const performTakeTask = async () => {
        try {
          console.log("[v0] Taking task:", taskId, "User ID:", user.id)

          if (myStatus !== "in_line") {
            toast.error("You must be 'In Line' to take tasks")
            return
          }

          const { error } = await supabase
            .from("tasks")
            .update({
              assigned_to: user.id,
              status: "in_progress",
              updated_at: new Date().toISOString(),
            })
            .eq("id", taskId)

          if (error) {
            console.error("[v0] Error taking task:", error)
            throw error
          }

          await updateMyStatus("in_process")

          // Log activity
          await supabase.from("activity_logs").insert({
            user_id: user.id,
            action: "task_taken",
            details: `Bellman took task: ${taskId}`,
            metadata: { task_id: taskId },
          })

          toast.success("Task taken successfully!")
          refreshTasks()
        } catch (error) {
          console.error("Error taking task:", error)
          toast.error("Failed to take task")
        }
      }

      performTakeTask()
    })
  }

  const completeTask = async (taskId: string) => {
    startTransition(() => {
      const performCompleteTask = async () => {
        try {
          console.log("[v0] Completing task:", taskId)

          const { error } = await supabase
            .from("tasks")
            .update({
              status: "completed",
              completed_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq("id", taskId)

          if (error) throw error

          const remainingTasks = myTasks.filter((t) => t.id !== taskId)
          if (remainingTasks.length === 0) {
            toast.success("Task completed! Consider going back 'In Line' for more tasks.")
          }

          // Log activity
          await supabase.from("activity_logs").insert({
            user_id: user.id,
            action: "task_completed",
            details: `Bellman completed task: ${taskId}`,
            metadata: { task_id: taskId },
          })

          toast.success("Task completed!")
          refreshTasks()
        } catch (error) {
          console.error("Error completing task:", error)
          toast.error("Failed to complete task")
        }
      }

      performCompleteTask()
    })
  }

  const createTask = async () => {
    if (!newTask.title) {
      toast.error("Please select a task type")
      return
    }

    startTransition(() => {
      const performCreateTask = async () => {
        try {
          // Get current user's hotel_id for multi-tenancy
          const { data: userData } = await supabase
            .from("users")
            .select("hotel_id")
            .eq("id", user.id)
            .single()

          const { error } = await supabase.from("tasks").insert({
            title: newTask.title,
            description: newTask.description,
            room_number: newTask.room_number || null,
            guest_name: newTask.guest_name || null,
            ticket_number: newTask.ticket_number || null,
            priority: newTask.priority,
            status: "pending",
            created_by: user.id,
            hotel_id: userData?.hotel_id, // Required for multi-tenancy
            created_at: new Date().toISOString(),
          })

          if (error) throw error

          // Log activity
          await supabase.from("activity_logs").insert({
            user_id: user.id,
            action: "task_created",
            details: `Bellman created task: ${newTask.title}`,
            metadata: {
              task_title: newTask.title,
              room_number: newTask.room_number,
              ticket_number: newTask.ticket_number,
            },
          })

          toast.success("Task created successfully!")
          setIsCreateTaskOpen(false)
          setNewTask({
            title: "",
            description: "",
            room_number: "",
            guest_name: "",
            ticket_number: "",
            priority: "medium",
          })
          refreshTasks()
        } catch (error) {
          console.error("Error creating task:", error)
          toast.error("Failed to create task")
        }
      }

      performCreateTask()
    })
  }

  const assignTask = async (taskId: string, assigneeId: string) => {
    startTransition(() => {
      const performAssignTask = async () => {
        try {
          const { error } = await supabase
            .from("tasks")
            .update({
              assigned_to: assigneeId,
              status: "in_progress",
              updated_at: new Date().toISOString(),
            })
            .eq("id", taskId)

          if (error) throw error

          // Update assignee status to in_process if they're in_line
          const assignee = bellmen.find((b) => b.id === assigneeId)
          if (assignee && assignee.status === "in_line") {
            await supabase
              .from("users")
              .update({
                bellman_status: "in_process",
                updated_at: new Date().toISOString(),
              })
              .eq("id", assigneeId)
          }

          // Log activity
          const assigneeName = bellmen.find((b) => b.id === assigneeId)?.full_name || "Unknown"
          await supabase.from("activity_logs").insert({
            user_id: user.id,
            action: "task_assigned",
            details: `Task assigned to ${assigneeName}`,
            metadata: { task_id: taskId, assignee_id: assigneeId, assignee_name: assigneeName },
          })

          toast.success(`Task assigned to ${assigneeName}`)
          setIsAssignTaskOpen(false)
          setSelectedTaskForAssignment(null)
          refreshTasks()
          loadBellmenStatus()
        } catch (error) {
          console.error("Error assigning task:", error)
          toast.error("Failed to assign task")
        }
      }

      performAssignTask()
    })
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "urgent":
        return "bg-red-100 text-red-800 border-red-200"
      case "high":
        return "bg-orange-100 text-orange-800 border-orange-200"
      case "medium":
        return "bg-yellow-100 text-yellow-800 border-yellow-200"
      case "low":
        return "bg-green-100 text-green-800 border-green-200"
      default:
        return "bg-gray-100 text-gray-800 border-gray-200"
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "in_line":
        return "bg-green-100 text-green-800 border-green-200"
      case "in_process":
        return "bg-blue-100 text-blue-800 border-blue-200"
      case "off_duty":
        return "bg-gray-100 text-gray-800 border-gray-200"
      default:
        return "bg-gray-100 text-gray-800 border-gray-200"
    }
  }

  const TaskCard = ({ task, isMyTask = false }: { task: Task; isMyTask?: boolean }) => (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg font-semibold">{task.title}</CardTitle>
            <div className="flex items-center gap-2 mt-2">
              <Badge className={getPriorityColor(task.priority)}>{task.priority.toUpperCase()}</Badge>
              {task.room_number && (
                <div className="flex items-center text-sm text-gray-600">
                  <MapPin className="h-4 w-4 mr-1" />
                  Room {task.room_number}
                </div>
              )}
              {task.ticket_number && (
                <div className="flex items-center text-sm text-gray-600">Ticket {task.ticket_number}</div>
              )}
            </div>
          </div>
          <div className="text-right text-sm text-gray-500">
            <div className="flex items-center">
              <Clock className="h-4 w-4 mr-1" />
              {format(new Date(task.created_at), "HH:mm")}
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {task.description && <p className="text-gray-600 mb-3">{task.description}</p>}

        {task.guest_name && (
          <div className="flex items-center text-sm text-gray-600 mb-3">
            <UserIcon className="h-4 w-4 mr-1" />
            Guest: {task.guest_name}
          </div>
        )}

        <div className="flex items-center justify-between">
          <div className="text-xs text-gray-500">Created by {task.creator?.full_name || "System"}</div>

          {isMyTask ? (
            <Button
              onClick={() => completeTask(task.id)}
              disabled={isPending}
              size="sm"
              className="bg-green-600 hover:bg-green-700"
            >
              <CheckCircle className="h-4 w-4 mr-1" />
              Complete
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button onClick={() => takeTask(task.id)} disabled={isPending} size="sm">
                <ArrowRight className="h-4 w-4 mr-1" />
                Take Task
              </Button>
              <Button
                onClick={() => {
                  setSelectedTaskForAssignment(task.id)
                  setIsAssignTaskOpen(true)
                }}
                disabled={isPending}
                size="sm"
                variant="outline"
              >
                <UserPlus className="h-4 w-4 mr-1" />
                Assign
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Bellman Queue</h1>
          <p className="text-gray-600 mt-1">Manage your status, create tasks, and assign work</p>
        </div>
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-1 text-green-600">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-sm">Live Updates</span>
          </div>
          <Dialog open={isCreateTaskOpen} onOpenChange={setIsCreateTaskOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-1" />
                Create Task
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Task</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="task-type">Task Type</Label>
                  <Select value={newTask.title} onValueChange={(value) => setNewTask({ ...newTask, title: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select task type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Check In">Check In</SelectItem>
                      <SelectItem value="Check Out">Check Out</SelectItem>
                      <SelectItem value="Room Move">Room Move</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="guest-name">Guest Name</Label>
                  <Input
                    id="guest-name"
                    value={newTask.guest_name}
                    onChange={(e) => setNewTask({ ...newTask, guest_name: e.target.value })}
                    placeholder="Guest name"
                  />
                </div>

                <div>
                  <Label htmlFor="room-number">Room Number</Label>
                  <Input
                    id="room-number"
                    value={newTask.room_number}
                    onChange={(e) => setNewTask({ ...newTask, room_number: e.target.value })}
                    placeholder="e.g., 101"
                  />
                </div>

                <div>
                  <Label htmlFor="ticket-number">Ticket Number (Optional)</Label>
                  <Input
                    id="ticket-number"
                    value={newTask.ticket_number}
                    onChange={(e) => setNewTask({ ...newTask, ticket_number: e.target.value })}
                    placeholder="e.g., TKT-12345"
                  />
                </div>

                <div>
                  <Label htmlFor="priority">Priority</Label>
                  <Select
                    value={newTask.priority}
                    onValueChange={(value: any) => setNewTask({ ...newTask, priority: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="description">Description (Optional)</Label>
                  <Textarea
                    id="description"
                    value={newTask.description}
                    onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                    placeholder="Additional details..."
                  />
                </div>

                <div className="flex justify-end space-x-2">
                  <Button variant="outline" onClick={() => setIsCreateTaskOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={createTask} disabled={isPending}>
                    Create Task
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
          <Button onClick={refreshTasks} disabled={isPending} variant="outline">
            Refresh
          </Button>
        </div>
      </div>

      <Dialog open={isAssignTaskOpen} onOpenChange={setIsAssignTaskOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Task to Bellman</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-gray-600">Select a bellman to assign this task to:</p>
            <div className="space-y-2">
              {bellmen
                .filter((b) => b.status === "in_line" || b.status === "in_process")
                .map((bellman) => (
                  <Button
                    key={bellman.id}
                    variant="outline"
                    className="w-full justify-start bg-transparent"
                    onClick={() => selectedTaskForAssignment && assignTask(selectedTaskForAssignment, bellman.id)}
                    disabled={isPending}
                  >
                    <UserIcon className="h-4 w-4 mr-2" />
                    {bellman.full_name}
                    <Badge className={`ml-2 ${getStatusColor(bellman.status)}`}>
                      {bellman.status.replace("_", " ").toUpperCase()}
                    </Badge>
                    {bellman.id === user.id && " (You)"}
                  </Button>
                ))}
              {bellmen.filter((b) => b.status === "in_line" || b.status === "in_process").length === 0 && (
                <p className="text-sm text-gray-500 text-center py-4">No bellmen available for assignment</p>
              )}
            </div>
            <div className="flex justify-end">
              <Button variant="outline" onClick={() => setIsAssignTaskOpen(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Circle className="h-5 w-5 mr-2" />
            My Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-4">
            <div className="flex-1">
              <p className="text-sm text-gray-600 mb-2">Current Status:</p>
              <Badge className={getStatusColor(myStatus)}>{myStatus.replace("_", " ").toUpperCase()}</Badge>
            </div>
            <div className="flex-1">
              <p className="text-sm text-gray-600 mb-2">Change Status:</p>
              <Select value={myStatus} onValueChange={updateMyStatus}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="in_line">In Line</SelectItem>
                  <SelectItem value="in_process">In Process</SelectItem>
                  <SelectItem value="off_duty">Off Duty</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="mt-4 text-sm text-gray-600">
            <p>
              <strong>In Line:</strong> Available to take new tasks
            </p>
            <p>
              <strong>In Process:</strong> Currently working on tasks
            </p>
            <p>
              <strong>Off Duty:</strong> Not available for tasks
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Users className="h-5 w-5 mr-2" />
            All Bellmen Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <h4 className="font-medium text-green-700 mb-2">
                In Line ({bellmen.filter((b) => b.status === "in_line").length})
              </h4>
              <div className="space-y-1">
                {bellmen
                  .filter((b) => b.status === "in_line")
                  .map((bellman) => (
                    <div key={bellman.id} className="text-sm p-2 bg-green-50 rounded">
                      {bellman.full_name} {bellman.id === user.id && "(You)"}
                    </div>
                  ))}
                {bellmen.filter((b) => b.status === "in_line").length === 0 && (
                  <p className="text-sm text-gray-500">No one in line</p>
                )}
              </div>
            </div>

            <div>
              <h4 className="font-medium text-blue-700 mb-2">
                In Process ({bellmen.filter((b) => b.status === "in_process").length})
              </h4>
              <div className="space-y-1">
                {bellmen
                  .filter((b) => b.status === "in_process")
                  .map((bellman) => (
                    <div key={bellman.id} className="text-sm p-2 bg-blue-50 rounded">
                      {bellman.full_name} {bellman.id === user.id && "(You)"}
                    </div>
                  ))}
                {bellmen.filter((b) => b.status === "in_process").length === 0 && (
                  <p className="text-sm text-gray-500">No one processing</p>
                )}
              </div>
            </div>

            <div>
              <h4 className="font-medium text-gray-700 mb-2">
                Off Duty ({bellmen.filter((b) => b.status === "off_duty").length})
              </h4>
              <div className="space-y-1">
                {bellmen
                  .filter((b) => b.status === "off_duty")
                  .map((bellman) => (
                    <div key={bellman.id} className="text-sm p-2 bg-gray-50 rounded">
                      {bellman.full_name} {bellman.id === user.id && "(You)"}
                    </div>
                  ))}
                {bellmen.filter((b) => b.status === "off_duty").length === 0 && (
                  <p className="text-sm text-gray-500">Everyone is on duty</p>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <Bell className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Available Tasks</p>
                <p className="text-2xl font-bold text-gray-900">{availableTasks.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <Timer className="h-8 w-8 text-orange-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">My Active Tasks</p>
                <p className="text-2xl font-bold text-gray-900">{myTasks.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <AlertCircle className="h-8 w-8 text-red-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Urgent Tasks</p>
                <p className="text-2xl font-bold text-gray-900">
                  {availableTasks.filter((t) => t.priority === "urgent").length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Available Tasks Queue */}
        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Available Tasks</h2>
          {myStatus !== "in_line" && (
            <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm text-yellow-800">You must be "In Line" to take tasks. Change your status above.</p>
            </div>
          )}
          <div className="space-y-4">
            {availableTasks.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <Bell className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">No tasks available in the queue</p>
                </CardContent>
              </Card>
            ) : (
              availableTasks.map((task) => <TaskCard key={task.id} task={task} />)
            )}
          </div>
        </div>

        {/* My Active Tasks */}
        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-4">My Active Tasks</h2>
          <div className="space-y-4">
            {myTasks.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <CheckCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">No active tasks</p>
                  <p className="text-sm text-gray-400 mt-1">Take a task from the queue to get started</p>
                </CardContent>
              </Card>
            ) : (
              myTasks.map((task) => <TaskCard key={task.id} task={task} isMyTask />)
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
