"use client"

import { useEffect } from "react"
import { X, CheckCircle, Info, AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"

interface Notification {
  id: string
  message: string
  type: "info" | "success" | "warning"
}

interface RealtimeNotificationsProps {
  notifications: Notification[]
  onDismiss: (id: string) => void
}

export function RealtimeNotifications({ notifications, onDismiss }: RealtimeNotificationsProps) {
  // Auto-dismiss notifications after 5 seconds
  useEffect(() => {
    notifications.forEach((notification) => {
      const timer = setTimeout(() => {
        onDismiss(notification.id)
      }, 5000)

      return () => clearTimeout(timer)
    })
  }, [notifications, onDismiss])

  if (notifications.length === 0) return null

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2 max-w-sm">
      {notifications.map((notification) => {
        const Icon =
          notification.type === "success" ? CheckCircle : notification.type === "warning" ? AlertTriangle : Info

        const bgColor =
          notification.type === "success"
            ? "bg-green-50 border-green-200"
            : notification.type === "warning"
              ? "bg-yellow-50 border-yellow-200"
              : "bg-blue-50 border-blue-200"

        const iconColor =
          notification.type === "success"
            ? "text-green-600"
            : notification.type === "warning"
              ? "text-yellow-600"
              : "text-blue-600"

        return (
          <Card
            key={notification.id}
            className={`${bgColor} shadow-lg animate-in slide-in-from-right-full duration-300`}
          >
            <div className="p-4">
              <div className="flex items-start space-x-3">
                <Icon className={`h-5 w-5 ${iconColor} mt-0.5 flex-shrink-0`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-900 font-medium">{notification.message}</p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 hover:bg-white/50"
                  onClick={() => onDismiss(notification.id)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </Card>
        )
      })}
    </div>
  )
}
