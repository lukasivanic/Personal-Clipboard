import { createClient } from "@supabase/supabase-js"

// Check if we're in browser environment
const isBrowser = () => typeof window !== "undefined"

// Get environment variables with fallbacks
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ""
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""

// Log environment variable status (only in browser to avoid server-side logging)
if (isBrowser()) {
  console.log("Supabase Environment Check:")
  console.log("URL:", supabaseUrl ? "✓ Present" : "✗ Missing")
  console.log("Key:", supabaseAnonKey ? "✓ Present" : "✗ Missing")
}

export const supabase =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
          persistSession: false,
        },
        realtime: {
          params: {
            eventsPerSecond: 10,
          },
        },
      })
    : null

export type ClipboardItem = {
  id: string
  content: string
  title?: string
  timestamp: string
  is_favorite: boolean
  user_id?: string
}

// Test connection function
export const testConnection = async () => {
  if (!supabase) {
    return {
      success: false,
      message: "Supabase not configured - missing environment variables",
    }
  }

  try {
    const { data, error } = await supabase.from("clipboard_items").select("count").limit(1)
    if (error) throw error
    return { success: true, message: "Connection successful" }
  } catch (error: any) {
    return {
      success: false,
      message: `Connection failed: ${error.message || "Unknown error"}`,
    }
  }
}
