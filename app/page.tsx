import { Bell, BellRing, Luggage, Phone, BarChart3, Zap, Smartphone } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white text-gray-900">
      {/* Navigation */}
      <nav className="border-b border-gray-200">
        <div className="mx-auto max-w-7xl px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bell className="h-6 w-6" />
              <span className="text-xl font-bold">TheBell</span>
            </div>
            <div className="flex items-center gap-6">
              <Link href="/pricing" className="text-sm text-gray-600 hover:text-gray-900">
                Pricing
              </Link>
              <Link href="/auth/login">
                <Button variant="ghost" size="sm">
                  Log in
                </Button>
              </Link>
              <Link href="/signup">
                <Button size="sm">Get Started</Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="mx-auto max-w-7xl px-6 py-32">
        <div className="flex flex-col items-start gap-8">
          <h1 className="max-w-4xl text-balance text-6xl font-bold leading-tight tracking-tight">
            Streamline your bell staff operations and luggage tracking.
          </h1>
          <p className="max-w-2xl text-balance text-xl text-gray-600 leading-relaxed">
            Purpose-built for bell teams. Track luggage, manage bellman rotation, and coordinate seamlessly with front
            office staff who place tasks for your bell team.
          </p>
          <div className="flex items-center gap-4">
            <Link href="/signup">
              <Button size="lg" className="bg-gray-900 text-white hover:bg-gray-800">
                Get a demo
              </Button>
            </Link>
            <Link href="/pricing">
              <Button size="lg" variant="outline" className="border-gray-300 hover:bg-gray-100 bg-transparent">
                Explore Pricing
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Social Proof */}
      <section className="border-t border-gray-200">
        <div className="mx-auto max-w-7xl px-6">
          <div className="grid grid-cols-4 gap-8 py-16">
            <div className="border-r border-gray-200 pr-8">
              <div className="text-4xl font-bold">Real-Time</div>
              <div className="text-sm text-gray-600 mt-2">luggage tracking</div>
            </div>
            <div className="border-r border-gray-200 pr-8">
              <div className="text-4xl font-bold">Automated</div>
              <div className="text-sm text-gray-600 mt-2">bellman rotation</div>
            </div>
            <div className="border-r border-gray-200 pr-8">
              <div className="text-4xl font-bold">Instant</div>
              <div className="text-sm text-gray-600 mt-2">task notifications</div>
            </div>
            <div>
              <div className="text-4xl font-bold">24/7</div>
              <div className="text-sm text-gray-600 mt-2">mobile access</div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="mx-auto max-w-7xl px-6 py-32">
        <div className="mb-16">
          <div className="text-sm text-gray-600 mb-4">Bell Operations</div>
          <h2 className="text-5xl font-bold text-balance">Everything your bell team needs.</h2>
        </div>
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-8">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-gray-900">
              <BellRing className="h-6 w-6 text-white" />
            </div>
            <h3 className="mb-2 text-xl font-semibold">Bellman Queue & Rotation</h3>
            <p className="text-gray-600">
              Automated bellman rotation system ensures fair task distribution. Real-time queue management keeps your
              team organized and efficient.
            </p>
          </div>
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-8">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-gray-900">
              <Luggage className="h-6 w-6 text-white" />
            </div>
            <h3 className="mb-2 text-xl font-semibold">Luggage Tracking</h3>
            <p className="text-gray-600">
              Track every piece of luggage from arrival to delivery. Know exactly where guest belongings are at all
              times.
            </p>
          </div>
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-8">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-gray-900">
              <Phone className="h-6 w-6 text-white" />
            </div>
            <h3 className="mb-2 text-xl font-semibold">Front Office Integration</h3>
            <p className="text-gray-600">
              Front office staff can instantly create and assign tasks to the bell team. Seamless communication from
              desk to bellstand.
            </p>
          </div>
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-8">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-gray-900">
              <BarChart3 className="h-6 w-6 text-white" />
            </div>
            <h3 className="mb-2 text-xl font-semibold">Manager Dashboard</h3>
            <p className="text-gray-600">
              Monitor bell team performance, track response times, and optimize staffing. Data-driven insights for
              better operations.
            </p>
          </div>
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-8">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-gray-900">
              <Zap className="h-6 w-6 text-white" />
            </div>
            <h3 className="mb-2 text-xl font-semibold">Real-Time Notifications</h3>
            <p className="text-gray-600">
              Instant alerts for urgent tasks. Keep your team synchronized across all departments.
            </p>
          </div>
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-8">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-gray-900">
              <Smartphone className="h-6 w-6 text-white" />
            </div>
            <h3 className="mb-2 text-xl font-semibold">Mobile Ready</h3>
            <p className="text-gray-600">
              Bell staff can access tasks on the go. Update status, accept assignments, and communicate from anywhere in
              the hotel.
            </p>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="border-t border-gray-200">
        <div className="mx-auto max-w-7xl px-6 py-32">
          <div className="text-center">
            <h2 className="text-5xl font-bold mb-6">Ready to transform your bell operations?</h2>
            <p className="text-xl text-gray-600 mb-8">Join hundreds of hotels worldwide using TheBell.</p>
            <Link href="/signup">
              <Button size="lg" className="bg-gray-900 text-white hover:bg-gray-800">
                Start free trial
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-200">
        <div className="mx-auto max-w-7xl px-6 py-12">
          <div className="grid gap-8 md:grid-cols-4">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Bell className="h-5 w-5" />
                <span className="font-bold">TheBell</span>
              </div>
              <p className="text-sm text-gray-600">Specialized bell staff and luggage management for modern hotels.</p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>
                  <Link href="/pricing" className="hover:text-gray-900">
                    Pricing
                  </Link>
                </li>
                <li>
                  <Link href="/features" className="hover:text-gray-900">
                    Features
                  </Link>
                </li>
                <li>
                  <Link href="/demo" className="hover:text-gray-900">
                    Request Demo
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>
                  <Link href="/about" className="hover:text-gray-900">
                    About
                  </Link>
                </li>
                <li>
                  <Link href="/contact" className="hover:text-gray-900">
                    Contact
                  </Link>
                </li>
                <li>
                  <Link href="/careers" className="hover:text-gray-900">
                    Careers
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Legal</h4>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>
                  <Link href="/privacy" className="hover:text-gray-900">
                    Privacy
                  </Link>
                </li>
                <li>
                  <Link href="/terms" className="hover:text-gray-900">
                    Terms
                  </Link>
                </li>
                <li>
                  <Link href="/security" className="hover:text-gray-900">
                    Security
                  </Link>
                </li>
              </ul>
            </div>
          </div>
          <div className="mt-12 pt-8 border-t border-gray-200 text-center text-sm text-gray-600">
            © 2025 TheBell. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  )
}
