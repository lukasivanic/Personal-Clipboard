import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Add validation to ensure environment variables are present
if (!supabaseUrl || !supabaseAnonKey) {
  console.error("Missing Supabase environment variables")
  console.error("NEXT_PUBLIC_SUPABASE_URL:", supabaseUrl ? "Present" : "Missing")
  console.error("NEXT_PUBLIC_SUPABASE_ANON_KEY:", supabaseAnonKey ? "Present" : "Missing")
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false, // Disable auth persistence for now
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
})

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
  try {
    const { data, error } = await supabase.from("clipboard_items").select("count").limit(1)
    if (error) throw error
    return { success: true, message: "Connection successful" }
  } catch (error) {
    return { success: false, message: error.message }
  }
}
