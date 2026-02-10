"use client"

import { useState, useEffect, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"
import { Wifi, WifiOff } from "lucide-react"

interface Task {
  id: string
  title: string
  description: string
  room_number?: string
  created_at: string
  creator?: { full_name: string; role: string }
  assigned_user?: { full_name: string }
  guest_name?: string
  ticket_number?: string
  status?: string
  assigned_to?: string
}

interface Bellman {
  id: string
  full_name: string
  bellman_status: "in_line" | "in_process" | "off_duty"
}

interface SimpleBellmanQueueProps {
  pendingTasks: Task[]
  allBellmen: Bellman[]
  inProgressTasks: Task[]
  currentUser: {
    id: string
    hotel_id?: string
    role: string
  }
}

interface LocalBellman {
  id: string
  name: string
  status: string
  taskType?: string
  roomNumber?: string
  guestName?: string
  ticketNumber?: string
  assignedTaskId?: string
}

export function SimpleBellmanQueueV2({ pendingTasks, allBellmen, inProgressTasks: initialInProgressTasks, currentUser }: SimpleBellmanQueueProps) {
  const [newBellmanName, setNewBellmanName] = useState("")
  // Track in-progress tasks with state so they update in real-time
  const [currentInProgressTasks, setCurrentInProgressTasks] = useState<Task[]>(initialInProgressTasks)
  const [currentPendingTasks, setCurrentPendingTasks] = useState<Task[]>(pendingTasks)
  const [showAssignDialog, setShowAssignDialog] = useState(false)
  const [showCompletionDialog, setShowCompletionDialog] = useState(false)
  const [showTaskAssignDialog, setShowTaskAssignDialog] = useState(false)
  const [showRemoveDialog, setShowRemoveDialog] = useState(false)
  const [showPositionDialog, setShowPositionDialog] = useState(false)
  const [completionType, setCompletionType] = useState<"completed" | "cancelled" | "empty_room" | null>(null)
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [selectedBellman, setSelectedBellman] = useState<Bellman | null>(null)
  const [selectedAssignee, setSelectedAssignee] = useState("")
  const [taskType, setTaskType] = useState("")
  const [roomNumber, setRoomNumber] = useState("")
  const [fromRoom, setFromRoom] = useState("")
  const [toRoom, setToRoom] = useState("")
  const [description, setDescription] = useState("")
  const [guestName, setGuestName] = useState("")
  const [ticketNumber, setTicketNumber] = useState("")
  const [isRealtimeConnected, setIsRealtimeConnected] = useState(false)
  const [localBellmen, setLocalBellmen] = useState<LocalBellman[]>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("localBellmen")
      return saved ? JSON.parse(saved) : []
    }
    return []
  })
  const [assignedTaskIds, setAssignedTaskIds] = useState<Set<string>>(new Set())

  const supabase = createClient()
  const inLineBellmen = allBellmen.filter((b) => b.bellman_status === "in_line")
  const inProcessBellmen = allBellmen.filter((b) => b.bellman_status === "in_process")

  const availablePendingTasks = currentPendingTasks.filter((task) => !assignedTaskIds.has(task.id))

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("localBellmen", JSON.stringify(localBellmen))
    }
  }, [localBellmen])

  // Use Supabase Realtime instead of polling
  useEffect(() => {
    const channel = supabase
      .channel("bellman-queue-tasks")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "tasks",
        },
        async (payload) => {
          if (payload.eventType === "INSERT") {
            const newTask = payload.new as Task
            if (newTask.status === "pending") {
              setCurrentPendingTasks((prev) => [newTask, ...prev])
            } else if (newTask.status === "in_progress") {
              setCurrentInProgressTasks((prev) => [newTask, ...prev])
            }
          } else if (payload.eventType === "UPDATE") {
            const updatedTask = payload.new as Task
            // Handle status changes
            if (updatedTask.status === "in_progress") {
              setCurrentPendingTasks((prev) => prev.filter((t) => t.id !== updatedTask.id))
              setCurrentInProgressTasks((prev) => {
                const exists = prev.find((t) => t.id === updatedTask.id)
                if (exists) {
                  return prev.map((t) => (t.id === updatedTask.id ? updatedTask : t))
                }
                return [updatedTask, ...prev]
              })
            } else if (updatedTask.status === "pending") {
              setCurrentInProgressTasks((prev) => prev.filter((t) => t.id !== updatedTask.id))
              setCurrentPendingTasks((prev) => {
                const exists = prev.find((t) => t.id === updatedTask.id)
                if (exists) {
                  return prev.map((t) => (t.id === updatedTask.id ? updatedTask : t))
                }
                return [updatedTask, ...prev]
              })
            } else {
              // Task completed, cancelled, or empty_room - remove from both lists
              setCurrentPendingTasks((prev) => prev.filter((t) => t.id !== updatedTask.id))
              setCurrentInProgressTasks((prev) => prev.filter((t) => t.id !== updatedTask.id))
            }
          } else if (payload.eventType === "DELETE") {
            const deletedId = (payload.old as { id: string }).id
            setCurrentPendingTasks((prev) => prev.filter((t) => t.id !== deletedId))
            setCurrentInProgressTasks((prev) => prev.filter((t) => t.id !== deletedId))
          }
        }
      )
      .subscribe((status) => {
        setIsRealtimeConnected(status === "SUBSCRIBED")
      })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase])

  const addBellmanToLine = () => {
    if (!newBellmanName.trim()) {
      toast.error("Please enter a bellman name")
      return
    }

    const newBellman: LocalBellman = {
      id: Date.now().toString(),
      name: newBellmanName.trim(),
      status: "in_line",
    }

    setLocalBellmen((prev) => [...prev, newBellman])
    setNewBellmanName("")
    toast.success(`${newBellmanName} added to line`)
  }

  const logActivity = async (
    bellmanName: string,
    taskType: string,
    roomNumber: string,
    status: string,
    guestName?: string,
    ticketNumber?: string,
  ) => {
    try {
      const taskIdentifier = `${taskType}-${roomNumber}-${guestName || "no-guest"}`

      const { data: existingLogs, error: fetchError } = await supabase
        .from("activity_logs")
        .select("*")
        .eq("task_type", taskType)
        .eq("room_number", roomNumber)
        .eq("guest_name", guestName || null)
        .eq("bellman_name", bellmanName)
        .order("timestamp", { ascending: false })
        .limit(1)

      if (fetchError) throw fetchError

      if (existingLogs && existingLogs.length > 0 && status !== "assigned") {
        const { error: updateError } = await supabase
          .from("activity_logs")
          .update({
            status: status,
            timestamp: new Date().toISOString(),
          })
          .eq("id", existingLogs[0].id)

        if (updateError) throw updateError
      } else {
        const { error: insertError } = await supabase.from("activity_logs").insert({
          bellman_name: bellmanName,
          task_type: taskType,
          room_number: roomNumber,
          status: status,
          guest_name: guestName || null,
          ticket_number: ticketNumber || null,
          timestamp: new Date().toISOString(),
          hotel_id: currentUser.hotel_id, // Required for multi-tenancy RLS
        })

        if (insertError) throw insertError
      }
    } catch (error) {
      console.error("Failed to log activity:", error)
      toast.error("Failed to log activity - check console for details")
    }
  }

  const assignTaskToBellman = async () => {
    if (!selectedTask || !selectedAssignee) {
      toast.error("Please select a task and bellman")
      return
    }

    try {
      const isLocalBellman = localBellmen.some((b) => b.id === selectedAssignee)

      if (isLocalBellman) {
        const bellman = localBellmen.find((b) => b.id === selectedAssignee)!

        // Update the database task to in_progress so the manager sees the status change
        const { error: taskError } = await supabase
          .from("tasks")
          .update({ status: "in_progress" })
          .eq("id", selectedTask.id)

        if (taskError) throw taskError

        setLocalBellmen((prev) =>
          prev.map((b) =>
            b.id === selectedAssignee
              ? {
                  ...b,
                  status: "in_process",
                  taskType: selectedTask.title,
                  roomNumber: selectedTask.room_number || "N/A",
                  guestName: selectedTask.guest_name,
                  ticketNumber: selectedTask.ticket_number,
                  assignedTaskId: selectedTask.id,
                }
              : b,
          ),
        )
        await logActivity(
          bellman.name,
          selectedTask.title,
          selectedTask.room_number || "N/A",
          "assigned",
          selectedTask.guest_name,
          selectedTask.ticket_number,
        )
        toast.success("Task assigned to temporary bellman successfully")
      } else {
        const { error: taskError } = await supabase
          .from("tasks")
          .update({
            assigned_to: selectedAssignee,
            status: "in_progress",
          })
          .eq("id", selectedTask.id)

        if (taskError) throw taskError

        const { error: statusError } = await supabase
          .from("users")
          .update({ bellman_status: "in_process" })
          .eq("id", selectedAssignee)

        if (statusError) throw statusError

        const bellman = allBellmen.find((b) => b.id === selectedAssignee)!
        await logActivity(
          bellman.full_name,
          selectedTask.title,
          selectedTask.room_number || "N/A",
          "assigned",
          selectedTask.guest_name,
          selectedTask.ticket_number,
        )

        toast.success("Task assigned successfully")
        window.location.reload()
      }

      setAssignedTaskIds((prev) => new Set([...prev, selectedTask.id]))
      setShowAssignDialog(false)
      setSelectedTask(null)
      setSelectedAssignee("")
    } catch (error) {
      console.error("Error assigning task:", error)
      toast.error("Failed to assign task")
    }
  }

  const assignNewTaskToBellman = async () => {
    if (!selectedBellman || !taskType) {
      toast.error("Please fill in all required fields")
      return
    }

    try {
      const isLocalBellman = localBellmen.some((b) => b.id === selectedBellman.id)

      // Determine the final room number based on task type
      let finalRoomNumber = roomNumber
      if (taskType === "Room Move") {
        finalRoomNumber = `${fromRoom} → ${toRoom}`
      }

      // Determine the task title and description
      const taskTitle = taskType
      let taskDescription = description || ""

      if (taskType === "Room Move") {
        taskDescription = `Move from room ${fromRoom} to room ${toRoom}${description ? `. ${description}` : ""}`
      }

      if (isLocalBellman) {
        const bellman = localBellmen.find((b) => b.id === selectedBellman.id)!

        // Create the task in the database so the manager can see it
        const {
          data: { user },
        } = await supabase.auth.getUser()

        if (!user) throw new Error("User not authenticated")

        const { data: newTask, error: createError } = await supabase
          .from("tasks")
          .insert({
            title: taskTitle,
            description: taskDescription,
            room_number: finalRoomNumber,
            guest_name: guestName || null,
            ticket_number: ticketNumber || null,
            created_by: user.id,
            status: "in_progress",
            hotel_id: currentUser.hotel_id,
          })
          .select()
          .single()

        if (createError) throw createError

        setLocalBellmen((prev) =>
          prev.map((b) =>
            b.id === selectedBellman.id
              ? {
                  ...b,
                  status: "in_process",
                  taskType: taskTitle,
                  roomNumber: finalRoomNumber || "N/A",
                  guestName: guestName || undefined,
                  ticketNumber: ticketNumber || undefined,
                  assignedTaskId: newTask.id,
                }
              : b,
          ),
        )

        await logActivity(
          bellman.name,
          taskTitle,
          finalRoomNumber || "N/A",
          "assigned",
          guestName || undefined,
          ticketNumber || undefined,
        )

        toast.success("Task assigned to temporary bellman successfully")
      } else {
        // For database bellmen, create a task in the database first
        const {
          data: { user },
        } = await supabase.auth.getUser()

        if (!user) {
          throw new Error("User not authenticated")
        }

        // Create the task in the database with hotel_id for multi-tenancy
        const { data: newTask, error: createError } = await supabase
          .from("tasks")
          .insert({
            title: taskTitle,
            description: taskDescription,
            room_number: finalRoomNumber,
            guest_name: guestName || null,
            ticket_number: ticketNumber || null,
            created_by: user.id,
            assigned_to: selectedBellman.id,
            status: "in_progress",
            hotel_id: currentUser.hotel_id, // Required for multi-tenancy
          })
          .select()
          .single()

        if (createError) throw createError

        // Update bellman status to in_process
        const { error: statusError } = await supabase
          .from("users")
          .update({ bellman_status: "in_process" })
          .eq("id", selectedBellman.id)

        if (statusError) throw statusError

        await logActivity(
          selectedBellman.full_name,
          taskTitle,
          finalRoomNumber || "N/A",
          "assigned",
          guestName || undefined,
          ticketNumber || undefined,
        )

        toast.success("Task assigned successfully")
        window.location.reload()
      }

      // Reset form
      setShowTaskAssignDialog(false)
      setSelectedBellman(null)
      setTaskType("")
      setRoomNumber("")
      setFromRoom("")
      setToRoom("")
      setDescription("")
      setGuestName("")
      setTicketNumber("")
    } catch (error) {
      console.error("Error assigning task:", error)
      toast.error("Failed to assign task - check console for details")
    }
  }

  const handleCompletionChoice = (type: "completed" | "cancelled" | "empty_room") => {
    setCompletionType(type)
    if (type === "completed") {
      completeTask(type, "bottom")
    } else {
      setShowCompletionDialog(false)
      setShowPositionDialog(true)
    }
  }

  const completeTask = async (completionType: "completed" | "cancelled" | "empty_room", position: "top" | "bottom") => {
    if (!selectedBellman) return

    try {
      const isLocalBellman = localBellmen.some((b) => b.id === selectedBellman.id)

      if (isLocalBellman) {
        const bellman = localBellmen.find((b) => b.id === selectedBellman.id)!

        // Update the database task if this local bellman was assigned one
        if (bellman.assignedTaskId) {
          const taskId = bellman.assignedTaskId
          const updatePayload: Record<string, string> = { status: completionType }
          if (completionType === "completed" || completionType === "cancelled" || completionType === "empty_room") {
            updatePayload.completed_at = new Date().toISOString()
          }

          const { error: taskError } = await supabase
            .from("tasks")
            .update(updatePayload)
            .eq("id", taskId)

          if (taskError) throw taskError
        }

        if (position === "top") {
          setLocalBellmen((prev) => {
            const updatedBellman = {
              ...bellman,
              status: "in_line",
              taskType: undefined,
              roomNumber: undefined,
              guestName: undefined,
              ticketNumber: undefined,
              assignedTaskId: undefined,
            }
            const otherBellmen = prev.filter((b) => b.id !== selectedBellman.id && b.status === "in_line")
            const inProcessBellmen = prev.filter((b) => b.status === "in_process" && b.id !== selectedBellman.id)
            return [updatedBellman, ...otherBellmen, ...inProcessBellmen]
          })
        } else {
          setLocalBellmen((prev) => {
            const updatedBellman = {
              ...bellman,
              status: "in_line",
              taskType: undefined,
              roomNumber: undefined,
              guestName: undefined,
              ticketNumber: undefined,
              assignedTaskId: undefined,
            }
            const inLineBellmen = prev.filter((b) => b.status === "in_line")
            const inProcessBellmen = prev.filter((b) => b.status === "in_process" && b.id !== selectedBellman.id)
            return [...inLineBellmen, updatedBellman, ...inProcessBellmen]
          })
        }

        await logActivity(
          bellman.name,
          bellman.taskType || "Unknown",
          bellman.roomNumber || "N/A",
          completionType,
          bellman.guestName,
          bellman.ticketNumber,
        )
        toast.success(`Task ${completionType} - ${selectedBellman.full_name} moved to ${position} of line`)
      } else {
        const currentTask = currentInProgressTasks.find((task) => task.assigned_to === selectedBellman.id)

        if (currentTask) {
          // Build the update payload - include completed_at for terminal statuses
          const updatePayload: Record<string, string> = { status: completionType }
          if (completionType === "completed" || completionType === "cancelled" || completionType === "empty_room") {
            updatePayload.completed_at = new Date().toISOString()
          }

          const { error: taskError } = await supabase
            .from("tasks")
            .update(updatePayload)
            .eq("id", currentTask.id)
            .select()

          if (taskError) {
            throw taskError
          }
        }

        const { error: statusError } = await supabase
          .from("users")
          .update({ bellman_status: "in_line" })
          .eq("id", selectedBellman.id)

        if (statusError) {
          throw statusError
        }

        if (currentTask) {
          await logActivity(
            selectedBellman.full_name,
            currentTask.title,
            currentTask.room_number || "N/A",
            completionType,
            currentTask.guest_name,
            currentTask.ticket_number,
          )
        }

        toast.success(`Task ${completionType} - ${selectedBellman.full_name} back in line`)
      }

      setShowCompletionDialog(false)
      setShowPositionDialog(false)
      setSelectedBellman(null)
      setCompletionType(null)
    } catch (error) {
      console.error("Error completing task:", error)
      toast.error("Failed to complete task")
    }
  }

  const removeBellman = (bellmanId: string) => {
    const bellmanToRemove = localBellmen.find((b) => b.id === bellmanId)
    setLocalBellmen((prev) => prev.filter((b) => b.id !== bellmanId))
    toast.success(`${bellmanToRemove?.name} removed from line`)
  }

  return (
    <div className="p-6">
      {/* Connection Status */}
      <div className="flex justify-end mb-4">
        {isRealtimeConnected ? (
          <div className="flex items-center gap-2 text-green-600 text-sm">
            <Wifi className="h-4 w-4" />
            <span>Live</span>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-yellow-600 text-sm">
            <WifiOff className="h-4 w-4" />
            <span>Connecting...</span>
          </div>
        )}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Pending Tasks */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span>Pending Tasks ({availablePendingTasks.length})</span>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 max-h-[calc(100vh-200px)] overflow-y-auto">
            {availablePendingTasks.map((task) => (
              <div key={task.id} className="p-3 border rounded-lg bg-white">
                <div className="flex items-start justify-between mb-2">
                  <h4 className="font-medium">{task.title}</h4>
                </div>
                {task.room_number && <p className="text-sm text-gray-600 mb-1">Room: {task.room_number}</p>}
                {task.guest_name && <p className="text-sm text-gray-600 mb-1">Guest: {task.guest_name}</p>}
                {task.ticket_number && <p className="text-sm text-gray-600 mb-1">Ticket: {task.ticket_number}</p>}
                <p className="text-sm text-gray-600 mb-2">{task.description}</p>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">From: {task.creator?.full_name || "System"}</span>
                  <Button
                    size="sm"
                    onClick={() => {
                      setSelectedTask(task)
                      setShowAssignDialog(true)
                    }}
                  >
                    Assign Next
                  </Button>
                </div>
              </div>
            ))}
            {availablePendingTasks.length === 0 && <p className="text-gray-500 text-center py-8">No pending tasks</p>}
          </CardContent>
        </Card>

        {/* In Line */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span>⏳</span>
                In Line ({inLineBellmen.length + localBellmen.filter((b) => b.status === "in_line").length})
              </div>
              {inLineBellmen.length + localBellmen.filter((b) => b.status === "in_line").length > 0 && (
                <Button size="sm" variant="outline" onClick={() => setShowRemoveDialog(true)}>
                  Remove Bellman
                </Button>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 max-h-[calc(100vh-200px)] overflow-y-auto">
            <div className="flex gap-2">
              <Input
                placeholder="Add bellman name"
                value={newBellmanName}
                onChange={(e) => setNewBellmanName(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && addBellmanToLine()}
              />
              <Button onClick={addBellmanToLine}>Add</Button>
            </div>

            {/* Local bellmen */}
            {localBellmen
              .filter((b) => b.status === "in_line")
              .map((bellman, index) => (
                <div key={bellman.id} className="p-3 border rounded-lg bg-green-50">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <button
                        className="w-full text-left p-2 hover:bg-green-100 rounded transition-colors"
                        onClick={() => {
                          const bellmanForAssignment: Bellman = {
                            id: bellman.id,
                            full_name: bellman.name,
                            bellman_status: "in_line",
                          }
                          setSelectedBellman(bellmanForAssignment)
                          setShowTaskAssignDialog(true)
                        }}
                      >
                        <span className="font-medium">
                          #{index + 1} {bellman.name}
                        </span>
                        <span className="text-xs text-gray-500 ml-2">(Temporary)</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}

            {/* Database bellmen */}
            {inLineBellmen.map((bellman, index) => (
              <div key={bellman.id} className="p-3 border rounded-lg bg-blue-50">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <button
                      className="w-full text-left p-2 hover:bg-blue-100 rounded transition-colors"
                      onClick={() => {
                        setSelectedBellman(bellman)
                        setShowTaskAssignDialog(true)
                      }}
                    >
                      <span className="font-medium">
                        #{index + localBellmen.filter((b) => b.status === "in_line").length + 1} {bellman.full_name}
                      </span>
                    </button>
                  </div>
                </div>
              </div>
            ))}

            {inLineBellmen.length + localBellmen.filter((b) => b.status === "in_line").length === 0 && (
              <p className="text-gray-500 text-center py-8">No bellmen in line</p>
            )}
          </CardContent>
        </Card>

        {/* In Process */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span>🔄</span>
              In Process ({inProcessBellmen.length + localBellmen.filter((b) => b.status === "in_process").length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 max-h-[calc(100vh-200px)] overflow-y-auto">
            {localBellmen
              .filter((b) => b.status === "in_process")
              .map((bellman) => (
                <div key={bellman.id} className="p-3 border rounded-lg bg-orange-50">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <button
                        className="w-full text-left p-2 hover:bg-orange-100 rounded transition-colors"
                        onClick={() => {
                          const bellmanForCompletion: Bellman = {
                            id: bellman.id,
                            full_name: bellman.name,
                            bellman_status: "in_process",
                          }
                          setSelectedBellman(bellmanForCompletion)
                          setShowCompletionDialog(true)
                        }}
                      >
                        <div className="font-medium">
                          {bellman.name} <span className="text-xs text-gray-500">(Temporary)</span>
                        </div>
                        <div className="text-sm text-gray-600 mt-1">
                          <p>Task: {bellman.taskType || "N/A"}</p>
                          <p>Room: {bellman.roomNumber || "N/A"}</p>
                          {bellman.guestName && <p>Guest: {bellman.guestName}</p>}
                          {bellman.ticketNumber && <p>Ticket: {bellman.ticketNumber}</p>}
                        </div>
                      </button>
                    </div>
                  </div>
                </div>
              ))}

            {inProcessBellmen.map((bellman) => {
              const currentTask = currentInProgressTasks.find((task) => task.assigned_to === bellman.id)
              return (
                <div key={bellman.id} className="p-3 border rounded-lg bg-orange-50">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <button
                        className="w-full text-left p-2 hover:bg-orange-100 rounded transition-colors"
                        onClick={() => {
                          setSelectedBellman(bellman)
                          setShowCompletionDialog(true)
                        }}
                      >
                        <div className="font-medium">{bellman.full_name}</div>
                        {currentTask && (
                          <div className="text-sm text-gray-600 mt-1">
                            <p>Task: {currentTask.title}</p>
                            <p>Room: {currentTask.room_number || "N/A"}</p>
                            {currentTask.guest_name && <p>Guest: {currentTask.guest_name}</p>}
                            {currentTask.ticket_number && <p>Ticket: {currentTask.ticket_number}</p>}
                          </div>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
            {inProcessBellmen.length + localBellmen.filter((b) => b.status === "in_process").length === 0 && (
              <p className="text-gray-500 text-center py-8">No bellmen in process</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Dialogs */}
      <Dialog open={showAssignDialog} onOpenChange={setShowAssignDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Task</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p>Which bellman should be assigned this task?</p>
            <Select value={selectedAssignee} onValueChange={setSelectedAssignee}>
              <SelectTrigger>
                <SelectValue placeholder="Select a bellman" />
              </SelectTrigger>
              <SelectContent>
                {localBellmen
                  .filter((b) => b.status === "in_line")
                  .map((bellman, index) => (
                    <SelectItem key={bellman.id} value={bellman.id}>
                      #{index + 1} {bellman.name} <span className="text-xs text-gray-500">(Temporary)</span>
                    </SelectItem>
                  ))}
                {inLineBellmen.map((bellman, index) => (
                  <SelectItem key={bellman.id} value={bellman.id}>
                    #{index + localBellmen.filter((b) => b.status === "in_line").length + 1} {bellman.full_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex gap-2">
              <Button onClick={assignTaskToBellman} disabled={!selectedAssignee}>
                Assign Task
              </Button>
              <Button variant="outline" onClick={() => setShowAssignDialog(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showCompletionDialog} onOpenChange={setShowCompletionDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Complete Task - {selectedBellman?.full_name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p>How was this task completed?</p>
            <div className="space-y-2">
              <Button className="w-full" onClick={() => handleCompletionChoice("completed")}>
                Task Completed
              </Button>
              <Button
                className="w-full bg-transparent"
                variant="outline"
                onClick={() => handleCompletionChoice("cancelled")}
              >
                Task Cancelled
              </Button>
              <Button
                className="w-full bg-transparent"
                variant="outline"
                onClick={() => handleCompletionChoice("empty_room")}
              >
                Empty Room
              </Button>
            </div>
            <Button variant="outline" onClick={() => setShowCompletionDialog(false)}>
              Cancel
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showTaskAssignDialog} onOpenChange={setShowTaskAssignDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Task to {selectedBellman?.full_name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Task Type *</label>
              <Select value={taskType} onValueChange={setTaskType}>
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

            {taskType === "Room Move" && (
              <>
                <div>
                  <label className="block text-sm font-medium mb-2">From Room *</label>
                  <Input
                    placeholder="Enter room number"
                    value={fromRoom}
                    onChange={(e) => setFromRoom(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">To Room *</label>
                  <Input placeholder="Enter room number" value={toRoom} onChange={(e) => setToRoom(e.target.value)} />
                </div>
              </>
            )}

            {(taskType === "Check In" || taskType === "Check Out") && (
              <div>
                <label className="block text-sm font-medium mb-2">Room Number</label>
                <Input
                  placeholder="Enter room number"
                  value={roomNumber}
                  onChange={(e) => setRoomNumber(e.target.value)}
                />
              </div>
            )}

            {taskType === "Other" && (
              <div>
                <label className="block text-sm font-medium mb-2">Room Number (Optional)</label>
                <Input
                  placeholder="Enter room number (optional)"
                  value={roomNumber}
                  onChange={(e) => setRoomNumber(e.target.value)}
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium mb-2">Guest Name (Optional)</label>
              <Input placeholder="Enter guest name" value={guestName} onChange={(e) => setGuestName(e.target.value)} />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Ticket Number (Optional)</label>
              <Input
                placeholder="Enter ticket number"
                value={ticketNumber}
                onChange={(e) => setTicketNumber(e.target.value)}
              />
            </div>

            {taskType && (
              <div>
                <label className="block text-sm font-medium mb-2">Description (Optional)</label>
                <Textarea
                  placeholder="Add any additional details..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
            )}

            <div className="flex gap-2">
              <Button
                onClick={assignNewTaskToBellman}
                disabled={!taskType || (taskType === "Room Move" && (!fromRoom || !toRoom))}
              >
                Assign Task
              </Button>
              <Button variant="outline" onClick={() => setShowTaskAssignDialog(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showRemoveDialog} onOpenChange={setShowRemoveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove Bellman</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p>Click on bellmen to remove them from the line. You can remove multiple bellmen.</p>
            <div className="space-y-2">
              {localBellmen
                .filter((b) => b.status === "in_line")
                .map((bellman, index) => (
                  <Button
                    key={bellman.id}
                    variant="outline"
                    className="w-full justify-start bg-transparent hover:bg-red-50 hover:border-red-300"
                    onClick={() => removeBellman(bellman.id)}
                  >
                    ✕ #{index + 1} {bellman.name} <span className="text-xs text-gray-500">(Temporary)</span>
                  </Button>
                ))}
              {inLineBellmen.map((bellman, index) => (
                <Button
                  key={bellman.id}
                  variant="outline"
                  className="w-full justify-start bg-transparent hover:bg-red-50 hover:border-red-300"
                  onClick={() => {
                    toast.info("Database bellmen removal not implemented yet")
                  }}
                >
                  ✕ #{index + localBellmen.filter((b) => b.status === "in_line").length + 1} {bellman.full_name}
                </Button>
              ))}
              {localBellmen.filter((b) => b.status === "in_line").length === 0 && inLineBellmen.length === 0 && (
                <p className="text-gray-500 text-center py-4">No bellmen available to remove</p>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setShowRemoveDialog(false)} className="w-full">
                Done
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showPositionDialog} onOpenChange={setShowPositionDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Position in Line - {selectedBellman?.full_name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p>Where should {selectedBellman?.full_name} be placed in the line?</p>
            <div className="space-y-2">
              <Button className="w-full" onClick={() => completeTask(completionType!, "top")}>
                Top of Line (Next in queue)
              </Button>
              <Button
                className="w-full bg-transparent"
                variant="outline"
                onClick={() => completeTask(completionType!, "bottom")}
              >
                Bottom of Line (End of queue)
              </Button>
            </div>
            <Button
              variant="outline"
              onClick={() => {
                setShowPositionDialog(false)
                setShowCompletionDialog(true)
              }}
            >
              Back
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
