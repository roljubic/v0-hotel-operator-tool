import { Bell, ArrowLeft, Calendar, Users, Zap, Shield } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

export default function DemoPage() {
  return (
    <div className="min-h-screen bg-white text-gray-900">
      {/* Navigation */}
      <nav className="border-b border-gray-200">
        <div className="mx-auto max-w-7xl px-6 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2">
              <Bell className="h-6 w-6" />
              <span className="text-xl font-bold">TheBell</span>
            </Link>
            <div className="flex items-center gap-6">
              <Link
                href="/"
                className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors group"
              >
                <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                <span className="text-sm font-medium">Back to Website</span>
              </Link>
              <Link href="/auth/login">
                <Button variant="ghost" size="sm">
                  Log in
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Demo Request Section */}
      <section className="mx-auto max-w-7xl px-6 py-32">
        <div className="grid gap-16 lg:grid-cols-2">
          {/* Left Column - Info */}
          <div>
            <h1 className="text-5xl font-bold mb-6 text-balance">See TheBell in action</h1>
            <p className="text-xl text-gray-600 mb-12 leading-relaxed">
              Schedule a personalized demo with our team and discover how TheBell can transform your bell staff
              operations.
            </p>

            <div className="space-y-8">
              <div className="flex gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gray-900 shrink-0">
                  <Calendar className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold mb-2">30-minute personalized demo</h3>
                  <p className="text-gray-600 text-sm">
                    We'll walk you through the platform and answer all your questions.
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gray-900 shrink-0">
                  <Users className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold mb-2">Tailored to your hotel</h3>
                  <p className="text-gray-600 text-sm">
                    We'll customize the demo based on your property size and needs.
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gray-900 shrink-0">
                  <Zap className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold mb-2">Quick setup guidance</h3>
                  <p className="text-gray-600 text-sm">Learn how to get your team up and running in minutes.</p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gray-900 shrink-0">
                  <Shield className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold mb-2">No commitment required</h3>
                  <p className="text-gray-600 text-sm">Just a friendly conversation about your bell operations.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Form */}
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-8">
            <h2 className="text-2xl font-bold mb-6">Request a demo</h2>
            <form className="space-y-6">
              <div className="grid gap-6 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First name</Label>
                  <Input id="firstName" placeholder="John" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last name</Label>
                  <Input id="lastName" placeholder="Smith" required />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Work email</Label>
                <Input id="email" type="email" placeholder="john@hotel.com" required />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone number</Label>
                <Input id="phone" type="tel" placeholder="+1 (555) 000-0000" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="hotelName">Hotel name</Label>
                <Input id="hotelName" placeholder="Grand Hotel" required />
              </div>

              <div className="space-y-2">
                <Label htmlFor="rooms">Number of rooms</Label>
                <Input id="rooms" type="number" placeholder="100" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="message">Tell us about your needs (optional)</Label>
                <Textarea
                  id="message"
                  placeholder="What challenges are you facing with your current bell operations?"
                  rows={4}
                />
              </div>

              <Button type="submit" className="w-full bg-gray-900 text-white hover:bg-gray-800">
                Request demo
              </Button>

              <p className="text-xs text-gray-600 text-center">
                By submitting this form, you agree to our privacy policy.
              </p>
            </form>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-200">
        <div className="mx-auto max-w-7xl px-6 py-12">
          <div className="text-center text-sm text-gray-600">© 2025 TheBell. All rights reserved.</div>
        </div>
      </footer>
    </div>
  )
}
