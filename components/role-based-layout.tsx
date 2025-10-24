"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { LayoutDashboard, Users, Settings, LogOut, Menu, Bell, UserCheck, ClipboardList } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import Link from "next/link"

interface User {
  id: string
  email: string
  full_name: string
  role: string
  phone?: string
  is_active: boolean
}

interface RoleBasedLayoutProps {
  user: User
  children: React.ReactNode
  currentPage?: string
  notifications?: Array<{ id: string; message: string; type: "info" | "success" | "warning" }>
}

export function RoleBasedLayout({
  user,
  children,
  currentPage = "dashboard",
  notifications = [],
}: RoleBasedLayoutProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const router = useRouter()

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push("/auth/login")
  }

  const getNavigationItems = () => {
    console.log("[v0] Navigation: User role is", user.role)

    const baseItems = [
      {
        name: "Dashboard",
        href: "/dashboard",
        icon: LayoutDashboard,
        roles: ["admin", "manager", "operator", "front_desk"], // Removed "bellman" from roles
      },
      {
        name: "Bellman Queue",
        href: "/dashboard/bellman",
        icon: Bell,
        roles: ["bellman"],
      },
      {
        name: "My Tasks",
        href: "/dashboard/my-tasks",
        icon: ClipboardList,
        roles: ["bell_staff", "housekeeping", "maintenance"],
      },
    ]

    const superAdminItems = [
      {
        name: "Super Admin",
        href: "/admin",
        icon: Settings,
        roles: ["super_admin"],
      },
    ]

    const adminItems = [
      {
        name: "User Management",
        href: "/dashboard/users",
        icon: Users,
        roles: ["admin", "manager", "super_admin"],
      },
    ]

    const items = [...superAdminItems, ...baseItems, ...adminItems].filter((item) => item.roles.includes(user.role))

    console.log(
      "[v0] Navigation: Filtered items for role",
      user.role,
      ":",
      items.map((i) => ({ name: i.name, href: i.href })),
    )

    return items
  }

  const getRoleColor = (role: string) => {
    switch (role) {
      case "admin":
        return "bg-red-100 text-red-800"
      case "manager":
        return "bg-purple-100 text-purple-800"
      case "operator":
        return "bg-blue-100 text-blue-800"
      case "bell_staff":
        return "bg-green-100 text-green-800"
      case "bellman":
        return "bg-yellow-100 text-yellow-800"
      case "super_admin":
        return "bg-black text-white"
      case "front_desk":
        return "bg-teal-100 text-teal-800"
      case "housekeeping":
        return "bg-pink-100 text-pink-800"
      case "maintenance":
        return "bg-orange-100 text-orange-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const navigationItems = getNavigationItems()

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      <div className="p-6 border-b">
        <h2 className="text-2xl font-bold text-gray-900">TheBell</h2>
        <p className="text-sm text-gray-600 mt-1">Hotel Operations</p>
      </div>

      <div className="p-4 border-b">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
            <UserCheck className="h-5 w-5 text-gray-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">{user.full_name}</p>
            <Badge className={`text-xs ${getRoleColor(user.role)}`}>{user.role.replace("_", " ").toUpperCase()}</Badge>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-2">
        {navigationItems.map((item) => {
          const Icon = item.icon
          const isActive = currentPage === item.href.split("/").pop()

          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive ? "bg-blue-100 text-blue-700" : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
              }`}
              onClick={() => {
                console.log("[v0] Navigation: Clicked", item.name, "going to", item.href)
                setIsSidebarOpen(false)
              }}
            >
              <Icon className="h-5 w-5" />
              <span>{item.name}</span>
            </Link>
          )
        })}
      </nav>

      <div className="p-4 border-t">
        <Button variant="outline" className="w-full bg-transparent" onClick={handleSignOut}>
          <LogOut className="h-4 w-4 mr-2" />
          Sign Out
        </Button>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Desktop Sidebar */}
      <div className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0 bg-white border-r">
        <SidebarContent />
      </div>

      {/* Mobile Sidebar */}
      <Sheet open={isSidebarOpen} onOpenChange={setIsSidebarOpen}>
        <SheetContent side="left" className="p-0 w-64">
          <SidebarContent />
        </SheetContent>
      </Sheet>

      {/* Main Content */}
      <div className="flex-1 lg:ml-64">
        {/* Mobile Header */}
        <header className="lg:hidden bg-white border-b px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Sheet open={isSidebarOpen} onOpenChange={setIsSidebarOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="sm">
                    <Menu className="h-5 w-5" />
                  </Button>
                </SheetTrigger>
              </Sheet>
              <h1 className="text-xl font-bold text-gray-900">TheBell</h1>
            </div>
            <div className="flex items-center space-x-2">
              <div className="relative">
                <Bell className="h-5 w-5 text-gray-600" />
                {notifications.length > 0 && (
                  <div className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center">
                    {notifications.length}
                  </div>
                )}
              </div>
              <div className="flex items-center space-x-1 text-green-600">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-xs">Live</span>
              </div>
            </div>
          </div>
        </header>

        {/* Desktop Header */}
        <header className="hidden lg:block bg-white border-b px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <h1 className="text-2xl font-bold text-gray-900">
                {currentPage === "dashboard" && "Dashboard"}
                {currentPage === "bellman" && "Bellman Queue"}
                {currentPage === "my-tasks" && "My Tasks"}
                {currentPage === "users" && "User Management"}
                {currentPage === "reports" && "Reports"}
                {currentPage === "admin" && "Super Admin"}
              </h1>
              <div className="flex items-center space-x-1 text-green-600">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-xs">Live</span>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="relative">
                <Bell className="h-5 w-5 text-gray-600" />
                {notifications.length > 0 && (
                  <div className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center">
                    {notifications.length}
                  </div>
                )}
              </div>
              <span className="text-sm text-gray-600">Welcome, {user.full_name}</span>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="p-4 lg:p-6">{children}</main>
      </div>
    </div>
  )
}
