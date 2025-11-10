"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"

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
        await supabase
          .from("activity_logs")
          .update({ status: status, timestamp: new Date().toISOString() })
          .eq("id", existingLogs[0].id)
      } else {
        await supabase.from("activity_logs").insert({
          bellman_name: bellmanName,
          task_type: taskType,
          room_number: roomNumber,
          status: status,
          guest_name: guestName || null,
          ticket_number: ticketNumber || null,
          timestamp: new Date().toISOString(),
        })
      }
    } catch (error) {
      console.error("Failed to log activity:", error)
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
        toast.success("Task assigned successfully")
      } else {
        await supabase.from("tasks").update({ assigned_to: selectedAssignee, status: "in_progress" }).eq("id", selectedTask.id)
        await supabase.from("users").update({ bellman_status: "in_process" }).eq("id", selectedAssignee)
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
      let finalRoomNumber = roomNumber
      if (taskType === "Room Move") {
        finalRoomNumber = `${fromRoom} → ${toRoom}`
      }
      const taskTitle = taskType
      let taskDescription = description || ""
      if (taskType === "Room Move") {
        taskDescription = `Move from room ${fromRoom} to room ${toRoom}${description ? `. ${description}` : ""}`
      }

      if (isLocalBellman) {
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
        await logActivity(bellman.name, taskTitle, finalRoomNumber || "N/A", "assigned", guestName || undefined, ticketNumber || undefined)
        toast.success("Task assigned successfully")
      } else {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) throw new Error("User not authenticated")
        
        await supabase.from("tasks").insert({
          title: taskTitle,
          description: taskDescription,
          room_number: finalRoomNumber,
          guest_name: guestName || null,
          ticket_number: ticketNumber || null,
          created_by: user.id,
          assigned_to: selectedBellman.id,
          status: "in_progress",
        })
        await supabase.from("users").update({ bellman_status: "in_process" }).eq("id", selectedBellman.id)
        await logActivity(selectedBellman.full_name, taskTitle, finalRoomNumber || "N/A", "assigned", guestName || undefined, ticketNumber || undefined)
        toast.success("Task assigned successfully")
        window.location.reload()
      }
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
      toast.error("Failed to assign task")
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
        if (position === "top") {
          setLocalBellmen((prev) => {
            const updatedBellman = { ...bellman, status: "in_line", taskType: undefined, roomNumber: undefined, guestName: undefined, ticketNumber: undefined }
            const otherBellmen = prev.filter((b) => b.id !== selectedBellman.id && b.status === "in_line")
            const inProcessBellmen = prev.filter((b) => b.status === "in_process" && b.id !== selectedBellman.id)
            return [updatedBellman, ...otherBellmen, ...inProcessBellmen]
          })
        } else {
          setLocalBellmen((prev) => {
            const updatedBellman = { ...bellman, status: "in_line", taskType: undefined, roomNumber: undefined, guestName: undefined, ticketNumber: undefined }
            const inLineBellmen = prev.filter((b) => b.status === "in_line")
            const inProcessBellmen = prev.filter((b) => b.status === "in_process" && b.id !== selectedBellman.id)
            return [...inLineBellmen, updatedBellman, ...inProcessBellmen]
          })
        }
        await logActivity(bellman.name, bellman.taskType || "Unknown", bellman.roomNumber || "N/A", completionType, bellman.guestName, bellman.ticketNumber)
        toast.success(`Task ${completionType}`)
      } else {
        const currentTask = inProgressTasks.find((task) => task.assigned_to === selectedBellman.id)
        if (currentTask) {
          console.log("=".repeat(80))
          console.log("[v0] 🔵 BELLMAN COMPLETING TASK")
          console.log("[v0] Task ID:", currentTask.id)
          console.log("[v0] New Status:", completionType)
          console.log("=".repeat(80))
          
          const { data, error } = await supabase
            .from("tasks")
            .update({ status: completionType, completed_at: new Date().toISOString() })
            .eq("id", currentTask.id)
            .select()
          
          if (error) {
            console.error("[v0] ❌ UPDATE FAILED:", error)
            throw error
          }
          console.log("[v0] ✅ UPDATE SUCCESS:", data)
          
          const { data: verify } = await supabase.from("tasks").select("status").eq("id", currentTask.id).single()
          console.log("[v0] ✅ VERIFIED STATUS:", verify?.status)
          console.log("=".repeat(80))
        }
        await supabase.from("users").update({ bellman_status: "in_line" }).eq("id", selectedBellman.id)
        if (currentTask) {
          await logActivity(selectedBellman.full_name, currentTask.title, currentTask.room_number || "N/A", completionType, currentTask.guest_name, currentTask.ticket_number)
        }
        toast.success(`Task ${completionType}`)
        setTimeout(() => window.location.reload(), 500)
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
    toast.success(`${bellmanToRemove?.name} removed`)
  }

  return (
    <div className="p-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
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
                <h4 className="font-medium">{task.title}</h4>
                {task.room_number && <p className="text-sm text-gray-600">Room: {task.room_number}</p>}
                {task.guest_name && <p className="text-sm text-gray-600">Guest: {task.guest_name}</p>}
                <p className="text-sm text-gray-600">{task.description}</p>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-xs text-gray-500">From: {task.creator?.full_name || "System"}</span>
                  <Button size="sm" onClick={() => { setSelectedTask(task); setShowAssignDialog(true) }}>
                    Assign
                  </Button>
                </div>
              </div>
            ))}
            {availablePendingTasks.length === 0 && <p className="text-gray-500 text-center py-8">No pending tasks</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span>⏳</span>
                In Line ({inLineBellmen.length + localBellmen.filter((b) => b.status === "in_line").length})
              </div>
              {(inLineBellmen.length + localBellmen.filter((b) => b.status === "in_line").length) > 0 && (
                <Button size="sm" variant="outline" onClick={() => setShowRemoveDialog(true)}>Remove</Button>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 max-h-[calc(100vh-200px)] overflow-y-auto">
            <div className="flex gap-2">
              <Input placeholder="Add bellman name" value={newBellmanName} onChange={(e) => setNewBellmanName(e.target.value)} onKeyPress={(e) => e.key === "Enter" && addBellmanToLine()} />
              <Button onClick={addBellmanToLine}>Add</Button>
            </div>
            {localBellmen.filter((b) => b.status === "in_line").map((bellman, index) => (
              <div key={bellman.id} className="p-3 border rounded-lg bg-green-50">
                <button className="w-full text-left p-2 hover:bg-green-100 rounded" onClick={() => { setSelectedBellman({ id: bellman.id, full_name: bellman.name, bellman_status: "in_line" }); setShowTaskAssignDialog(true) }}>
                  <span className="font-medium">#{index + 1} {bellman.name}</span>
                  <span className="text-xs text-gray-500 ml-2">(Temp)</span>
                </button>
              </div>
            ))}
            {inLineBellmen.map((bellman, index) => (
              <div key={bellman.id} className="p-3 border rounded-lg bg-blue-50">
                <button className="w-full text-left p-2 hover:bg-blue-100 rounded" onClick={() => { setSelectedBellman(bellman); setShowTaskAssignDialog(true) }}>
                  <span className="font-medium">#{index + localBellmen.filter((b) => b.status === "in_line").length + 1} {bellman.full_name}</span>
                </button>
              </div>
            ))}
            {(inLineBellmen.length + localBellmen.filter((b) => b.status === "in_line").length) === 0 && <p className="text-gray-500 text-center py-8">No bellmen in line</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span>🔄</span>
              In Process ({inProcessBellmen.length + localBellmen.filter((b) => b.status === "in_process").length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 max-h-[calc(100vh-200px)] overflow-y-auto">
            {localBellmen.filter((b) => b.status === "in_process").map((bellman) => (
              <div key={bellman.id} className="p-3 border rounded-lg bg-orange-50">
                <button className="w-full text-left p-2 hover:bg-orange-100 rounded" onClick={() => { setSelectedBellman({ id: bellman.id, full_name: bellman.name, bellman_status: "in_process" }); setShowCompletionDialog(true) }}>
                  <div className="font-medium">{bellman.name} <span className="text-xs text-gray-500">(Temp)</span></div>
                  <div className="text-sm text-gray-600 mt-1">
                    <p>Task: {bellman.taskType || "N/A"}</p>
                    <p>Room: {bellman.roomNumber || "N/A"}</p>
                  </div>
                </button>
              </div>
            ))}
            {inProcessBellmen.map((bellman) => {
              const currentTask = inProgressTasks.find((task) => task.assigned_to === bellman.id)
              return (
                <div key={bellman.id} className="p-3 border rounded-lg bg-orange-50">
                  <button className="w-full text-left p-2 hover:bg-orange-100 rounded" onClick={() => { setSelectedBellman(bellman); setShowCompletionDialog(true) }}>
                    <div className="font-medium">{bellman.full_name}</div>
                    {currentTask && (
                      <div className="text-sm text-gray-600 mt-1">
                        <p>Task: {currentTask.title}</p>
                        <p>Room: {currentTask.room_number || "N/A"}</p>
                      </div>
                    )}
                  </button>
                </div>
              )
            })}
            {(inProcessBellmen.length + localBellmen.filter((b) => b.status === "in_process").length) === 0 && <p className="text-gray-500 text-center py-8">No bellmen in process</p>}
          </CardContent>
        </Card>
      </div>

      <Dialog open={showAssignDialog} onOpenChange={setShowAssignDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Assign Task</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <p>Which bellman should be assigned this task?</p>
            <Select value={selectedAssignee} onValueChange={setSelectedAssignee}>
              <SelectTrigger><SelectValue placeholder="Select a bellman" /></SelectTrigger>
              <SelectContent>
                {localBellmen.filter((b) => b.status === "in_line").map((bellman, idx) => (
                  <SelectItem key={bellman.id} value={bellman.id}>#{idx + 1} {bellman.name} (Temp)</SelectItem>
                ))}
                {inLineBellmen.map((bellman, idx) => (
                  <SelectItem key={bellman.id} value={bellman.id}>#{idx + localBellmen.filter((b) => b.status === "in_line").length + 1} {bellman.full_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex gap-2">
              <Button onClick={assignTaskToBellman} disabled={!selectedAssignee}>Assign</Button>
              <Button variant="outline" onClick={() => setShowAssignDialog(false)}>Cancel</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showCompletionDialog} onOpenChange={setShowCompletionDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Complete Task - {selectedBellman?.full_name}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <p>How was this task completed?</p>
            <Button className="w-full" onClick={() => handleCompletionChoice("completed")}>Task Completed</Button>
            <Button className="w-full" variant="outline" onClick={() => handleCompletionChoice("cancelled")}>Task Cancelled</Button>
            <Button className="w-full" variant="outline" onClick={() => handleCompletionChoice("empty_room")}>Empty Room</Button>
            <Button variant="outline" onClick={() => setShowCompletionDialog(false)}>Cancel</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showTaskAssignDialog} onOpenChange={setShowTaskAssignDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Assign Task to {selectedBellman?.full_name}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Task Type *</label>
              <Select value={taskType} onValueChange={setTaskType}>
                <SelectTrigger><SelectValue placeholder="Select task type" /></SelectTrigger>
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
                <div><label className="block text-sm font-medium mb-2">From Room *</label><Input placeholder="Room number" value={fromRoom} onChange={(e) => setFromRoom(e.target.value)} /></div>
                <div><label className="block text-sm font-medium mb-2">To Room *</label><Input placeholder="Room number" value={toRoom} onChange={(e) => setToRoom(e.target.value)} /></div>
              </>
            )}
            {(taskType === "Check In" || taskType === "Check Out" || taskType === "Other") && (
              <div><label className="block text-sm font-medium mb-2">Room Number</label><Input placeholder="Room number" value={roomNumber} onChange={(e) => setRoomNumber(e.target.value)} /></div>
            )}
            <div><label className="block text-sm font-medium mb-2">Guest Name (Optional)</label><Input placeholder="Guest name" value={guestName} onChange={(e) => setGuestName(e.target.value)} /></div>
            <div><label className="block text-sm font-medium mb-2">Ticket Number (Optional)</label><Input placeholder="Ticket number" value={ticketNumber} onChange={(e) => setTicketNumber(e.target.value)} /></div>
            {taskType && (
              <div><label className="block text-sm font-medium mb-2">Description (Optional)</label><Textarea placeholder="Additional details..." value={description} onChange={(e) => setDescription(e.target.value)} /></div>
            )}
            <div className="flex gap-2">
              <Button onClick={assignNewTaskToBellman} disabled={!taskType || (taskType === "Room Move" && (!fromRoom || !toRoom))}>Assign Task</Button>
              <Button variant="outline" onClick={() => setShowTaskAssignDialog(false)}>Cancel</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showRemoveDialog} onOpenChange={setShowRemoveDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Remove Bellman</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <p>Click on bellmen to remove them.</p>
            <div className="space-y-2">
              {localBellmen.filter((b) => b.status === "in_line").map((bellman, index) => (
                <Button key={bellman.id} variant="outline" className="w-full justify-start hover:bg-red-50" onClick={() => removeBellman(bellman.id)}>✕ #{index + 1} {bellman.name} (Temp)</Button>
              ))}
              {inLineBellmen.map((bellman, index) => (
                <Button key={bellman.id} variant="outline" className="w-full justify-start hover:bg-red-50" onClick={() => toast.info("DB bellmen removal not implemented")}>✕ #{index + localBellmen.filter((b) => b.status === "in_line").length + 1} {bellman.full_name}</Button>
              ))}
            </div>
            <Button variant="outline" onClick={() => setShowRemoveDialog(false)} className="w-full">Done</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showPositionDialog} onOpenChange={setShowPositionDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Position in Line - {selectedBellman?.full_name}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <p>Where should {selectedBellman?.full_name} be placed?</p>
            <Button className="w-full" onClick={() => completeTask(completionType!, "top")}>Top of Line</Button>
            <Button className="w-full" variant="outline" onClick={() => completeTask(completionType!, "bottom")}>Bottom of Line</Button>
            <Button variant="outline" onClick={() => { setShowPositionDialog(false); setShowCompletionDialog(true) }}>Back</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
