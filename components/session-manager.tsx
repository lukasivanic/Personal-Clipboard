"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Copy, Settings, Smartphone, Share } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface SessionManagerProps {
  currentSessionId: string
  onSessionChange: (sessionId: string) => void
}

export function SessionManager({ currentSessionId, onSessionChange }: SessionManagerProps) {
  const [newSessionId, setNewSessionId] = useState("")
  const [isOpen, setIsOpen] = useState(false)
  const { toast } = useToast()

  const copySessionId = async () => {
    try {
      await navigator.clipboard.writeText(currentSessionId)
      toast({
        title: "Copied!",
        description: "Session ID copied to clipboard",
      })
    } catch (err) {
      toast({
        title: "Copy failed",
        description: "Unable to copy session ID",
        variant: "destructive",
      })
    }
  }

  const joinSession = () => {
    if (newSessionId.trim()) {
      onSessionChange(newSessionId.trim())
      setNewSessionId("")
      setIsOpen(false)
      toast({
        title: "Session changed",
        description: `Now syncing with session: ${newSessionId.trim().toUpperCase()}`,
      })
    }
  }

  const generateNewSession = () => {
    const newId = Math.random().toString(36).substr(2, 8).toUpperCase()
    onSessionChange(newId)
    setIsOpen(false)
    toast({
      title: "New session created",
      description: `New session ID: ${newId}`,
    })
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Settings className="w-4 h-4 mr-2" />
          Sync Settings
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share className="w-5 h-5" />
            Device Sync Settings
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-6">
          <div>
            <h3 className="text-sm font-medium mb-3">Current Session</h3>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="font-mono text-lg px-3 py-1">
                {currentSessionId || "Loading..."}
              </Badge>
              <Button variant="ghost" size="icon" onClick={copySessionId} disabled={!currentSessionId}>
                <Copy className="w-4 h-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Share this ID with your other devices to sync clipboard data
            </p>
          </div>

          <div className="border-t pt-4">
            <h3 className="text-sm font-medium mb-3">Join Existing Session</h3>
            <div className="flex gap-2">
              <Input
                placeholder="Enter session ID"
                value={newSessionId}
                onChange={(e) => setNewSessionId(e.target.value.toUpperCase())}
                className="font-mono"
              />
              <Button onClick={joinSession} disabled={!newSessionId.trim()}>
                Join
              </Button>
            </div>
          </div>

          <div className="border-t pt-4">
            <h3 className="text-sm font-medium mb-3">Create New Session</h3>
            <Button variant="outline" onClick={generateNewSession} className="w-full">
              Generate New Session ID
            </Button>
            <p className="text-xs text-muted-foreground mt-2">
              This will create a new session and clear your current clipboard data
            </p>
          </div>

          <div className="bg-muted p-4 rounded-lg">
            <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
              <Smartphone className="w-4 h-4" />
              How to sync devices:
            </h4>
            <ol className="text-xs text-muted-foreground space-y-1">
              <li>1. Copy your session ID from above</li>
              <li>2. Open the app on your other device</li>
              <li>3. Click "Sync Settings" and paste the session ID</li>
              <li>4. Click "Join" to start syncing</li>
            </ol>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
