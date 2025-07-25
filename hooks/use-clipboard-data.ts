"use client"

import { useState, useEffect } from "react"
import { supabase, testConnection, isSupabaseConfigured, type ClipboardItem } from "@/lib/supabase"
import { useToast } from "@/hooks/use-toast"

// Helper to safely check if we're in a browser environment
const isBrowser = () => typeof window !== "undefined"

// LocalStorage fallback functions
const STORAGE_KEY = "clipboard-items"

const saveToLocalStorage = (items: ClipboardItem[]) => {
  if (isBrowser()) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
    } catch (error) {
      console.error("Failed to save to localStorage:", error)
    }
  }
}

const loadFromLocalStorage = (): ClipboardItem[] => {
  if (!isBrowser()) return []

  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored ? JSON.parse(stored) : []
  } catch (error) {
    console.error("Failed to load from localStorage:", error)
    return []
  }
}

const generateId = () => Math.random().toString(36).substr(2, 9)

export function useClipboardData() {
  const [items, setItems] = useState<ClipboardItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [sessionId, setSessionIdState] = useState<string>("")
  const [connectionStatus, setConnectionStatus] = useState<"connecting" | "connected" | "offline">("connecting")
  const [useOfflineMode, setUseOfflineMode] = useState(!isSupabaseConfigured())
  const { toast } = useToast()

  // Generate a simple user ID for demo purposes
  const getSessionId = () => {
    if (!isBrowser()) return ""

    let id = localStorage.getItem("clipboard-session-id")
    if (!id) {
      id = Math.random().toString(36).substr(2, 8).toUpperCase()
      localStorage.setItem("clipboard-session-id", id)
    }
    return id
  }

  const testDatabaseConnection = async () => {
    // Skip connection test if Supabase is not configured
    if (!isSupabaseConfigured()) {
      setConnectionStatus("offline")
      setUseOfflineMode(true)
      setError("Supabase not configured - using offline mode")
      return false
    }

    try {
      const result = await testConnection()
      if (result.success) {
        setConnectionStatus("connected")
        setUseOfflineMode(false)
        setError(null)
        return true
      } else {
        setConnectionStatus("offline")
        setUseOfflineMode(true)
        setError(`Database unavailable - using offline mode: ${result.message}`)
        return false
      }
    } catch (err: any) {
      setConnectionStatus("offline")
      setUseOfflineMode(true)
      setError(`Connection failed - using offline mode: ${err.message}`)
      return false
    }
  }

  const fetchItems = async () => {
    try {
      setLoading(true)
      setError(null)

      const currentSessionId = getSessionId()
      if (!currentSessionId) {
        setItems([])
        setLoading(false)
        return
      }

      // If Supabase is not configured, go straight to offline mode
      if (!isSupabaseConfigured()) {
        console.log("Supabase not configured - using localStorage")
        setConnectionStatus("offline")
        setUseOfflineMode(true)

        const localItems = loadFromLocalStorage()
        const sessionItems = localItems.filter((item) => item.user_id === currentSessionId)
        setItems(sessionItems)

        setError("Using offline mode - Supabase not configured")
        setLoading(false)
        return
      }

      // Test connection only if Supabase is configured
      const isConnected = await testDatabaseConnection()

      if (isConnected && supabase) {
        // Use database
        console.log("Fetching from database for session:", currentSessionId)

        const { data, error } = await supabase
          .from("clipboard_items")
          .select("*")
          .eq("user_id", currentSessionId)
          .order("timestamp", { ascending: false })

        if (error) {
          console.error("Database error:", error)
          throw new Error(`Database query failed: ${error.message}`)
        }

        console.log("Fetched from database:", data)
        setItems(data || [])
      } else {
        // Use localStorage fallback
        console.log("Using localStorage fallback")
        const localItems = loadFromLocalStorage()
        const sessionItems = localItems.filter((item) => item.user_id === currentSessionId)
        setItems(sessionItems)

        if (isBrowser() && !isConnected) {
          toast({
            title: "Offline Mode",
            description: "Using local storage. Data won't sync across devices.",
            variant: "default",
          })
        }
      }
    } catch (err: any) {
      console.error("Error fetching items:", err)
      setConnectionStatus("offline")
      setUseOfflineMode(true)

      // Fallback to localStorage
      const localItems = loadFromLocalStorage()
      const currentSessionId = getSessionId()
      const sessionItems = localItems.filter((item) => item.user_id === currentSessionId)
      setItems(sessionItems)

      setError(`Using offline mode: ${err.message}`)

      if (isBrowser()) {
        toast({
          title: "Offline Mode",
          description: "Using local storage due to connection error.",
          variant: "default",
        })
      }
    } finally {
      setLoading(false)
    }
  }

  const addItem = async (content: string, title?: string) => {
    try {
      const currentSessionId = getSessionId()
      if (!currentSessionId) {
        throw new Error("No session ID available")
      }

      const newItem: ClipboardItem = {
        id: generateId(),
        content: content.trim(),
        title: title?.trim() || undefined,
        timestamp: new Date().toISOString(),
        is_favorite: false,
        user_id: currentSessionId,
      }

      // Always use localStorage if offline mode or Supabase not configured
      if (useOfflineMode || !isSupabaseConfigured() || !supabase) {
        console.log("Adding to localStorage")
        const allItems = loadFromLocalStorage()
        const updatedItems = [newItem, ...allItems]
        saveToLocalStorage(updatedItems)
        setItems((prev) => [newItem, ...prev])

        toast({
          title: "Added to clipboard (Offline)",
          description: "Item saved locally",
        })

        return newItem
      }

      // Try database first
      try {
        console.log("Adding to database for session:", currentSessionId)

        const { data, error } = await supabase
          .from("clipboard_items")
          .insert([
            {
              content: newItem.content,
              title: newItem.title || null,
              user_id: currentSessionId,
              is_favorite: false,
            },
          ])
          .select()
          .single()

        if (error) {
          console.error("Insert error:", error)
          throw new Error(`Failed to add item: ${error.message}`)
        }

        console.log("Added to database:", data)
        setItems((prev) => [data, ...prev])

        toast({
          title: "Added to clipboard",
          description: "Item saved and synced",
        })

        return data
      } catch (dbError) {
        // Fallback to localStorage on database error
        console.log("Database failed, falling back to localStorage:", dbError)

        const allItems = loadFromLocalStorage()
        const updatedItems = [newItem, ...allItems]
        saveToLocalStorage(updatedItems)
        setItems((prev) => [newItem, ...prev])

        toast({
          title: "Added to clipboard (Offline)",
          description: "Item saved locally due to connection error",
        })

        return newItem
      }
    } catch (err: any) {
      console.error("Error adding item:", err)
      toast({
        title: "Error",
        description: err.message || "Failed to add item",
        variant: "destructive",
      })
      throw err
    }
  }

  const toggleFavorite = async (id: string, currentFavorite: boolean) => {
    try {
      if (useOfflineMode || !isSupabaseConfigured() || !supabase) {
        // Use localStorage
        const allItems = loadFromLocalStorage()
        const updatedItems = allItems.map((item) =>
          item.id === id ? { ...item, is_favorite: !currentFavorite } : item,
        )
        saveToLocalStorage(updatedItems)
        setItems((prev) => prev.map((item) => (item.id === id ? { ...item, is_favorite: !currentFavorite } : item)))
        return
      }

      // Try database
      try {
        const { error } = await supabase.from("clipboard_items").update({ is_favorite: !currentFavorite }).eq("id", id)

        if (error) {
          console.error("Update error:", error)
          throw new Error(`Failed to update favorite: ${error.message}`)
        }

        setItems((prev) => prev.map((item) => (item.id === id ? { ...item, is_favorite: !currentFavorite } : item)))
      } catch (dbError) {
        // Fallback to localStorage
        const allItems = loadFromLocalStorage()
        const updatedItems = allItems.map((item) =>
          item.id === id ? { ...item, is_favorite: !currentFavorite } : item,
        )
        saveToLocalStorage(updatedItems)
        setItems((prev) => prev.map((item) => (item.id === id ? { ...item, is_favorite: !currentFavorite } : item)))
      }
    } catch (err: any) {
      console.error("Error toggling favorite:", err)
      toast({
        title: "Error",
        description: err.message || "Failed to update favorite",
        variant: "destructive",
      })
    }
  }

  const deleteItem = async (id: string) => {
    try {
      if (useOfflineMode || !isSupabaseConfigured() || !supabase) {
        // Use localStorage
        const allItems = loadFromLocalStorage()
        const updatedItems = allItems.filter((item) => item.id !== id)
        saveToLocalStorage(updatedItems)
        setItems((prev) => prev.filter((item) => item.id !== id))
      } else {
        // Try database
        try {
          const { error } = await supabase.from("clipboard_items").delete().eq("id", id)

          if (error) {
            console.error("Delete error:", error)
            throw new Error(`Failed to delete item: ${error.message}`)
          }

          setItems((prev) => prev.filter((item) => item.id !== id))
        } catch (dbError) {
          // Fallback to localStorage
          const allItems = loadFromLocalStorage()
          const updatedItems = allItems.filter((item) => item.id !== id)
          saveToLocalStorage(updatedItems)
          setItems((prev) => prev.filter((item) => item.id !== id))
        }
      }

      toast({
        title: "Deleted",
        description: "Item removed from clipboard",
      })
    } catch (err: any) {
      console.error("Error deleting item:", err)
      toast({
        title: "Error",
        description: err.message || "Failed to delete item",
        variant: "destructive",
      })
    }
  }

  // Initialize session ID and fetch items only on the client side
  useEffect(() => {
    if (isBrowser()) {
      const id = getSessionId()
      setSessionIdState(id)

      // Add a small delay to ensure DOM is ready
      const timer = setTimeout(() => {
        fetchItems()
      }, 100)

      return () => clearTimeout(timer)
    }
  }, [])

  // Set up real-time subscription only if connected and Supabase is configured
  useEffect(() => {
    if (isBrowser() && sessionId && connectionStatus === "connected" && isSupabaseConfigured() && supabase) {
      console.log("Setting up real-time subscription for session:", sessionId)

      const channel = supabase
        .channel("clipboard_changes")
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "clipboard_items",
            filter: `user_id=eq.${sessionId}`,
          },
          (payload) => {
            console.log("Real-time update:", payload)

            if (payload.eventType === "INSERT") {
              setItems((prev) => {
                if (prev.some((item) => item.id === payload.new.id)) {
                  return prev
                }
                return [payload.new as ClipboardItem, ...prev]
              })
            } else if (payload.eventType === "UPDATE") {
              setItems((prev) =>
                prev.map((item) => (item.id === payload.new.id ? (payload.new as ClipboardItem) : item)),
              )
            } else if (payload.eventType === "DELETE") {
              setItems((prev) => prev.filter((item) => item.id !== payload.old.id))
            }
          },
        )
        .subscribe()

      return () => {
        console.log("Cleaning up real-time subscription")
        supabase.removeChannel(channel)
      }
    }
  }, [sessionId, connectionStatus])

  const setSessionId = (newSessionId: string) => {
    if (isBrowser()) {
      localStorage.setItem("clipboard-session-id", newSessionId.toUpperCase())
      setSessionIdState(newSessionId.toUpperCase())
      fetchItems() // Reload data with new session
    }
  }

  return {
    items,
    loading,
    error,
    connectionStatus,
    useOfflineMode,
    addItem,
    toggleFavorite,
    deleteItem,
    refetch: fetchItems,
    sessionId,
    setSessionId,
  }
}
