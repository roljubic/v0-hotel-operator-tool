import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { format } from "date-fns"

interface Task {
  id: string
  title: string
  status: "pending" | "in_progress" | "completed" | "cancelled"
  priority: "low" | "medium" | "high" | "urgent"
  category: string
  room_number?: string
  created_at: string
}

interface User {
  id: string
  full_name: string
  role: string
  is_active: boolean
}

interface ActivityLog {
  id: string
  action: string
  created_at: string
}

interface UserProfile {
  role: string
  full_name: string
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data: userProfile } = (await supabase
      .from("users")
      .select("role, full_name")
      .eq("id", user.id)
      .single()) as { data: UserProfile | null }

    if (!userProfile || !["admin", "manager", "operator"].includes(userProfile.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const {
      reportType,
      dateRange,
      tasks,
      users,
      activityLogs,
    }: {
      reportType: string
      dateRange: number
      tasks: Task[]
      users: User[]
      activityLogs: ActivityLog[]
    } = await request.json()

    const taskStats = {
      total: tasks.length,
      completed: tasks.filter((t: Task) => t.status === "completed").length,
      pending: tasks.filter((t: Task) => t.status === "pending").length,
      inProgress: tasks.filter((t: Task) => t.status === "in_progress").length,
      urgent: tasks.filter((t: Task) => t.priority === "urgent").length,
    }

    const completionRate = taskStats.total > 0 ? Math.round((taskStats.completed / taskStats.total) * 100) : 0

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>${reportType.toUpperCase()} Report</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            .header { text-align: center; margin-bottom: 30px; }
            .stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; margin-bottom: 30px; }
            .stat-card { border: 1px solid #ddd; padding: 15px; border-radius: 5px; text-align: center; }
            .stat-number { font-size: 24px; font-weight: bold; color: #2563eb; }
            .stat-label { font-size: 12px; color: #666; margin-top: 5px; }
            .section { margin-bottom: 30px; }
            .task-item { border-bottom: 1px solid #eee; padding: 10px 0; }
            .priority-urgent { color: #dc2626; font-weight: bold; }
            .priority-high { color: #ea580c; }
            .priority-medium { color: #ca8a04; }
            .priority-low { color: #16a34a; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>TheBell - ${reportType.toUpperCase()} Report</h1>
            <p>Generated on ${format(new Date(), "MMMM d, yyyy 'at' h:mm a")}</p>
            <p>Date Range: Last ${dateRange} days</p>
          </div>
          
          <div class="stats">
            <div class="stat-card">
              <div class="stat-number">${taskStats.total}</div>
              <div class="stat-label">Total Tasks</div>
            </div>
            <div class="stat-card">
              <div class="stat-number">${completionRate}%</div>
              <div class="stat-label">Completion Rate</div>
            </div>
            <div class="stat-card">
              <div class="stat-number">${users.filter((u: User) => u.is_active).length}</div>
              <div class="stat-label">Active Users</div>
            </div>
            <div class="stat-card">
              <div class="stat-number">${activityLogs.length}</div>
              <div class="stat-label">Activities</div>
            </div>
          </div>

          <div class="section">
            <h2>Task Summary</h2>
            <p><strong>Completed:</strong> ${taskStats.completed} tasks</p>
            <p><strong>In Progress:</strong> ${taskStats.inProgress} tasks</p>
            <p><strong>Pending:</strong> ${taskStats.pending} tasks</p>
            <p><strong>Urgent:</strong> ${taskStats.urgent} tasks</p>
          </div>

          ${
            reportType === "tasks" || reportType === "overview"
              ? `
          <div class="section">
            <h2>Recent Tasks</h2>
            ${tasks
              .slice(0, 20)
              .map(
                (task: Task) => `
              <div class="task-item">
                <div>
                  <strong>${task.title}</strong>
                  <span class="priority-${task.priority}">[${task.priority.toUpperCase()}]</span>
                </div>
                <div style="font-size: 12px; color: #666; margin-top: 5px;">
                  Status: ${task.status.replace("_", " ").toUpperCase()} • 
                  Category: ${task.category.replace("_", " ")} • 
                  Created: ${format(new Date(task.created_at), "MMM d, yyyy")}
                  ${task.room_number ? ` • Room: ${task.room_number}` : ""}
                </div>
              </div>
            `,
              )
              .join("")}
          </div>
          `
              : ""
          }

          <div class="section">
            <h2>Report Generated By</h2>
            <p>User: ${userProfile.full_name || "System"}</p>
            <p>Role: ${userProfile.role.replace("_", " ").toUpperCase()}</p>
            <p>Generated: ${format(new Date(), "MMMM d, yyyy 'at' h:mm a")}</p>
          </div>
        </body>
      </html>
    `

    const response = new NextResponse(htmlContent, {
      headers: {
        "Content-Type": "text/html",
        "Content-Disposition": `attachment; filename="${reportType}-report-${format(new Date(), "yyyy-MM-dd")}.html"`,
      },
    })

    return response
  } catch (error) {
    console.error("Error exporting report:", error)
    return NextResponse.json({ error: "Export failed" }, { status: 500 })
  }
}
