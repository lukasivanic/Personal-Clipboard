import { createClient } from "@supabase/supabase-js"

// Check if we're in browser environment
const isBrowser = () => typeof window !== "undefined"

// Get environment variables with fallbacks
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ""
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""

// Check if Supabase is properly configured
export const isSupabaseConfigured = () => {
  return !!(supabaseUrl && supabaseAnonKey && supabaseUrl.startsWith("https://"))
}

// Log environment variable status (only in browser to avoid server-side logging)
if (isBrowser()) {
  console.log("Supabase Configuration Check:")
  console.log("URL:", supabaseUrl ? `✓ ${supabaseUrl.substring(0, 20)}...` : "✗ Missing")
  console.log("Key:", supabaseAnonKey ? "✓ Present" : "✗ Missing")
  console.log("Configured:", isSupabaseConfigured() ? "✓ Yes" : "✗ No - Using offline mode")
}

export const supabase = isSupabaseConfigured()
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

// Test connection function - only runs if Supabase is configured
export const testConnection = async () => {
  if (!isSupabaseConfigured() || !supabase) {
    return {
      success: false,
      message: "Supabase not configured - missing or invalid environment variables",
    }
  }

  try {
    // Use a simple query that doesn't require the table to exist
    const { error } = await supabase.from("clipboard_items").select("id").limit(1)

    if (error) {
      // If table doesn't exist, that's still a "successful" connection
      if (error.message.includes('relation "clipboard_items" does not exist')) {
        return {
          success: false,
          message: "Database table not created yet - run the setup script",
        }
      }
      throw error
    }

    return { success: true, message: "Connection successful" }
  } catch (error: any) {
    return {
      success: false,
      message: `Connection failed: ${error.message || "Unknown error"}`,
    }
  }
}
