"use client"

import type React from "react"
import { useEffect, useState, useRef, useCallback } from "react"
import { WebContainerManager } from "@/lib/web-container-manager"
import "./preview-section.css"

export interface PreviewSectionProps {
  weBuildString: string
  className?: string
  onError?: (error: string) => void
  onReady?: (url: string) => void
  onLoading?: (isLoading: boolean) => void
}

export const PreviewSection: React.FC<PreviewSectionProps> = ({ 
  weBuildString, 
  className = "", 
  onError, 
  onReady,
  onLoading 
}) => {
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const [serverUrl, setServerUrl] = useState<string | null>(null)
  const [progress, setProgress] = useState<string>("")
  const [retryCount, setRetryCount] = useState<number>(0)
  
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
  const updateLoadingState = useCallback((loading: boolean, progressText = "") => {
    setIsLoading(loading)
    setProgress(progressText)
    if (onLoading) {
      onLoading(loading)
    }
  }, [onLoading])

  // Handle error state
  const handleError = useCallback((errorMessage: string) => {
    setError(errorMessage)
    updateLoadingState(false)
    isUpdatingRef.current = false
    if (onError) {
      onError(errorMessage)
    }
  }, [onError, updateLoadingState])

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
        await new Promise(resolve => setTimeout(resolve, 1000))
      }

      setProgress("Preparing files...")
      await containerManager.updateFiles(weBuildString)
      
      setProgress("Starting development server...")
      // The server ready callback will handle the rest
      
    } catch (err) {
      let errorMessage = "Failed to load preview"
      
      if (err instanceof Error) {
        if (err.message.includes('Unable to create more instances')) {
          errorMessage = "WebContainer instance limit reached. Please refresh the page to reset the container."
        } else if (err.message.includes('SharedArrayBuffer')) {
          errorMessage = "WebContainer requires cross-origin isolation. Please ensure your site is served with the correct headers."
        } else if (err.message.includes('WebContainer initialization failed')) {
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

    setRetryCount(prev => prev + 1)
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
        await new Promise(resolve => setTimeout(resolve, 1000))
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
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      updatePreview()
    } catch (resetError) {
      console.error("Hard reset failed:", resetError)
      handleError("Hard reset failed. Please refresh the page manually.")
    }
  }, [weBuildString])

  // Loading state
  if (isLoading) {
    return (
      <div className={`preview-section loading ${className}`}>
        <div className="preview-header">
          <h3>Preview</h3>
          <div className="loading-indicator">
            <div className="spinner" aria-label="Loading"></div>
            <span>{progress || "Loading preview..."}</span>
          </div>
        </div>
        <div className="preview-placeholder">
          <div className="loading-content">
            <div className="loading-steps">
              <div className="step">
                <div className="step-icon">🔧</div>
                <span>Initializing WebContainer...</span>
              </div>
              <div className="step">
                <div className="step-icon">📁</div>
                <span>Setting up files...</span>
              </div>
              <div className="step">
                <div className="step-icon">📦</div>
                <span>Installing dependencies...</span>
              </div>
              <div className="step">
                <div className="step-icon">🚀</div>
                <span>Starting dev server...</span>
              </div>
            </div>
            <div className="loading-tips">
              <p>This may take a moment on first load...</p>
              {retryCount > 0 && <p>Retry attempt: {retryCount}/3</p>}
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className={`preview-section error ${className}`}>
        <div className="preview-header">
          <h3>Preview</h3>
          <div className="error-indicator">
            <span className="error-icon" role="img" aria-label="Error">⚠️</span>
            <span>Error</span>
          </div>
        </div>
        <div className="error-content">
          <div className="error-message">
            <p>Failed to load preview:</p>
            <code>{error}</code>
          </div>
          <div className="error-actions">
            <button 
              className="retry-button"
              onClick={handleRetry}
              disabled={retryCount >= 3}
              type="button"
            >
              🔄 Retry {retryCount > 0 && `(${retryCount}/3)`}
            </button>
            {retryCount >= 2 && (
              <button 
                className="reset-button"
                onClick={handleHardReset}
                type="button"
              >
                🔥 Hard Reset
              </button>
            )}
          </div>
          <div className="error-tips">
            <h4>Troubleshooting:</h4>
            <ul>
              <li>If you see "Unable to create more instances", refresh the page</li>
              <li>Ensure your browser supports SharedArrayBuffer</li>
              <li>Check browser console for additional error details</li>
              <li>Try using a different browser if issues persist</li>
            </ul>
          </div>
        </div>
      </div>
    )
  }

  // Success state
  return (
    <div className={`preview-section ${className}`}>
      <div className="preview-header">
        <h3>Preview</h3>
        <div className="header-controls">
          {serverUrl && (
            <div className="server-status">
              <span className="status-dot active" aria-label="Server running"></span>
              <span>Live</span>
            </div>
          )}
          {serverUrl && (
            <button
              className="external-link-button"
              onClick={() => window.open(serverUrl, '_blank')}
              title="Open in new tab"
              type="button"
            >
              🔗
            </button>
          )}
        </div>
      </div>
      <div className="preview-container">
        {serverUrl ? (
          <iframe
            ref={iframeRef}
            src={serverUrl}
            className="preview-iframe"
            title="Application Preview"
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals"
            loading="lazy"
            onLoad={() => {
              console.log('Preview iframe loaded')
            }}
            onError={() => {
              handleError('Failed to load preview in iframe')
            }}
          />
        ) : (
          <div className="preview-placeholder">
            <div className="placeholder-content">
              <div className="placeholder-icon">🚀</div>
              <p>Starting development server...</p>
              <small>This may take a moment on first load</small>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default PreviewSection