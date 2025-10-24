import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function SubscriptionExpiredPage() {
  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-zinc-900 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-2xl text-white">Subscription Expired</CardTitle>
          <CardDescription className="text-zinc-400">
            Your subscription has expired. Please contact support to reactivate your account.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Link href="/pricing">
            <Button className="w-full bg-blue-600 hover:bg-blue-700">View Plans</Button>
          </Link>

          <Link href="/dashboard">
            <Button variant="outline" className="w-full border-zinc-700 text-white hover:bg-zinc-800 bg-transparent">
              Back to Dashboard
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  )
}
