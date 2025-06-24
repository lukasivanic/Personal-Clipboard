"use client"

import { useState, useEffect } from "react"
import { supabase, type ClipboardItem } from "@/lib/supabase"
import { useToast } from "@/hooks/use-toast"

// Helper to safely check if we're in a browser environment
const isBrowser = () => typeof window !== "undefined"

export function useClipboardData() {
  const [items, setItems] = useState<ClipboardItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [sessionId, setSessionIdState] = useState<string>("")
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

  const fetchItems = async () => {
    try {
      setLoading(true)
      const currentSessionId = getSessionId()

      if (!currentSessionId) {
        setItems([])
        setLoading(false)
        return
      }

      const { data, error } = await supabase
        .from("clipboard_items")
        .select("*")
        .eq("user_id", currentSessionId)
        .order("timestamp", { ascending: false })

      if (error) throw error

      setItems(data || [])
      setError(null)
    } catch (err) {
      console.error("Error fetching items:", err)
      setError("Failed to load clipboard items")
      if (isBrowser()) {
        toast({
          title: "Error",
          description: "Failed to load clipboard items",
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

      if (error) throw error

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
        description: "Failed to add item",
        variant: "destructive",
      })
      throw err
    }
  }

  const toggleFavorite = async (id: string, currentFavorite: boolean) => {
    try {
      const { error } = await supabase.from("clipboard_items").update({ is_favorite: !currentFavorite }).eq("id", id)

      if (error) throw error

      setItems((prev) => prev.map((item) => (item.id === id ? { ...item, is_favorite: !currentFavorite } : item)))
    } catch (err) {
      console.error("Error toggling favorite:", err)
      toast({
        title: "Error",
        description: "Failed to update favorite",
        variant: "destructive",
      })
    }
  }

  const deleteItem = async (id: string) => {
    try {
      const { error } = await supabase.from("clipboard_items").delete().eq("id", id)

      if (error) throw error

      setItems((prev) => prev.filter((item) => item.id !== id))

      toast({
        title: "Deleted",
        description: "Item removed from clipboard",
      })
    } catch (err) {
      console.error("Error deleting item:", err)
      toast({
        title: "Error",
        description: "Failed to delete item",
        variant: "destructive",
      })
    }
  }

  // Initialize session ID and fetch items only on the client side
  useEffect(() => {
    if (isBrowser()) {
      const id = getSessionId()
      setSessionIdState(id)
      fetchItems()

      // Set up real-time subscription
      if (id) {
        const channel = supabase
          .channel("clipboard_changes")
          .on(
            "postgres_changes",
            {
              event: "*",
              schema: "public",
              table: "clipboard_items",
              filter: `user_id=eq.${id}`,
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
          supabase.removeChannel(channel)
        }
      }
    }
  }, [])

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
    addItem,
    toggleFavorite,
    deleteItem,
    refetch: fetchItems,
    sessionId,
    setSessionId,
  }
}
