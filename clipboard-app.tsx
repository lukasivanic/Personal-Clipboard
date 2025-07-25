"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Copy, Star, StarOff, Trash2, Search, Plus, Clock, Heart, Wifi, WifiOff, RefreshCw } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useClipboardData } from "@/hooks/use-clipboard-data"
import { SessionManager } from "@/components/session-manager"

export default function ClipboardApp() {
  const {
    items,
    loading,
    error,
    connectionStatus,
    addItem,
    toggleFavorite,
    deleteItem,
    refetch,
    sessionId,
    setSessionId,
  } = useClipboardData()
  const [newContent, setNewContent] = useState("")
  const [newTitle, setNewTitle] = useState("")
  const [searchQuery, setSearchQuery] = useState("")
  const [isAddingItem, setIsAddingItem] = useState(false)
  const { toast } = useToast()

  const handleAddItem = async () => {
    if (!newContent.trim()) return

    try {
      setIsAddingItem(true)
      await addItem(newContent, newTitle)
      setNewContent("")
      setNewTitle("")
    } catch (err) {
      // Error is handled in the hook
    } finally {
      setIsAddingItem(false)
    }
  }

  const copyToClipboard = async (content: string) => {
    try {
      await navigator.clipboard.writeText(content)
      toast({
        title: "Copied!",
        description: "Content copied to clipboard",
      })
    } catch (err) {
      toast({
        title: "Copy failed",
        description: "Unable to copy to clipboard",
        variant: "destructive",
      })
    }
  }

  const filteredItems = items.filter(
    (item) =>
      item.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.title && item.title.toLowerCase().includes(searchQuery.toLowerCase())),
  )

  const favoriteItems = filteredItems.filter((item) => item.is_favorite)
  const historyItems = filteredItems

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)

    if (minutes < 1) return "Just now"
    if (minutes < 60) return `${minutes}m ago`
    if (hours < 24) return `${hours}h ago`
    return `${days}d ago`
  }

  const ClipboardItemCard = ({ item }: { item: any }) => (
    <Card className="group hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            {item.title && <h3 className="font-medium text-sm mb-2 truncate">{item.title}</h3>}
            <p className="text-sm text-muted-foreground break-words line-clamp-3 mb-2">{item.content}</p>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">
                {formatTimestamp(item.timestamp)}
              </Badge>
              {item.is_favorite && (
                <Badge variant="secondary" className="text-xs">
                  <Star className="w-3 h-3 mr-1 fill-current" />
                  Favorite
                </Badge>
              )}
            </div>
          </div>
          <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => copyToClipboard(item.content)}>
              <Copy className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => toggleFavorite(item.id, item.is_favorite)}
            >
              {item.is_favorite ? <StarOff className="w-4 h-4" /> : <Star className="w-4 h-4" />}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-destructive hover:text-destructive"
              onClick={() => deleteItem(item.id)}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )

  const LoadingSkeleton = () => (
    <div className="grid gap-4">
      {[1, 2, 3].map((i) => (
        <Card key={i}>
          <CardContent className="p-4">
            <div className="space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-1/2" />
              <div className="flex gap-2">
                <Skeleton className="h-6 w-16" />
                <Skeleton className="h-6 w-20" />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-4 max-w-4xl">
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2">Personal Clipboard</h1>
              <p className="text-muted-foreground">Save, organize, and sync your clipboard across all devices</p>
            </div>
            <div className="flex items-center gap-2">
              {sessionId && (
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  {connectionStatus === "connected" && <Wifi className="w-4 h-4 text-green-500" />}
                  {connectionStatus === "connecting" && <RefreshCw className="w-4 h-4 text-yellow-500 animate-spin" />}
                  {connectionStatus === "error" && <WifiOff className="w-4 h-4 text-red-500" />}
                  <span>
                    Session: {sessionId}
                    {connectionStatus === "connecting" && " (Connecting...)"}
                    {connectionStatus === "error" && " (Offline)"}
                  </span>
                </div>
              )}
              <SessionManager currentSessionId={sessionId} onSessionChange={setSessionId} />
              <Button variant="ghost" size="icon" onClick={refetch}>
                <RefreshCw className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        {error && (
          <Card className="mb-6 border-destructive">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-destructive">
                <WifiOff className="w-4 h-4" />
                <span>{error}</span>
                <Button variant="outline" size="sm" onClick={refetch}>
                  Retry
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Add new item */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="w-5 h-5" />
              Add to Clipboard
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input placeholder="Title (optional)" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} />
            <Textarea
              placeholder="Paste or type your content here..."
              value={newContent}
              onChange={(e) => setNewContent(e.target.value)}
              rows={4}
            />
            <Button onClick={handleAddItem} disabled={!newContent.trim() || isAddingItem}>
              {isAddingItem ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Adding...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Item
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Search */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Search clipboard items..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Tabs for History and Favorites */}
        <Tabs defaultValue="history" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="history" className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              History ({historyItems.length})
            </TabsTrigger>
            <TabsTrigger value="favorites" className="flex items-center gap-2">
              <Heart className="w-4 h-4" />
              Favorites ({favoriteItems.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="history" className="mt-6">
            {loading ? (
              <LoadingSkeleton />
            ) : historyItems.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <Clock className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-medium mb-2">No clipboard items</h3>
                  <p className="text-muted-foreground">
                    {searchQuery ? "No items match your search" : "Start by adding your first clipboard item above"}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {historyItems.map((item) => (
                  <ClipboardItemCard key={item.id} item={item} />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="favorites" className="mt-6">
            {loading ? (
              <LoadingSkeleton />
            ) : favoriteItems.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <Heart className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-medium mb-2">No favorites yet</h3>
                  <p className="text-muted-foreground">
                    {searchQuery
                      ? "No favorite items match your search"
                      : "Star items from your history to add them to favorites"}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {favoriteItems.map((item) => (
                  <ClipboardItemCard key={item.id} item={item} />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
