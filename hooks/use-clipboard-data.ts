"use client"

import { useState, useEffect } from "react"
import { supabase, testConnection, type ClipboardItem } from "@/lib/supabase"
import { useToast } from "@/hooks/use-toast"

// Helper to safely check if we're in a browser environment
const isBrowser = () => typeof window !== "undefined"

export function useClipboardData() {
  const [items, setItems] = useState<ClipboardItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [sessionId, setSessionIdState] = useState<string>("")
  const [connectionStatus, setConnectionStatus] = useState<"connecting" | "connected" | "error">("connecting")
  const { toast } = useToast()

  // Generate a simple user ID for demo purposes (in production, use proper auth)
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
    try {
      const result = await testConnection()
      if (result.success) {
        setConnectionStatus("connected")
        setError(null)
        return true
      } else {
        setConnectionStatus("error")
        setError(`Database connection failed: ${result.message}`)
        return false
      }
    } catch (err) {
      setConnectionStatus("error")
      setError(`Connection test failed: ${err.message}`)
      return false
    }
  }

  const fetchItems = async () => {
    try {
      setLoading(true)
      setError(null)

      // Test connection first
      const isConnected = await testDatabaseConnection()
      if (!isConnected) {
        setLoading(false)
        return
      }

      const currentSessionId = getSessionId()

      if (!currentSessionId) {
        setItems([])
        setLoading(false)
        return
      }

      console.log("Fetching items for session:", currentSessionId)

      const { data, error } = await supabase
        .from("clipboard_items")
        .select("*")
        .eq("user_id", currentSessionId)
        .order("timestamp", { ascending: false })

      if (error) {
        console.error("Supabase error:", error)
        throw new Error(`Database query failed: ${error.message}`)
      }

      console.log("Fetched items:", data)
      setItems(data || [])
      setConnectionStatus("connected")
    } catch (err) {
      console.error("Error fetching items:", err)
      setConnectionStatus("error")
      setError(err.message || "Failed to load clipboard items")

      if (isBrowser()) {
        toast({
          title: "Connection Error",
          description: err.message || "Failed to load clipboard items. Check your internet connection.",
          variant: "destructive",
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

      if (connectionStatus !== "connected") {
        throw new Error("Not connected to database")
      }

      console.log("Adding item for session:", currentSessionId)

      const { data, error } = await supabase
        .from("clipboard_items")
        .insert([
          {
            content: content.trim(),
            title: title?.trim() || null,
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

      console.log("Added item:", data)
      setItems((prev) => [data, ...prev])

      toast({
        title: "Added to clipboard",
        description: "Item saved successfully",
      })

      return data
    } catch (err) {
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
      if (connectionStatus !== "connected") {
        throw new Error("Not connected to database")
      }

      const { error } = await supabase.from("clipboard_items").update({ is_favorite: !currentFavorite }).eq("id", id)

      if (error) {
        console.error("Update error:", error)
        throw new Error(`Failed to update favorite: ${error.message}`)
      }

      setItems((prev) => prev.map((item) => (item.id === id ? { ...item, is_favorite: !currentFavorite } : item)))
    } catch (err) {
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
      if (connectionStatus !== "connected") {
        throw new Error("Not connected to database")
      }

      const { error } = await supabase.from("clipboard_items").delete().eq("id", id)

      if (error) {
        console.error("Delete error:", error)
        throw new Error(`Failed to delete item: ${error.message}`)
      }

      setItems((prev) => prev.filter((item) => item.id !== id))

      toast({
        title: "Deleted",
        description: "Item removed from clipboard",
      })
    } catch (err) {
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

  // Set up real-time subscription only after successful connection
  useEffect(() => {
    if (isBrowser() && sessionId && connectionStatus === "connected") {
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
                // Avoid duplicates
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
    addItem,
    toggleFavorite,
    deleteItem,
    refetch: fetchItems,
    sessionId,
    setSessionId,
  }
}
