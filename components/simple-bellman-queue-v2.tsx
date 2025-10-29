"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"

interface Task {
  id: string
  title: string
  description: string
  status?: string
  priority?: string
  room_number?: string
  guest_name?: string
  ticket_number?: string
  created_at: string
  creator?: { full_name: string; role: string }
  assigned_to?: string
}

interface Bellman {
  id: string
  full_name: string
  bellman_status: "in_line" | "in_process" | "off_duty"
  updated_at?: string
}

interface SimpleBellmanQueueProps {
  pendingTasks: Task[]
  allBellmen: Bellman[]
  inProgressTasks: Task[]
}

interface LocalBellman {
  id: string
  name: string
  status: string
  taskType?: string
  roomNumber?: string
  guestName?: string
  ticketNumber?: string
}

export function SimpleBellmanQueueV2({ pendingTasks, allBellmen, inProgressTasks }: SimpleBellmanQueueProps) {
  const [newBellmanName, setNewBellmanName] = useState("")
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

  const availablePendingTasks = pendingTasks.filter((task) => !assignedTaskIds.has(task.id))

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("localBellmen", JSON.stringify(localBellmen))
    }
  }, [localBellmen])

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
        })

        if (insertError) throw insertError
      }
    } catch (error) {
      console.error("Failed to log activity:", error)
      toast.error("Failed to log activity - check console for details")
    }
  }

  /**
   * assignTaskToBellman - updated to ensure assigned_to is written and returned
   */
  const assignTaskToBellman = async () => {
    if (!selectedTask || !selectedAssignee) {
      toast.error("Please select a task and bellman")
      return
    }

    try {
      const isLocalBellman = localBellmen.some((b) => b.id === selectedAssignee)

      if (isLocalBellman) {
        const bellman = localBellmen.find((b) => b.id === selectedAssignee)!
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
        // Convert selectedAssignee to string ID (defensive)
        const assigneeId = String(selectedAssignee)
        console.log("[v0] 🔵 Assigning task to DB bellman:", assigneeId, "taskId:", selectedTask.id)

        // Write assigned_to and status and return updated row
        const { data: updatedTask, error: updateError } = await supabase
          .from("tasks")
          .update({
            assigned_to: assigneeId,
            status: "in_progress",
            updated_at: new Date().toISOString(),
          })
          .eq("id", selectedTask.id)
          .select()
          .single()

        if (updateError) {
          console.error("[v0] ❌ Failed to update task assignment:", updateError)
          throw updateError
        }

        console.log("[v0] ✅ Task assignment DB result:", updatedTask)

        // Update assignee status to in_process if they're in_line
        const assignee = allBellmen.find((b) => b.id === assigneeId)
        if (assignee && assignee.bellman_status === "in_line") {
          const { error: statusErr } = await supabase
            .from("users")
            .update({
              bellman_status: "in_process",
              updated_at: new Date().toISOString(),
            })
            .eq("id", assigneeId)

          if (statusErr) {
            console.error("[v0] ❌ Error updating bellman status:", statusErr)
            throw statusErr
          }
        }

        // Log activity with resolved name
        const assigneeName = allBellmen.find((b) => b.id === assigneeId)?.full_name || "Unknown"
        await supabase.from("activity_logs").insert({
          user_id: assigneeId,
          action: "task_assigned",
          details: `Task assigned to ${assigneeName}`,
          metadata: { task_id: selectedTask.id, assignee_id: assigneeId, assignee_name: assigneeName },
        })

        toast.success(`Task assigned to ${assigneeName}`)
        console.log("[v0] ✅ Assigned task saved to DB with assigned_to:", assigneeId)
        // no forced reload here — we rely on refreshTasks() or real-time channels elsewhere
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

  /**
   * assignNewTaskToBellman - when creating+assigning new tasks directly to a bellman
   * (mostly unchanged, but we'll ensure returned row and status are handled)
   */
  const assignNewTaskToBellman = async () => {
    if (!selectedBellman || !taskType) {
      toast.error("Please fill in all required fields")
      return
    }

    console.log("[v0] 🔵 Assigning new task to bellman from In Line dialog")
    console.log("[v0] Bellman:", selectedBellman.full_name)
    console.log("[v0] Task Type:", taskType)
    console.log("[v0] Room Number:", roomNumber)
    console.log("[v0] Description:", description)
    console.log("[v0] Guest Name:", guestName)
    console.log("[v0] Ticket Number:", ticketNumber)

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
        // For local bellmen, just update their status locally
        const bellman = localBellmen.find((b) => b.id === selectedBellman.id)!
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

        console.log("[v0] ✅ Task assigned to temporary bellman successfully")
        toast.success("Task assigned to temporary bellman successfully")
      } else {
        // For database bellmen, create a task in the database first
        const {
          data: { user },
        } = await supabase.auth.getUser()

        if (!user) {
          throw new Error("User not authenticated")
        }

        console.log("[v0] Creating task in database...")

        // Create the task in the database and return the row (so assigned_to is set)
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
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .select()
          .single()

        if (createError) {
          console.error("[v0] ❌ Failed to create task:", createError)
          throw createError
        }

        console.log("[v0] ✅ Task created successfully:", newTask)

        // Update bellman status to in_process
        const { error: statusError } = await supabase
          .from("users")
          .update({ bellman_status: "in_process", updated_at: new Date().toISOString() })
          .eq("id", selectedBellman.id)

        if (statusError) {
          console.error("[v0] ❌ Failed to update bellman status:", statusError)
          throw statusError
        }

        await logActivity(
          selectedBellman.full_name,
          taskTitle,
          finalRoomNumber || "N/A",
          "assigned",
          guestName || undefined,
          ticketNumber || undefined,
        )

        console.log("[v0] ✅ Task assigned to database bellman successfully")
        toast.success("Task assigned successfully")
        // prefer real-time refresh; but keep compatibility with existing reload behavior:
        // window.location.reload()
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
      console.error("[v0] ❌ Error assigning task:", error)
      toast.error("Failed to assign task - check console for details")
    }
  }

  /**
   * completeTask - updated with robust fallback when currentTask is not found
   */
  const completeTask = async (completionType: "completed" | "cancelled" | "empty_room", position: "top" | "bottom") => {
    if (!selectedBellman) return

    try {
      const isLocalBellman = localBellmen.some((b) => b.id === selectedBellman.id)

      if (isLocalBellman) {
        // Keep local bellman logic unchanged
        const bellman = localBellmen.find((b) => b.id === selectedBellman.id)!

        if (position === "top") {
          setLocalBellmen((prev) => {
            const updatedBellman = {
              ...bellman,
              status: "in_line",
              taskType: undefined,
              roomNumber: undefined,
              guestName: undefined,
              ticketNumber: undefined,
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
        // For DB bellmen: try to find currentTask by assigned_to first
        const currentTask = inProgressTasks.find((task) => task.assigned_to === selectedBellman.id)

        if (currentTask) {
          console.log("=".repeat(80))
          console.log("[v0] 🔵 BELLMAN COMPLETING TASK")
          console.log("=".repeat(80))
          console.log("[v0] Task ID:", currentTask.id)
          console.log("[v0] Task Title:", currentTask.title)
          console.log("[v0] Room Number:", currentTask.room_number)
          console.log("[v0] Current Status:", currentTask.status)
          console.log("[v0] New Status:", completionType)
          console.log("[v0] Bellman:", selectedBellman.full_name)
          console.log("[v0] Timestamp:", new Date().toISOString())
          console.log("-".repeat(80))

          // Update the specific task row by id and return the updated row
          const { data: updateData, error: taskError } = await supabase
            .from("tasks")
            .update({
              status: completionType,
              completed_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq("id", currentTask.id)
            .select()
            .single()

          if (taskError) {
            console.error("[v0] ❌ DATABASE UPDATE FAILED:", taskError)
            throw taskError
          }

          console.log("[v0] ✅ DATABASE UPDATE SUCCESSFUL!")
          console.log("[v0] Updated task data:", JSON.stringify(updateData, null, 2))
          console.log("[v0] 📡 Real-time event should now broadcast to manager/front desk dashboards")
          console.log("=".repeat(80))
        } else {
          console.warn("[v0] ⚠️ No current task found for bellman:", selectedBellman.full_name)
          console.log("[v0] Attempting fallback DB update by assigned_to...")

          // Fallback: update any task that has this bellman as assigned_to
          const { data: fallbackData, error: fallbackError } = await supabase
            .from("tasks")
            .update({
              status: completionType,
              completed_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq("assigned_to", selectedBellman.id)
            .select()

          if (fallbackError) {
            console.error("[v0] ❌ FALLBACK UPDATE FAILED:", fallbackError)
            throw fallbackError
          }

          console.log("[v0] ⚠️ FALLBACK UPDATE SUCCESSFUL, rows changed:", fallbackData?.length || 0)
          console.log("[v0] Fallback updated rows:", JSON.stringify(fallbackData, null, 2))
        }

        // Update bellman status in users table (your table is 'users')
        const { error: statusError } = await supabase
          .from("users")
          .update({ bellman_status: "in_line", updated_at: new Date().toISOString() })
          .eq("id", selectedBellman.id)

        if (statusError) {
          console.error("[v0] ❌ Failed to update bellman status:", statusError)
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
        // Prefer real-time updates. If you still want a reload to be safe, uncomment:
        // window.location.reload()
      }

      setShowCompletionDialog(false)
      setShowPositionDialog(false)
      setSelectedBellman(null)
      setCompletionType(null)
    } catch (error) {
      console.error("[v0] ❌ Error completing task:", error)
      toast.error("Failed to complete task")
    }
  }

  const removeBellman = (bellmanId: string) => {
    const bellmanToRemove = localBellmen.find((b) => b.id === bellmanId)
    setLocalBellmen((prev) => prev.filter((b) => b.id !== bellmanId))
    toast.success(`${bellmanToRemove?.name} removed from line`)
  }

  // UI rendering (mostly unchanged)
  return (
    <div className="p-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Pending Tasks */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span>📋</span>
                Pending Tasks ({availablePendingTasks.length})
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
              const currentTask = inProgressTasks.find((task) => task.assigned_to === bellman.id)
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
              <Button className="w-full" onClick={() => { setCompletionType("completed"); completeTask("completed", "bottom") }}>
                Task Completed
              </Button>
              <Button
                className="w-full bg-transparent"
                variant="outline"
                onClick={() => { setCompletionType("cancelled"); setShowCompletionDialog(false); setShowPositionDialog(true) }}
              >
                Task Cancelled
              </Button>
              <Button
                className="w-full bg-transparent"
                variant="outline"
                onClick={() => { setCompletionType("empty_room"); setShowCompletionDialog(false); setShowPositionDialog(true) }}
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
