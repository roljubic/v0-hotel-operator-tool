"use client"

import { SimpleBellmanQueueV2 } from "@/components/simple-bellman-queue-v2"
import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"

interface BellmanDashboardClientProps {
  pendingTasks: any[]
  allBellmen: any[]
  inProgressTasks: any[]
  currentUser: {
    id: string
    hotel_id?: string
    role: string
  }
}

export function BellmanDashboardClient({ pendingTasks, allBellmen, inProgressTasks, currentUser }: BellmanDashboardClientProps) {
  const [showMenu, setShowMenu] = useState(false)
  const router = useRouter()
  const supabase = createClient()
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false)
      }
    }

    if (showMenu) {
      document.addEventListener("mousedown", handleClickOutside)
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [showMenu])

  const handleNavigation = (path: string) => {
    console.log(`[v0] Navigating to ${path}`)
    setShowMenu(false)
    if (path === "/") {
      router.push("/")
    } else if (path === "/activity-log") {
      router.push("/activity-log")
    } else if (path === "/settings") {
      router.push("/settings")
    }
  }

  const handleLogout = async () => {
    console.log("[v0] Logout clicked")
    try {
      await supabase.auth.signOut()
      router.push("/auth/login")
    } catch (error) {
      console.error("Error logging out:", error)
    }
    setShowMenu(false)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-4">
            <button
              className="p-2 hover:bg-gray-100 rounded-lg"
              onClick={() => {
                console.log("[v0] Menu button clicked")
                setShowMenu(!showMenu)
              }}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <h1 className="text-2xl font-bold text-gray-900">TheBell</h1>
          </div>
          <div className="text-sm text-gray-600">Bellman Dashboard</div>
        </div>

        {showMenu && (
          <div ref={menuRef} className="absolute top-16 left-6 bg-white border rounded-lg shadow-lg z-10 min-w-48">
            <div className="py-2">
              <button
                className="w-full text-left px-4 py-2 hover:bg-gray-100"
                onClick={() => handleNavigation("/activity-log")}
              >
                Activity Log
              </button>
              <button
                className="w-full text-left px-4 py-2 hover:bg-gray-100"
                onClick={() => handleNavigation("/settings")}
              >
                Settings
              </button>
              <button className="w-full text-left px-4 py-2 hover:bg-gray-100" onClick={handleLogout}>
                Logout
              </button>
            </div>
          </div>
        )}
      </header>

      <SimpleBellmanQueueV2 pendingTasks={pendingTasks} allBellmen={allBellmen} inProgressTasks={inProgressTasks} currentUser={currentUser} />
    </div>
  )
}
