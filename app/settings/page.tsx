"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"
import { ClientDate } from "@/components/client-date"

export default function SettingsPage() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [settings, setSettings] = useState({
    notifications: true,
    autoAssign: false,
    defaultTaskType: "Check In",
    maxBellmenInLine: 10,
    workingHours: {
      start: "06:00",
      end: "22:00",
    },
    hotelInfo: {
      name: "TheBell Hotel",
      address: "",
      phone: "",
      email: "",
    },
    systemSettings: {
      taskTimeout: 30,
      autoCompleteAfter: 60,
      logRetentionDays: 90,
    },
  })

  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    checkUser()
    loadSettings()
  }, [])

  const checkUser = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        router.push("/auth/login")
        return
      }
      setUser(user)
    } catch (error) {
      console.error("Error checking user:", error)
      router.push("/auth/login")
    } finally {
      setLoading(false)
    }
  }

  const loadSettings = async () => {
    try {
      // Load user preferences from database if they exist
      const { data, error } = await supabase.from("user_settings").select("*").single()

      if (data && !error) {
        setSettings((prev) => ({ ...prev, ...JSON.parse(data.settings) }))
      }
    } catch (error) {
      console.log("No existing settings found, using defaults")
    }
  }

  const saveSettings = async () => {
    setSaving(true)
    try {
      const { error } = await supabase.from("user_settings").upsert({
        user_id: user.id,
        settings: JSON.stringify(settings),
        updated_at: new Date().toISOString(),
      })

      if (error) throw error

      toast.success("Settings saved successfully")
    } catch (error) {
      console.error("Error saving settings:", error)
      toast.error("Failed to save settings")
    } finally {
      setSaving(false)
    }
  }

  const resetSettings = () => {
    setSettings({
      notifications: true,
      autoAssign: false,
      defaultTaskType: "Check In",
      maxBellmenInLine: 10,
      workingHours: {
        start: "06:00",
        end: "22:00",
      },
      hotelInfo: {
        name: "TheBell Hotel",
        address: "",
        phone: "",
        email: "",
      },
      systemSettings: {
        taskTimeout: 30,
        autoCompleteAfter: 60,
        logRetentionDays: 90,
      },
    })
    toast.info("Settings reset to defaults")
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading settings...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => router.push("/dashboard")} className="p-2">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Button>
            <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={resetSettings}>
              Reset to Defaults
            </Button>
            <Button onClick={saveSettings} disabled={saving}>
              {saving ? "Saving..." : "Save Settings"}
            </Button>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto p-6 space-y-6">
        {/* General Settings */}
        <Card>
          <CardHeader>
            <CardTitle>General Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="notifications">Enable Notifications</Label>
                <p className="text-sm text-gray-600">Receive notifications for task assignments and completions</p>
              </div>
              <Switch
                id="notifications"
                checked={settings.notifications}
                onCheckedChange={(checked) => setSettings((prev) => ({ ...prev, notifications: checked }))}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="autoAssign">Auto-assign Tasks</Label>
                <p className="text-sm text-gray-600">Automatically assign pending tasks to next bellman in line</p>
              </div>
              <Switch
                id="autoAssign"
                checked={settings.autoAssign}
                onCheckedChange={(checked) => setSettings((prev) => ({ ...prev, autoAssign: checked }))}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="defaultTaskType">Default Task Type</Label>
                <Select
                  value={settings.defaultTaskType}
                  onValueChange={(value) => setSettings((prev) => ({ ...prev, defaultTaskType: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
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
                <Label htmlFor="maxBellmen">Max Bellmen in Line</Label>
                <Input
                  id="maxBellmen"
                  type="number"
                  min="1"
                  max="50"
                  value={settings.maxBellmenInLine}
                  onChange={(e) =>
                    setSettings((prev) => ({ ...prev, maxBellmenInLine: Number.parseInt(e.target.value) || 10 }))
                  }
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Working Hours */}
        <Card>
          <CardHeader>
            <CardTitle>Working Hours</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="startTime">Start Time</Label>
                <Input
                  id="startTime"
                  type="time"
                  value={settings.workingHours.start}
                  onChange={(e) =>
                    setSettings((prev) => ({
                      ...prev,
                      workingHours: { ...prev.workingHours, start: e.target.value },
                    }))
                  }
                />
              </div>
              <div>
                <Label htmlFor="endTime">End Time</Label>
                <Input
                  id="endTime"
                  type="time"
                  value={settings.workingHours.end}
                  onChange={(e) =>
                    setSettings((prev) => ({
                      ...prev,
                      workingHours: { ...prev.workingHours, end: e.target.value },
                    }))
                  }
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Hotel Information */}
        <Card>
          <CardHeader>
            <CardTitle>Hotel Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="hotelName">Hotel Name</Label>
              <Input
                id="hotelName"
                value={settings.hotelInfo.name}
                onChange={(e) =>
                  setSettings((prev) => ({
                    ...prev,
                    hotelInfo: { ...prev.hotelInfo, name: e.target.value },
                  }))
                }
              />
            </div>

            <div>
              <Label htmlFor="hotelAddress">Address</Label>
              <Textarea
                id="hotelAddress"
                value={settings.hotelInfo.address}
                onChange={(e) =>
                  setSettings((prev) => ({
                    ...prev,
                    hotelInfo: { ...prev.hotelInfo, address: e.target.value },
                  }))
                }
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="hotelPhone">Phone</Label>
                <Input
                  id="hotelPhone"
                  value={settings.hotelInfo.phone}
                  onChange={(e) =>
                    setSettings((prev) => ({
                      ...prev,
                      hotelInfo: { ...prev.hotelInfo, phone: e.target.value },
                    }))
                  }
                />
              </div>
              <div>
                <Label htmlFor="hotelEmail">Email</Label>
                <Input
                  id="hotelEmail"
                  type="email"
                  value={settings.hotelInfo.email}
                  onChange={(e) =>
                    setSettings((prev) => ({
                      ...prev,
                      hotelInfo: { ...prev.hotelInfo, email: e.target.value },
                    }))
                  }
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* System Settings */}
        <Card>
          <CardHeader>
            <CardTitle>System Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="taskTimeout">Task Timeout (minutes)</Label>
                <Input
                  id="taskTimeout"
                  type="number"
                  min="5"
                  max="120"
                  value={settings.systemSettings.taskTimeout}
                  onChange={(e) =>
                    setSettings((prev) => ({
                      ...prev,
                      systemSettings: { ...prev.systemSettings, taskTimeout: Number.parseInt(e.target.value) || 30 },
                    }))
                  }
                />
                <p className="text-xs text-gray-600 mt-1">Time before task is considered overdue</p>
              </div>

              <div>
                <Label htmlFor="autoComplete">Auto-complete After (minutes)</Label>
                <Input
                  id="autoComplete"
                  type="number"
                  min="30"
                  max="240"
                  value={settings.systemSettings.autoCompleteAfter}
                  onChange={(e) =>
                    setSettings((prev) => ({
                      ...prev,
                      systemSettings: {
                        ...prev.systemSettings,
                        autoCompleteAfter: Number.parseInt(e.target.value) || 60,
                      },
                    }))
                  }
                />
                <p className="text-xs text-gray-600 mt-1">Automatically complete tasks after this time</p>
              </div>

              <div>
                <Label htmlFor="logRetention">Log Retention (days)</Label>
                <Input
                  id="logRetention"
                  type="number"
                  min="7"
                  max="365"
                  value={settings.systemSettings.logRetentionDays}
                  onChange={(e) =>
                    setSettings((prev) => ({
                      ...prev,
                      systemSettings: {
                        ...prev.systemSettings,
                        logRetentionDays: Number.parseInt(e.target.value) || 90,
                      },
                    }))
                  }
                />
                <p className="text-xs text-gray-600 mt-1">How long to keep activity logs</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Account Information */}
        <Card>
          <CardHeader>
            <CardTitle>Account Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p>
                <strong>Email:</strong> {user?.email}
              </p>
              <p>
                <strong>Account Created:</strong> <ClientDate date={user?.created_at} format="date" />
              </p>
              <p>
                <strong>Last Sign In:</strong> <ClientDate date={user?.last_sign_in_at} format="date" />
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
