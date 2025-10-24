"use client"

import { Button } from "@/components/ui/button"

export function RefreshButton() {
  return (
    <Button onClick={() => window.location.reload()} className="w-full bg-blue-600 hover:bg-blue-700">
      Refresh Page
    </Button>
  )
}
