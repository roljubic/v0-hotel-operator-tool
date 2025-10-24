import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { format } from "date-fns"

interface ActivityLog {
  id: string
  task_id?: string
  user_id: string
  action: string
  old_value?: string
  new_value?: string
  description: string
  created_at: string
  user?: { full_name: string; role: string }
  task?: { title: string; category: string; priority: string }
}

interface ExportFilters {
  searchTerm?: string
  actionFilter: string
  userFilter: string
}

interface UserProfile {
  role: string
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Verify user authentication
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Verify user has permission to export logs
    const { data: userProfile } = (await supabase.from("users").select("role").eq("id", user.id).single()) as {
      data: UserProfile | null
    }

    if (!userProfile || !["admin", "manager", "operator"].includes(userProfile.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { logs, filters }: { logs: ActivityLog[]; filters: ExportFilters } = await request.json()

    // Generate PDF content (simplified HTML for demonstration)
    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Activity Logs Report</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .header { text-align: center; margin-bottom: 30px; }
            .filters { background: #f5f5f5; padding: 15px; margin-bottom: 20px; border-radius: 5px; }
            .log-item { border-bottom: 1px solid #eee; padding: 10px 0; }
            .log-action { background: #e3f2fd; padding: 2px 8px; border-radius: 3px; font-size: 12px; }
            .log-meta { color: #666; font-size: 12px; margin-top: 5px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>TheBell - Activity Logs Report</h1>
            <p>Generated on ${format(new Date(), "MMMM d, yyyy 'at' h:mm a")}</p>
          </div>
          
          <div class="filters">
            <h3>Applied Filters:</h3>
            <p><strong>Search:</strong> ${filters.searchTerm || "None"}</p>
            <p><strong>Action:</strong> ${filters.actionFilter === "all" ? "All Actions" : filters.actionFilter}</p>
            <p><strong>User:</strong> ${filters.userFilter === "all" ? "All Users" : "Filtered"}</p>
          </div>

          <div class="logs">
            <h3>Activity Logs (${logs.length} entries)</h3>
            ${logs
              .map(
                (log: ActivityLog) => `
              <div class="log-item">
                <div>
                  <span class="log-action">${log.action.replace("_", " ").toUpperCase()}</span>
                  <strong>${log.description}</strong>
                </div>
                <div class="log-meta">
                  ${log.user?.full_name || "Unknown User"} • 
                  ${format(new Date(log.created_at), "MMM d, yyyy h:mm a")}
                  ${log.task?.title ? ` • Task: ${log.task.title}` : ""}
                </div>
              </div>
            `,
              )
              .join("")}
          </div>
        </body>
      </html>
    `

    // In a real implementation, you would use a library like Puppeteer or jsPDF
    // For now, we'll return the HTML as a simple text file
    const response = new NextResponse(htmlContent, {
      headers: {
        "Content-Type": "text/html",
        "Content-Disposition": `attachment; filename="activity-logs-${format(new Date(), "yyyy-MM-dd")}.html"`,
      },
    })

    return response
  } catch (error) {
    console.error("Error exporting activity logs:", error)
    return NextResponse.json({ error: "Export failed" }, { status: 500 })
  }
}
