"use client"

import type React from "react"

import { useState, useTransition } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { createClient } from "@/lib/supabase/client"

interface User {
  id: string
  email: string
  full_name: string
  role: string
  phone?: string
  is_active: boolean
  hotel_id?: string
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

interface TaskCreateDialogProps {
  isOpen: boolean
  onClose: () => void
  onTaskCreated: (task: Task) => void
  currentUser: User
}

export function TaskCreateDialog({ isOpen, onClose, onTaskCreated, currentUser }: TaskCreateDialogProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [formData, setFormData] = useState({
    title: "",
    guest_name: "",
    description: "",
    room_number: "",
    ticket_number: "",
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    console.log("[v0] Creating task with data:", formData)
    console.log("[v0] Current user:", currentUser)
    console.log("[v0] Current user hotel_id:", currentUser.hotel_id)

    startTransition(async () => {
      const supabase = createClient()

      try {
        // Validate required fields
        if (!formData.title) {
          alert("Please select a task type")
          setIsLoading(false)
          return
        }

        // Check if user has a hotel_id - if not, fetch it from the database
        let hotelId = currentUser.hotel_id
        if (!hotelId) {
          console.log("[v0] No hotel_id in currentUser, fetching from database...")
          const { data: userProfile, error: profileError } = await supabase
            .from("users")
            .select("hotel_id")
            .eq("id", currentUser.id)
            .single()
          
          if (profileError) {
            console.error("[v0] Error fetching user profile:", profileError)
            alert("Could not verify your hotel. Please refresh the page and try again.")
            setIsLoading(false)
            return
          }

          hotelId = userProfile?.hotel_id
          console.log("[v0] Fetched hotel_id from database:", hotelId)

          if (!hotelId) {
            alert("You must be assigned to a hotel before creating tasks. Please complete the onboarding process.")
            setIsLoading(false)
            return
          }
        }

        // Sanitize inputs
        const sanitizedTitle = formData.title.trim().slice(0, 100)
        const sanitizedGuestName = formData.guest_name?.trim().slice(0, 100) || null
        const sanitizedRoomNumber = formData.room_number?.trim().slice(0, 20) || null
        const sanitizedDescription = formData.description?.trim().slice(0, 1000) || null
        const sanitizedTicketNumber = formData.ticket_number?.trim().slice(0, 50) || null

        const taskToInsert = {
          title: sanitizedTitle,
          description: sanitizedDescription,
          priority: "medium" as const,
          status: "pending" as const,
          category: "guest_service" as const,
          guest_name: sanitizedGuestName,
          room_number: sanitizedRoomNumber,
          ticket_number: sanitizedTicketNumber,
          created_by: currentUser.id,
          hotel_id: hotelId, // Required for multi-tenancy - use fetched value if needed
        }

        console.log("[v0] Inserting task:", taskToInsert)

        const { data, error } = await supabase.from("tasks").insert(taskToInsert).select().single()

        if (error) {
          console.error("[v0] Error creating task - Full details:", {
            code: error.code,
            message: error.message,
            details: error.details,
            hint: error.hint,
            fullError: error,
          })
          throw error
        }

        console.log("[v0] Task created successfully:", data)

        // Log activity
        await supabase.from("activity_logs").insert({
          task_id: data.id,
          user_id: currentUser.id,
          action: "created",
          description: `Task "${data.title}" created`,
        })

        console.log("[v0] Activity logged")

        onTaskCreated(data)
        onClose()

        setFormData({
          title: "",
          guest_name: "",
          description: "",
          room_number: "",
          ticket_number: "",
        })
      } catch (error: any) {
        console.error("[v0] Error in task creation - Full details:", {
          code: error?.code,
          message: error?.message,
          details: error?.details,
          hint: error?.hint,
          fullError: error,
        })
        alert(`Failed to create task: ${error?.message || "Unknown error"}. Please check console for details.`)
      } finally {
        setIsLoading(false)
      }
    })
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Create New Task</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="title">Task Title *</Label>
            <Select
              value={formData.title}
              onValueChange={(value) => setFormData((prev) => ({ ...prev, title: value }))}
              required
            >
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
            <Label htmlFor="guest_name">Guest Name (Optional)</Label>
            <Input
              id="guest_name"
              value={formData.guest_name}
              onChange={(e) => setFormData((prev) => ({ ...prev, guest_name: e.target.value }))}
              placeholder="Guest name"
            />
          </div>

          <div>
            <Label htmlFor="room_number">Room Number(s)</Label>
            <Input
              id="room_number"
              value={formData.room_number}
              onChange={(e) => setFormData((prev) => ({ ...prev, room_number: e.target.value }))}
              placeholder="e.g., 101 or 101-105 for room moves"
            />
          </div>

          <div>
            <Label htmlFor="ticket_number">Ticket Number (Optional)</Label>
            <Input
              id="ticket_number"
              value={formData.ticket_number}
              onChange={(e) => setFormData((prev) => ({ ...prev, ticket_number: e.target.value }))}
              placeholder="e.g., TKT-12345"
            />
          </div>

          <div>
            <Label htmlFor="description">Description (Optional)</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
              rows={3}
              placeholder="Additional details about the task"
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Creating..." : "Create Task"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
