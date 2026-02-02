"use client"

import { useState, useTransition } from "react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Clock, UserIcon, MapPin, Calendar, Play, Pause, CheckCircle } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { format } from "date-fns"

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

interface CurrentUser {
  id: string
  full_name: string
  role: "admin" | "manager" | "operator" | "bell_staff" | "bellman"
  email: string
  hotel_id?: string
}

interface TaskCardProps {
  task: Task
  currentUser: CurrentUser
  onTaskUpdate: (updater: (tasks: Task[]) => Task[]) => void
}

export function TaskCard({ task, currentUser, onTaskUpdate }: TaskCardProps) {
  const [isUpdating, setIsUpdating] = useState(false)
  const [isPending, startTransition] = useTransition()

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
      case "pending":
        return "bg-gray-100 text-gray-800"
      case "in_progress":
        return "bg-blue-100 text-blue-800"
      case "completed":
        return "bg-green-100 text-green-800"
      case "cancelled":
        return "bg-red-100 text-red-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "maintenance":
        return "🔧"
      case "housekeeping":
        return "🧹"
      case "guest_service":
        return "🛎️"
      case "delivery":
        return "📦"
      default:
        return "📋"
    }
  }

  const canUpdateTask = () => {
    return (
      currentUser.id === task.created_by ||
      currentUser.id === task.assigned_to ||
      ["admin", "manager", "operator"].includes(currentUser.role)
    )
  }

  const canTakeTask = () => {
    return !task.assigned_to && task.status === "pending" && ["bell_staff", "bellman"].includes(currentUser.role)
  }

  const updateTaskStatus = async (newStatus: string) => {
    if (!canUpdateTask() && newStatus !== "in_progress") return

    setIsUpdating(true)

    startTransition(async () => {
      const supabase = createClient()

      try {
        const updateData: {
          status: string
          updated_at: string
          completed_at?: string
          assigned_to?: string
        } = {
          status: newStatus,
          updated_at: new Date().toISOString(),
        }

        if (newStatus === "completed") {
          updateData.completed_at = new Date().toISOString()
        }

        if (newStatus === "in_progress" && !task.assigned_to) {
          updateData.assigned_to = currentUser.id
        }

        const { error } = await supabase.from("tasks").update(updateData).eq("id", task.id)

        if (error) throw error

        onTaskUpdate((tasks) =>
          tasks.map((t) =>
            t.id === task.id
              ? {
                  ...t,
                  status: newStatus as Task["status"],
                  assigned_to: updateData.assigned_to || t.assigned_to,
                  completed_at: updateData.completed_at || t.completed_at,
                  updated_at: updateData.updated_at,
                }
              : t,
          ),
        )

        await supabase.from("activity_logs").insert({
          task_id: task.id,
          user_id: currentUser.id,
          action: "status_changed",
          old_value: task.status,
          new_value: newStatus,
          description: `Status changed from ${task.status} to ${newStatus}`,
          hotel_id: currentUser.hotel_id, // Required for multi-tenancy RLS
        })
      } catch (error) {
        console.error("Error updating task:", error)
      } finally {
        setIsUpdating(false)
      }
    })
  }

  const takeTask = async () => {
    await updateTaskStatus("in_progress")
  }

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h3 className="font-semibold text-lg leading-tight mb-2">{task.title}</h3>
            <div className="flex flex-wrap gap-2">
              <Badge className={getPriorityColor(task.priority)}>{task.priority.toUpperCase()}</Badge>
              <Badge className={getStatusColor(task.status)}>{task.status.replace("_", " ").toUpperCase()}</Badge>
              <Badge variant="outline">
                {getCategoryIcon(task.category)} {task.category.replace("_", " ")}
              </Badge>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {task.description && <p className="text-sm text-gray-600 line-clamp-2">{task.description}</p>}

        <div className="space-y-2 text-sm text-gray-600">
          {task.room_number && (
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              <span>Room {task.room_number}</span>
            </div>
          )}
          {task.guest_name && (
            <div className="flex items-center gap-2">
              <UserIcon className="h-4 w-4" />
              <span>{task.guest_name}</span>
            </div>
          )}
          {task.due_date && (
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              <span>Due: {format(new Date(task.due_date), "MMM d, h:mm a")}</span>
            </div>
          )}
          {task.estimated_duration && (
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              <span>{task.estimated_duration} minutes</span>
            </div>
          )}
          {task.assigned_user && (
            <div className="flex items-center gap-2">
              <UserIcon className="h-4 w-4" />
              <span>Assigned to: {task.assigned_user.full_name}</span>
            </div>
          )}
        </div>

        <div className="flex gap-2 pt-2">
          {canTakeTask() && (
            <Button size="sm" onClick={takeTask} disabled={isUpdating} className="flex-1">
              <Play className="h-4 w-4 mr-1" />
              Take Task
            </Button>
          )}

          {canUpdateTask() && task.status === "pending" && task.assigned_to && (
            <Button size="sm" onClick={() => updateTaskStatus("in_progress")} disabled={isUpdating}>
              <Play className="h-4 w-4 mr-1" />
              Start
            </Button>
          )}

          {canUpdateTask() && task.status === "in_progress" && (
            <>
              <Button
                size="sm"
                onClick={() => updateTaskStatus("completed")}
                disabled={isUpdating}
                className="bg-green-600 hover:bg-green-700"
              >
                <CheckCircle className="h-4 w-4 mr-1" />
                Complete
              </Button>
              <Button size="sm" variant="outline" onClick={() => updateTaskStatus("pending")} disabled={isUpdating}>
                <Pause className="h-4 w-4 mr-1" />
                Pause
              </Button>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
