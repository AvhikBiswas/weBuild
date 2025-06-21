"use client"

import type React from "react"
import { useEffect, useState, useRef, useCallback } from "react"
import { WebContainerManager } from "@/lib/web-container-manager"
import { Button } from "@/components/ui/button"
import { Monitor, Tablet, Smartphone, ExternalLink, RotateCcw, AlertCircle } from "lucide-react"

export interface PreviewSectionProps {
  weBuildString: string
  className?: string
  onError?: (error: string) => void
  onReady?: (url: string) => void
  onLoading?: (isLoading: boolean) => void
}

const PreviewSection: React.FC<PreviewSectionProps> = ({
  weBuildString,
  className = "",
  onError,
  onReady,
  onLoading,
}) => {
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const [serverUrl, setServerUrl] = useState<string | null>(null)
  const [progress, setProgress] = useState<string>("")
  const [retryCount, setRetryCount] = useState<number>(0)
  const [selectedDevice, setSelectedDevice] = useState<"mobile" | "tablet" | "desktop">("desktop")

  const iframeRef = useRef<HTMLIFrameElement>(null)
  const containerManagerRef = useRef<WebContainerManager | null>(null)
  const cleanupRef = useRef<(() => void) | null>(null)
  const updateTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const isUpdatingRef = useRef<boolean>(false)

  // Initialize container manager once
  useEffect(() => {
    if (!containerManagerRef.current) {
      containerManagerRef.current = WebContainerManager.getInstance()
    }

    // Cleanup on unmount
    return () => {
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current)
      }
      if (cleanupRef.current) {
        cleanupRef.current()
      }
    }
  }, [])

  // Handle loading state changes
  const updateLoadingState = useCallback(
    (loading: boolean, progressText = "") => {
      setIsLoading(loading)
      setProgress(progressText)
      if (onLoading) {
        onLoading(loading)
      }
    },
    [onLoading],
  )

  // Handle error state
  const handleError = useCallback(
    (errorMessage: string) => {
      setError(errorMessage)
      updateLoadingState(false)
      isUpdatingRef.current = false
      if (onError) {
        onError(errorMessage)
      }
    },
    [onError, updateLoadingState],
  )

  // Set up server ready listener
  useEffect(() => {
    const containerManager = containerManagerRef.current
    if (!containerManager) return

    // Set up server ready listener
    cleanupRef.current = containerManager.onServerReady((url) => {
      console.log(`Server ready: ${url}`)
      setServerUrl(url)
      setError(null)
      setRetryCount(0)
      updateLoadingState(false)
      isUpdatingRef.current = false

      if (onReady) {
        onReady(url)
      }
    })

    // Check if server is already ready
    const currentUrl = containerManager.getServerUrl()
    if (currentUrl) {
      setServerUrl(currentUrl)
      if (onReady) {
        onReady(currentUrl)
      }
    }

    return () => {
      if (cleanupRef.current) {
        cleanupRef.current()
        cleanupRef.current = null
      }
    }
  }, [onReady, updateLoadingState])

  // Handle weBuild string changes with debouncing
  useEffect(() => {
    // Clear any existing timeout
    if (updateTimeoutRef.current) {
      clearTimeout(updateTimeoutRef.current)
    }

    if (!weBuildString.trim()) {
      handleError("No WeBuild string provided")
      return
    }

    // Skip if already updating
    if (isUpdatingRef.current) {
      return
    }

    // Debounce updates to avoid too frequent rebuilds
    updateTimeoutRef.current = setTimeout(() => {
      updatePreview()
    }, 500)

    return () => {
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current)
      }
    }
  }, [weBuildString])

  const updatePreview = async () => {
    const containerManager = containerManagerRef.current
    if (!containerManager || isUpdatingRef.current) {
      return
    }

    isUpdatingRef.current = true
    updateLoadingState(true, "Initializing WebContainer...")
    setError(null)

    try {
      // Check if container is ready
      if (!containerManager.isReady()) {
        setProgress("Setting up WebContainer...")
        await new Promise((resolve) => setTimeout(resolve, 1000))
      }

      setProgress("Preparing files...")
      console.log("weBuildString", weBuildString);
      
      await containerManager.updateFiles(weBuildString)

      setProgress("Starting development server...")
      // The server ready callback will handle the rest
    } catch (err) {
      let errorMessage = "Failed to load preview"

      if (err instanceof Error) {
        if (err.message.includes("Unable to create more instances")) {
          errorMessage = "WebContainer instance limit reached. Please refresh the page to reset the container."
        } else if (err.message.includes("SharedArrayBuffer")) {
          errorMessage =
            "WebContainer requires cross-origin isolation. Please ensure your site is served with the correct headers."
        } else if (err.message.includes("WebContainer initialization failed")) {
          errorMessage = err.message
        } else {
          errorMessage = `Preview error: ${err.message}`
        }
      }

      console.error("Preview update error:", err)
      handleError(errorMessage)
    }
  }

  // Retry function for error states
  const handleRetry = useCallback(async () => {
    if (retryCount >= 3) {
      handleError("Maximum retry attempts reached. Please refresh the page to reset the WebContainer.")
      return
    }

    setRetryCount((prev) => prev + 1)
    setError(null)

    // If we've retried before, try to reset the container
    if (retryCount > 0) {
      try {
        updateLoadingState(true, "Resetting WebContainer...")
        const containerManager = containerManagerRef.current
        if (containerManager) {
          await containerManager.cleanup()
          // Get a fresh instance
          containerManagerRef.current = WebContainerManager.getInstance()
        }
        await new Promise((resolve) => setTimeout(resolve, 1000))
      } catch (cleanupError) {
        console.warn("Failed to cleanup WebContainer:", cleanupError)
      }
    }

    updatePreview()
  }, [retryCount, weBuildString])

  // Hard reset function
  const handleHardReset = useCallback(async () => {
    try {
      updateLoadingState(true, "Performing hard reset...")

      // Reset the singleton instance
      WebContainerManager.resetInstance()

      // Clear all state
      setServerUrl(null)
      setError(null)
      setRetryCount(0)

      // Get fresh instance
      containerManagerRef.current = WebContainerManager.getInstance()

      // Wait a bit before retrying
      await new Promise((resolve) => setTimeout(resolve, 2000))

      updatePreview()
    } catch (resetError) {
      console.error("Hard reset failed:", resetError)
      handleError("Hard reset failed. Please refresh the page manually.")
    }
  }, [weBuildString])

  const deviceSizes = {
    mobile: { width: "375px", height: "667px" },
    tablet: { width: "768px", height: "1024px" },
    desktop: { width: "100%", height: "100%" },
  }

  // Loading state
  if (isLoading) {
    return (
      <div className={`h-full flex flex-col bg-gradient-to-br from-background to-muted/10 ${className}`}>
        <div className="border-b border-border p-4 flex items-center justify-between glass">
          <h3 className="text-sm font-semibold">PREVIEW</h3>
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></div>
            <span className="text-xs text-muted-foreground">Loading...</span>
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="text-center space-y-6 max-w-md">
            <div className="relative">
              <div className="w-16 h-16 bg-gradient-to-br from-primary/20 to-primary/10 rounded-full flex items-center justify-center mx-auto">
                <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
              </div>
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-semibold">Setting up Preview</h3>
              <p className="text-sm text-muted-foreground">{progress || "Initializing WebContainer..."}</p>
            </div>
            <div className="space-y-3 text-xs text-muted-foreground">
              <div className="flex items-center justify-center space-x-2">
                <div className="w-2 h-2 bg-primary rounded-full"></div>
                <span>Initializing WebContainer</span>
              </div>
              <div className="flex items-center justify-center space-x-2">
                <div className="w-2 h-2 bg-muted rounded-full"></div>
                <span>Setting up files</span>
              </div>
              <div className="flex items-center justify-center space-x-2">
                <div className="w-2 h-2 bg-muted rounded-full"></div>
                <span>Installing dependencies</span>
              </div>
              <div className="flex items-center justify-center space-x-2">
                <div className="w-2 h-2 bg-muted rounded-full"></div>
                <span>Starting dev server</span>
              </div>
            </div>
            {retryCount > 0 && <div className="text-xs text-yellow-600">Retry attempt: {retryCount}/3</div>}
          </div>
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className={`h-full flex flex-col bg-gradient-to-br from-background to-muted/10 ${className}`}>
        <div className="border-b border-border p-4 flex items-center justify-between glass">
          <h3 className="text-sm font-semibold">PREVIEW</h3>
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 text-destructive" />
            <span className="text-xs text-destructive">Error</span>
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="text-center space-y-6 max-w-md">
            <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mx-auto">
              <AlertCircle className="w-8 h-8 text-destructive" />
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-semibold">Preview Error</h3>
              <div className="bg-destructive/10 rounded-lg p-3">
                <code className="text-sm text-destructive">{error}</code>
              </div>
            </div>
            <div className="flex flex-col space-y-2">
              <Button variant="outline" onClick={handleRetry} disabled={retryCount >= 3} className="w-full">
                <RotateCcw className="w-4 h-4 mr-2" />
                Retry {retryCount > 0 && `(${retryCount}/3)`}
              </Button>
              {retryCount >= 2 && (
                <Button variant="destructive" onClick={handleHardReset} className="w-full">
                  Hard Reset
                </Button>
              )}
            </div>
            <div className="text-xs text-muted-foreground space-y-1">
              <p>
                <strong>Troubleshooting:</strong>
              </p>
              <ul className="text-left space-y-1">
                <li>• Refresh the page if instance limit reached</li>
                <li>• Ensure browser supports SharedArrayBuffer</li>
                <li>• Check browser console for details</li>
                <li>• Try a different browser if issues persist</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Success state
  return (
    <div className={`h-full flex flex-col bg-gradient-to-br from-background to-muted/10 ${className}`}>
      {/* Device Toggle */}
      <div className="border-b border-border p-4 flex items-center justify-between glass">
        <h3 className="text-sm font-semibold">PREVIEW</h3>
        <div className="flex items-center space-x-4">
          {serverUrl && (
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-xs text-muted-foreground">Live</span>
            </div>
          )}
          <div className="flex items-center space-x-1 bg-muted/50 rounded-lg p-1">
            <Button
              variant={selectedDevice === "mobile" ? "default" : "ghost"}
              size="sm"
              className="h-7 px-2"
              onClick={() => setSelectedDevice("mobile")}
            >
              <Smartphone className="w-3 h-3" />
            </Button>
            <Button
              variant={selectedDevice === "tablet" ? "default" : "ghost"}
              size="sm"
              className="h-7 px-2"
              onClick={() => setSelectedDevice("tablet")}
            >
              <Tablet className="w-3 h-3" />
            </Button>
            <Button
              variant={selectedDevice === "desktop" ? "default" : "ghost"}
              size="sm"
              className="h-7 px-2"
              onClick={() => setSelectedDevice("desktop")}
            >
              <Monitor className="w-3 h-3" />
            </Button>
          </div>
          {serverUrl && (
            <Button variant="ghost" size="sm" onClick={() => window.open(serverUrl, "_blank")} title="Open in new tab">
              <ExternalLink className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Preview Area */}
      <div className="flex-1 p-4 overflow-hidden">
        <div className="h-full flex items-center justify-center">
          <div
            className="bg-background border border-border rounded-lg shadow-2xl overflow-hidden transition-all duration-300"
            style={{
              width: deviceSizes[selectedDevice].width,
              height: deviceSizes[selectedDevice].height,
              maxWidth: "100%",
              maxHeight: "100%",
            }}
          >
            {serverUrl ? (
              <iframe
                ref={iframeRef}
                src={serverUrl}
                className="w-full h-full border-0"
                title="Application Preview"
                sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals"
                loading="lazy"
                onLoad={() => {
                  console.log("Preview iframe loaded")
                }}
                onError={() => {
                  handleError("Failed to load preview in iframe")
                }}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <div className="text-center space-y-4">
                  <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                    <Monitor className="w-6 h-6 text-primary" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-lg font-semibold">Starting Server</h3>
                    <p className="text-sm text-muted-foreground">Development server is starting up...</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default PreviewSection
