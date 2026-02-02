/**
 * Server-side validation utilities
 * Use these functions to validate and sanitize user inputs
 */

// Valid roles in the system
export const VALID_ROLES = [
  "bellman",
  "bell_captain",
  "phone_operator",
  "manager",
  "front_desk",
  "admin",
  "operator",
  "bell_staff",
] as const

export type ValidRole = (typeof VALID_ROLES)[number]

// Roles that can only be assigned by admins
export const ADMIN_ONLY_ROLES: ValidRole[] = ["admin", "manager"]

// Roles that can be self-selected (for future use if needed)
export const SELF_ASSIGNABLE_ROLES: ValidRole[] = ["bellman"]

export const VALID_TASK_STATUSES = [
  "pending",
  "in_progress",
  "completed",
  "cancelled",
  "empty_room",
] as const

export const VALID_TASK_PRIORITIES = ["low", "medium", "high", "urgent"] as const

export const VALID_TASK_CATEGORIES = [
  "maintenance",
  "housekeeping",
  "guest_service",
  "delivery",
  "other",
  "check_in",
  "check_out",
  "room_move",
] as const

/**
 * Sanitize a string input by trimming and limiting length
 */
export function sanitizeString(
  input: unknown,
  maxLength: number = 255,
  defaultValue: string = ""
): string {
  if (typeof input !== "string") return defaultValue
  return input.trim().slice(0, maxLength)
}

/**
 * Sanitize an email address
 */
export function sanitizeEmail(input: unknown): string {
  const email = sanitizeString(input, 255, "").toLowerCase()
  // Basic email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email) ? email : ""
}

/**
 * Validate and sanitize a role
 */
export function validateRole(input: unknown): ValidRole | null {
  const role = sanitizeString(input, 50, "").toLowerCase()
  if (VALID_ROLES.includes(role as ValidRole)) {
    return role as ValidRole
  }
  return null
}

/**
 * Validate task status
 */
export function validateTaskStatus(input: unknown): string | null {
  const status = sanitizeString(input, 50, "").toLowerCase()
  if (VALID_TASK_STATUSES.includes(status as any)) {
    return status
  }
  return null
}

/**
 * Validate task priority
 */
export function validateTaskPriority(input: unknown): string | null {
  const priority = sanitizeString(input, 50, "").toLowerCase()
  if (VALID_TASK_PRIORITIES.includes(priority as any)) {
    return priority
  }
  return null
}

/**
 * Sanitize a UUID
 */
export function sanitizeUUID(input: unknown): string | null {
  const uuid = sanitizeString(input, 36, "")
  // UUID v4 regex
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  return uuidRegex.test(uuid) ? uuid : null
}

/**
 * Sanitize a phone number
 */
export function sanitizePhone(input: unknown): string {
  const phone = sanitizeString(input, 20, "")
  // Remove all non-digit characters except + and spaces
  return phone.replace(/[^\d+\s()-]/g, "")
}

/**
 * Sanitize a room number
 */
export function sanitizeRoomNumber(input: unknown): string {
  return sanitizeString(input, 20, "")
    .replace(/[^a-zA-Z0-9-]/g, "")
    .toUpperCase()
}

/**
 * Escape HTML to prevent XSS
 */
export function escapeHtml(input: string): string {
  const htmlEntities: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  }
  return input.replace(/[&<>"']/g, (char) => htmlEntities[char] || char)
}

/**
 * Validate that a user can update another user's role
 * Returns true if the action is allowed
 */
export function canUpdateUserRole(
  currentUserRole: ValidRole,
  targetRole: ValidRole,
  isSuperAdmin: boolean = false
): boolean {
  // Super admins can do anything
  if (isSuperAdmin) return true

  // Only admins and managers can update roles
  if (!["admin", "manager"].includes(currentUserRole)) return false

  // Managers cannot create admins
  if (currentUserRole === "manager" && targetRole === "admin") return false

  return true
}

/**
 * Rate limiting helper - check if action should be allowed
 * Returns the number of seconds to wait, or 0 if allowed
 */
const rateLimitStore = new Map<string, { count: number; resetTime: number }>()

export function checkRateLimit(
  key: string,
  maxRequests: number = 10,
  windowMs: number = 60000
): { allowed: boolean; retryAfter?: number } {
  const now = Date.now()
  const entry = rateLimitStore.get(key)

  if (!entry || now > entry.resetTime) {
    rateLimitStore.set(key, { count: 1, resetTime: now + windowMs })
    return { allowed: true }
  }

  if (entry.count >= maxRequests) {
    return {
      allowed: false,
      retryAfter: Math.ceil((entry.resetTime - now) / 1000),
    }
  }

  entry.count++
  return { allowed: true }
}

/**
 * Validate export request data
 */
export interface ExportValidationResult {
  valid: boolean
  error?: string
}

export function validateExportRequest(
  data: unknown
): ExportValidationResult {
  if (!data || typeof data !== "object") {
    return { valid: false, error: "Invalid request body" }
  }

  const { logs, filters } = data as any

  // Logs must be an array
  if (!Array.isArray(logs)) {
    return { valid: false, error: "Logs must be an array" }
  }

  // Limit number of logs to prevent abuse
  if (logs.length > 10000) {
    return { valid: false, error: "Too many logs to export (max 10,000)" }
  }

  return { valid: true }
}
