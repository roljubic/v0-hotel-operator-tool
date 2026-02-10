"use client"

import { useEffect, useState, useCallback, useRef } from "react"
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
  /** Polling interval in ms as a safety net for missed realtime events. Default: 15000 (15s) */
  pollingInterval?: number
}

export function useRealtimeTasks(initialTasks: Task[], options: UseRealtimeTasksOptions = {}) {
  const [tasks, setTasks] = useState<Task[]>(initialTasks)
  const [isConnected, setIsConnected] = useState(false)
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date())
  const supabase = createClient()
  const optionsRef = useRef(options)
  optionsRef.current = options

  const refreshTasks = useCallback(async () => {
    const query = supabase
      .from("tasks")
      .select("*")
      .order("created_at", { ascending: false })

    // Apply hotel_id filter if provided
    if (optionsRef.current.hotelId) {
      query.eq("hotel_id", optionsRef.current.hotelId)
    }

    const { data, error } = await query

    console.log("[v0] refreshTasks: hotelId =", optionsRef.current.hotelId, "fetched =", data?.length, "error =", error?.message)

    if (!error && data) {
      setTasks((prev) => {
        // Only update if there are actual changes to avoid unnecessary re-renders
        const prevJson = JSON.stringify(prev.map((t) => `${t.id}:${t.status}:${t.updated_at}`).sort())
        const newJson = JSON.stringify(data.map((t: Task) => `${t.id}:${t.status}:${t.updated_at}`).sort())
        if (prevJson === newJson) return prev

        console.log("[v0] refreshTasks: state changed, updating tasks")
        // Log the status changes
        const prevMap = new Map(prev.map((t) => [t.id, t]))
        for (const task of data as Task[]) {
          const oldTask = prevMap.get(task.id)
          if (oldTask && oldTask.status !== task.status) {
            console.log("[v0] refreshTasks: task", task.id, "status changed from", oldTask.status, "to", task.status)
            optionsRef.current.onTaskUpdated?.(task, oldTask)
          } else if (!oldTask) {
            optionsRef.current.onTaskInserted?.(task)
          }
        }

        return data
      })
      setLastUpdate(new Date())
    }
  }, [supabase])

  useEffect(() => {
    let channel: RealtimeChannel | null = null

    const setupRealtime = () => {
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
            setTasks((prev) => {
              // Avoid duplicates (in case polling already added it)
              if (prev.some((t) => t.id === newTask.id)) {
                return prev.map((t) => (t.id === newTask.id ? newTask : t))
              }
              return [newTask, ...prev]
            })
            setLastUpdate(new Date())
            optionsRef.current.onTaskInserted?.(newTask)
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
            console.log("[v0] REALTIME UPDATE received:", updatedTask.id, "status:", updatedTask.status)
            setTasks((prev) => {
              const oldTask = prev.find((t) => t.id === updatedTask.id)
              console.log("[v0] REALTIME UPDATE: old status =", oldTask?.status, "new status =", updatedTask.status)
              optionsRef.current.onTaskUpdated?.(updatedTask, oldTask)
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
            optionsRef.current.onTaskDeleted?.(deletedId)
          }
        )
        .subscribe((status) => {
          console.log("[v0] Realtime channel status:", status, "hotelId filter:", options.hotelId)
          setIsConnected(status === "SUBSCRIBED")

          // Refresh immediately when we reconnect to catch any missed events
          if (status === "SUBSCRIBED") {
            refreshTasks()
          }
        })
    }

    setupRealtime()

    // Safety-net polling: periodically refresh to catch any missed realtime events
    const pollingMs = options.pollingInterval ?? 15000
    const pollInterval = setInterval(() => {
      refreshTasks()
    }, pollingMs)

    return () => {
      clearInterval(pollInterval)
      if (channel) {
        supabase.removeChannel(channel)
      }
    }
  }, [supabase, options.hotelId, options.pollingInterval, refreshTasks])

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
