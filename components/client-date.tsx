"use client"

import { useEffect, useState } from "react"

interface ClientDateProps {
  date: string | Date
  format?: "date" | "datetime" | "time"
  className?: string
}

/**
 * Renders a formatted date string only on the client side to avoid
 * hydration mismatches between server (UTC) and client (local timezone).
 */
export function ClientDate({ date, format = "datetime", className }: ClientDateProps) {
  const [formatted, setFormatted] = useState<string>("")

  useEffect(() => {
    const d = new Date(date)
    switch (format) {
      case "date":
        setFormatted(d.toLocaleDateString())
        break
      case "time":
        setFormatted(d.toLocaleTimeString())
        break
      case "datetime":
      default:
        setFormatted(d.toLocaleString())
        break
    }
  }, [date, format])

  if (!formatted) return null

  return <span className={className}>{formatted}</span>
}
