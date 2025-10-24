import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { SignupForm } from "./signup-form"

export default async function SignupPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) {
    redirect("/dashboard")
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <SignupForm />
    </div>
  )
}
