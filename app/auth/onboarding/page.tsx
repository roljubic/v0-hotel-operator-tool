"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Building2, Users } from "lucide-react"

export default function OnboardingPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  // Create new hotel form
  const [hotelName, setHotelName] = useState("")
  const [address, setAddress] = useState("")
  const [city, setCity] = useState("")
  const [country, setCountry] = useState("")
  const [phone, setPhone] = useState("")
  const [email, setEmail] = useState("")
  const [roomCount, setRoomCount] = useState("")

  // Join existing hotel form
  const [inviteCode, setInviteCode] = useState("")

  const handleCreateHotel = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    const supabase = createClient()

    try {
      // Get current user
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) throw new Error("Not authenticated")

      // Create hotel
      const { data: hotel, error: hotelError } = await supabase
        .from("hotels")
        .insert({
          name: hotelName,
          address,
          city,
          country,
          phone,
          email,
          room_count: Number.parseInt(roomCount) || 0,
        })
        .select()
        .single()

      if (hotelError) throw hotelError

      // Update user with hotel_id
      const { error: updateError } = await supabase.from("users").update({ hotel_id: hotel.id }).eq("id", user.id)

      if (updateError) throw updateError

      // Redirect to dashboard
      router.push("/dashboard")
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setIsLoading(false)
    }
  }

  const handleJoinHotel = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    const supabase = createClient()

    try {
      // Get current user
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) throw new Error("Not authenticated")

      // Find hotel by invite code (using hotel ID as invite code for now)
      const { data: hotel, error: hotelError } = await supabase
        .from("hotels")
        .select("id")
        .eq("id", inviteCode)
        .single()

      if (hotelError) throw new Error("Invalid invite code")

      // Update user with hotel_id
      const { error: updateError } = await supabase.from("users").update({ hotel_id: hotel.id }).eq("id", user.id)

      if (updateError) throw updateError

      // Redirect to dashboard
      router.push("/dashboard")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invalid invite code")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="w-full max-w-2xl">
        <Card className="shadow-xl">
          <CardHeader className="text-center">
            <CardTitle className="text-3xl font-bold text-gray-900">Welcome to TheBell</CardTitle>
            <CardDescription className="text-lg">Set up your hotel to get started</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="create" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="create" className="flex items-center gap-2">
                  <Building2 className="w-4 h-4" />
                  Create New Hotel
                </TabsTrigger>
                <TabsTrigger value="join" className="flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Join Existing Hotel
                </TabsTrigger>
              </TabsList>

              <TabsContent value="create" className="mt-6">
                <form onSubmit={handleCreateHotel} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="hotelName">Hotel Name *</Label>
                    <Input
                      id="hotelName"
                      placeholder="Grand Plaza Hotel"
                      required
                      value={hotelName}
                      onChange={(e) => setHotelName(e.target.value)}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="city">City *</Label>
                      <Input
                        id="city"
                        placeholder="New York"
                        required
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="country">Country *</Label>
                      <Input
                        id="country"
                        placeholder="USA"
                        required
                        value={country}
                        onChange={(e) => setCountry(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="address">Address</Label>
                    <Input
                      id="address"
                      placeholder="123 Main Street"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone</Label>
                      <Input
                        id="phone"
                        type="tel"
                        placeholder="+1 (555) 123-4567"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="info@hotel.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="roomCount">Number of Rooms</Label>
                    <Input
                      id="roomCount"
                      type="number"
                      placeholder="100"
                      value={roomCount}
                      onChange={(e) => setRoomCount(e.target.value)}
                    />
                  </div>

                  {error && <p className="text-sm text-red-600 bg-red-50 p-2 rounded">{error}</p>}

                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? "Creating hotel..." : "Create Hotel & Continue"}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="join" className="mt-6">
                <form onSubmit={handleJoinHotel} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="inviteCode">Hotel Invite Code</Label>
                    <Input
                      id="inviteCode"
                      placeholder="Enter the invite code from your manager"
                      required
                      value={inviteCode}
                      onChange={(e) => setInviteCode(e.target.value)}
                    />
                    <p className="text-sm text-gray-500">
                      Ask your hotel manager or admin for the invite code to join your team.
                    </p>
                  </div>

                  {error && <p className="text-sm text-red-600 bg-red-50 p-2 rounded">{error}</p>}

                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? "Joining hotel..." : "Join Hotel"}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
