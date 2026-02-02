"use client"

import { useEffect, useState, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import type { RealtimeChannel } from "@supabase/supabase-js"

export interface Task {
  id: string
  title: string
  description?: string
  priority: "low" | "medium" | "high" | "urgent"
  status: "pending" | "in_progress" | "completed" | "cancelled" | "empty_room"
  category: string
  assigned_to?: string
  created_by: string
  room_number?: string
  guest_name?: string
  ticket_number?: string
  due_date?: string
  completed_at?: string
  hotel_id?: string
  created_at: string
  updated_at: string
}

interface UseRealtimeTasksOptions {
  hotelId?: string
  onTaskInserted?: (task: Task) => void
  onTaskUpdated?: (task: Task, oldTask: Task | undefined) => void
  onTaskDeleted?: (taskId: string) => void
}

export function useRealtimeTasks(initialTasks: Task[], options: UseRealtimeTasksOptions = {}) {
  const [tasks, setTasks] = useState<Task[]>(initialTasks)
  const [isConnected, setIsConnected] = useState(false)
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date())
  const supabase = createClient()

  const refreshTasks = useCallback(async () => {
    const { data, error } = await supabase
      .from("tasks")
      .select("*")
      .order("created_at", { ascending: false })

    if (!error && data) {
      setTasks(data)
      setLastUpdate(new Date())
    }
  }, [supabase])

  useEffect(() => {
    let channel: RealtimeChannel | null = null

    const setupRealtime = async () => {
      // Build filter for hotel_id if provided
      const filter = options.hotelId 
        ? `hotel_id=eq.${options.hotelId}` 
        : undefined

      channel = supabase
        .channel("tasks-realtime")
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "tasks",
            filter,
          },
          (payload) => {
            const newTask = payload.new as Task
            setTasks((prev) => [newTask, ...prev])
            setLastUpdate(new Date())
            options.onTaskInserted?.(newTask)
          }
        )
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "tasks",
            filter,
          },
          (payload) => {
            const updatedTask = payload.new as Task
            setTasks((prev) => {
              const oldTask = prev.find((t) => t.id === updatedTask.id)
              options.onTaskUpdated?.(updatedTask, oldTask)
              return prev.map((t) => (t.id === updatedTask.id ? updatedTask : t))
            })
            setLastUpdate(new Date())
          }
        )
        .on(
          "postgres_changes",
          {
            event: "DELETE",
            schema: "public",
            table: "tasks",
            filter,
          },
          (payload) => {
            const deletedId = (payload.old as { id: string }).id
            setTasks((prev) => prev.filter((t) => t.id !== deletedId))
            setLastUpdate(new Date())
            options.onTaskDeleted?.(deletedId)
          }
        )
        .subscribe((status) => {
          setIsConnected(status === "SUBSCRIBED")
        })
    }

    setupRealtime()

    return () => {
      if (channel) {
        supabase.removeChannel(channel)
      }
    }
  }, [supabase, options.hotelId])

  return {
    tasks,
    setTasks,
    isConnected,
    lastUpdate,
    refreshTasks,
  }
}

export function useRealtimeUsers(hotelId?: string) {
  const [users, setUsers] = useState<any[]>([])
  const [isConnected, setIsConnected] = useState(false)
  const supabase = createClient()

  const refreshUsers = useCallback(async () => {
    const { data, error } = await supabase
      .from("users")
      .select("*")
      .order("full_name")

    if (!error && data) {
      setUsers(data)
    }
  }, [supabase])

  useEffect(() => {
    // Initial fetch
    refreshUsers()

    const filter = hotelId ? `hotel_id=eq.${hotelId}` : undefined

    const channel = supabase
      .channel("users-realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "users",
          filter,
        },
        () => {
          refreshUsers()
        }
      )
      .subscribe((status) => {
        setIsConnected(status === "SUBSCRIBED")
      })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase, hotelId, refreshUsers])

  return {
    users,
    setUsers,
    isConnected,
    refreshUsers,
  }
}
