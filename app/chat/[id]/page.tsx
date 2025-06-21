"use client"

import { useState, useCallback, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { useSearchParams, useRouter } from "next/navigation"
import {
    Paperclip,
    RotateCcw,
    Copy,
    Code,
    Sparkles,
    ArrowUp,
    Eye,
    ChevronRight,
    ChevronDown,
    Folder,
    FolderOpen,
    X,
    FileText,
    GripVertical,
    Menu,
    PanelLeftClose,
    Loader2,
    AlertCircle,
    Download,
} from "lucide-react"

import { toast } from "@/components/ui/use-toast"


import { defaultFiles } from "@/prompts/next/defaultFile"
import PreviewSection from "@/components/PreviewSection"

interface FileNode {
    name: string
    type: "file" | "folder"
    children?: FileNode[]
    content?: string
    language?: string
    isOpen?: boolean
    path: string
    lastModified?: Date
    size?: number
}

interface Message {
    id: string
    type: "user" | "assistant"
    content: string
    timestamp: Date
    hasCode?: boolean
    isError?: boolean
    metadata?: {
        filesGenerated?: string[]
        tokensUsed?: number
        processingTime?: number
    }
}

interface ChatSession {
    id: string
    title: string
    createdAt: Date
    updatedAt: Date
    messages: Message[]
    projectName?: string
    projectType?: string
}

interface ApiResponse {
    artifacts?: Record<string, string>
    headingMessage?: string
    description?: string
    error?: string | null
    metadata?: {
        tokensUsed?: number
        processingTime?: number
    }
}

interface ChatPageProps {
    params: { id: string }
}

export default function ChatPage({ params }: ChatPageProps) {
    const searchParams = useSearchParams()
    const router = useRouter()
    const initialPrompt = searchParams.get("prompt")
    const messagesEndRef = useRef<HTMLDivElement>(null)

    // Core state
    const [session, setSession] = useState<ChatSession | null>(null)
    const [messages, setMessages] = useState<Message[]>([])
    const [input, setInput] = useState("")
    const [isGenerating, setIsGenerating] = useState(false)
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    // UI state
    const [selectedDevice, setSelectedDevice] = useState<"mobile" | "tablet" | "desktop">("desktop")
    const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set())
    const [selectedFile, setSelectedFile] = useState<string | null>(null)
    const [openTabs, setOpenTabs] = useState<string[]>([])
    const [activeTab, setActiveTab] = useState<string | null>(null)
    const [viewMode, setViewMode] = useState<"preview" | "code">("preview")
    const [projectFiles, setProjectFiles] = useState<FileNode | null>(null)
    const [codeFiles, setCodeFiles] = useState<Record<string, string>>({})

    // Panel sizing states
    const [chatWidth, setChatWidth] = useState(320)
    const [explorerWidth, setExplorerWidth] = useState(256)
    const [isResizing, setIsResizing] = useState<"chat" | "explorer" | null>(null)
    const [isChatCollapsed, setIsChatCollapsed] = useState(false)
    const [isExplorerCollapsed, setIsExplorerCollapsed] = useState(false)
    const [isMobile, setIsMobile] = useState(false)
    const [rowArtifact, setRowArtifact] = useState<string | null>(defaultFiles)

    // Auto-scroll to bottom of messages
    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
    }

    useEffect(() => {
        scrollToBottom()
    }, [messages])

    // Load chat session
    useEffect(() => {
        const loadSession = async () => {
            try {
                setIsLoading(true)
                setError(null)

                // Load existing session or create new one
                const response = await fetch(`/api/chat/${params.id}`)

                if (response.ok) {
                    const sessionData = await response.json()
                    setSession(sessionData)
                    setMessages(sessionData.messages || [])

                    // Load project files if they exist
                    if (sessionData.projectFiles) {
                        setProjectFiles(sessionData.projectFiles)
                        setCodeFiles(sessionData.codeFiles || {})

                        // Set up initial UI state
                        const firstFile = findFirstFile(sessionData.projectFiles)
                        if (firstFile) {
                            setSelectedFile(firstFile.path)
                            setActiveTab(firstFile.path)
                            setOpenTabs([firstFile.path])
                        }
                    }
                } else if (response.status === 404) {
                    // Create new session
                    const newSession: ChatSession = {
                        id: params.id,
                        title: "New Chat",
                        createdAt: new Date(),
                        updatedAt: new Date(),
                        messages: [],
                    }
                    setSession(newSession)

                    // If there's an initial prompt, process it
                    if (initialPrompt) {
                        await handleInitialPrompt(initialPrompt, newSession)
                    }
                } else {
                    throw new Error("Failed to load chat session")
                }
            } catch (err) {
                setError(err instanceof Error ? err.message : "Failed to load chat")
                toast({
                    title: "Error",
                    description: "Failed to load chat session",
                    variant: "destructive",
                })
            } finally {
                setIsLoading(false)
            }
        }

        loadSession()
    }, [params.id, initialPrompt])

    // Handle initial prompt
    const handleInitialPrompt = async (prompt: string, currentSession: ChatSession) => {
        const userMessage: Message = {
            id: generateId(),
            type: "user",
            content: prompt,
            timestamp: new Date(),
        }

        setMessages([userMessage])
        await processMessage(prompt, [userMessage], currentSession)
    }

    // Process message with AI
    const processMessage = async (content: string, currentMessages: Message[], currentSession: ChatSession) => {
        setIsGenerating(true)

        try {
            const response = await fetch("/api/llm", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    message: content,
                    availableFiles: getAvailableFiles(),
                    context: currentMessages.slice(-10), // Last 10 messages for context
                    sessionId: currentSession.id,
                }),
            })

            if (!response.ok) {
                throw new Error(`API request failed: ${response.statusText}`)
            }

            const data: ApiResponse = await response.json()

            if (data.error) {
                throw new Error(data.error)
            }

            // Process generated files
            if (data.artifacts) {
                const newCodeFiles = processArtifacts(data.artifacts)
                setCodeFiles((prev) => ({ ...prev, ...newCodeFiles }))

                // Update project structure
                const updatedProjectFiles = updateProjectStructure(Object.keys(newCodeFiles))
                setProjectFiles(updatedProjectFiles)
                setRowArtifact((prev) => prev + String(newCodeFiles));
                // Open first generated file if no file is currently open
                if (!activeTab && Object.keys(newCodeFiles).length > 0) {
                    const firstFile = Object.keys(newCodeFiles)[0]
                    setSelectedFile(firstFile)
                    setActiveTab(firstFile)
                    setOpenTabs([firstFile])
                }
            }

            // Add AI response
            const aiMessage: Message = {
                id: generateId(),
                type: "assistant",
                content: data.headingMessage || "I've processed your request.",
                timestamp: new Date(),
                hasCode: !!data.artifacts,
                metadata: {
                    filesGenerated: data.artifacts ? Object.keys(data.artifacts) : undefined,
                    tokensUsed: data.metadata?.tokensUsed,
                    processingTime: data.metadata?.processingTime,
                },
            }

            const updatedMessages = [...currentMessages, aiMessage]
            setMessages(updatedMessages)

            // Update session
            const updatedSession = {
                ...currentSession,
                messages: updatedMessages,
                updatedAt: new Date(),
                title: currentSession.title === "New Chat" ? generateTitle(content) : currentSession.title,
            }
            setSession(updatedSession)

            // Save session
            await saveSession(updatedSession)
        } catch (err) {
            const errorMessage: Message = {
                id: generateId(),
                type: "assistant",
                content: err instanceof Error ? err.message : "An error occurred while processing your request.",
                timestamp: new Date(),
                isError: true,
            }

            const updatedMessages = [...currentMessages, errorMessage]
            setMessages(updatedMessages)

            toast({
                title: "Error",
                description: errorMessage.content,
                variant: "destructive",
            })
        } finally {
            setIsGenerating(false)
        }
    }

    // Process artifacts from API response
    const processArtifacts = (artifacts: Record<string, string>): Record<string, string> => {
        const cleanCodeFiles: Record<string, string> = {}

        Object.entries(artifacts).forEach(([fileName, content]) => {
            try {
                // Extract content between weBuild tags if present
                const weBuildRegex = /<weBuild[^>]*>([\s\S]*?)<\/weBuild>/
                const match = content.match(weBuildRegex)

                if (match && match[1]) {
                    cleanCodeFiles[fileName] = match[1].trim()
                } else {
                    cleanCodeFiles[fileName] = content
                }
            } catch (error) {
                console.error(`Error processing artifact ${fileName}:`, error)
                cleanCodeFiles[fileName] = content
            }
        })

        return cleanCodeFiles
    }

    // Update project structure based on file paths
    const updateProjectStructure = (filePaths: string[]): FileNode => {
        const root: FileNode = {
            name: session?.projectName || "project",
            type: "folder",
            isOpen: true,
            path: "",
            children: [],
        }

        filePaths.forEach((filePath) => {
            const parts = filePath.split("/")
            let currentNode = root

            parts.forEach((part, index) => {
                const isFile = index === parts.length - 1
                const currentPath = parts.slice(0, index + 1).join("/")

                if (!currentNode.children) {
                    currentNode.children = []
                }

                let existingNode = currentNode.children.find((child) => child.name === part)

                if (!existingNode) {
                    existingNode = {
                        name: part,
                        type: isFile ? "file" : "folder",
                        path: currentPath,
                        children: isFile ? undefined : [],
                        isOpen: !isFile,
                        language: isFile ? getFileLanguage(part) : undefined,
                        lastModified: new Date(),
                        size: isFile ? codeFiles[filePath]?.length || 0 : undefined,
                    }
                    currentNode.children.push(existingNode)
                }

                if (!isFile) {
                    currentNode = existingNode
                }
            })
        })

        // Update expanded folders
        const newExpanded = new Set(expandedFolders)
        const addExpandedPaths = (node: FileNode, path = "") => {
            const fullPath = path ? `${path}/${node.name}` : node.name
            if (node.type === "folder" && node.isOpen) {
                newExpanded.add(fullPath)
            }
            if (node.children) {
                node.children.forEach((child) => addExpandedPaths(child, fullPath))
            }
        }
        addExpandedPaths(root)
        setExpandedFolders(newExpanded)

        return root
    }

    // Get available files for API context
    const getAvailableFiles = (): string[] => {
        if (!projectFiles) return []

        const files: string[] = []
        const traverse = (node: FileNode) => {
            if (node.type === "file") {
                files.push(node.path)
            } else if (node.children) {
                node.children.forEach(traverse)
            }
        }
        traverse(projectFiles)
        return files
    }

    // Find first file in project structure
    const findFirstFile = (node: FileNode): FileNode | null => {
        if (node.type === "file") return node
        if (node.children) {
            for (const child of node.children) {
                const result = findFirstFile(child)
                if (result) return result
            }
        }
        return null
    }

    // Save session to backend
    const saveSession = async (sessionData: ChatSession) => {
        try {
            await fetch(`/api/chat/${sessionData.id}`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    ...sessionData,
                    projectFiles,
                    codeFiles,
                }),
            })
        } catch (error) {
            console.error("Failed to save session:", error)
        }
    }

    // Handle sending new message
    const handleSendMessage = async () => {
        if (!input.trim() || !session) return

        const userMessage: Message = {
            id: generateId(),
            type: "user",
            content: input.trim(),
            timestamp: new Date(),
        }

        const updatedMessages = [...messages, userMessage]
        setMessages(updatedMessages)
        setInput("")

        await processMessage(userMessage.content, updatedMessages, session)
    }

    // Handle message retry
    const handleRetryMessage = async (messageId: string) => {
        const messageIndex = messages.findIndex((msg) => msg.id === messageId)
        if (messageIndex === -1 || !session) return

        const message = messages[messageIndex]
        if (message.type !== "user") return

        // Remove all messages after the selected message
        const updatedMessages = messages.slice(0, messageIndex + 1)
        setMessages(updatedMessages)

        await processMessage(message.content, updatedMessages, session)
    }

    // Copy message content
    const copyMessage = async (content: string) => {
        try {
            await navigator.clipboard.writeText(content)
            toast({
                title: "Copied",
                description: "Message copied to clipboard",
            })
        } catch (error) {
            toast({
                title: "Error",
                description: "Failed to copy message",
                variant: "destructive",
            })
        }
    }

    // Copy file content
    const copyFileContent = async (filePath: string) => {
        const content = codeFiles[filePath]
        if (!content) return

        try {
            await navigator.clipboard.writeText(content)
            toast({
                title: "Copied",
                description: `${filePath} copied to clipboard`,
            })
        } catch (error) {
            toast({
                title: "Error",
                description: "Failed to copy file content",
                variant: "destructive",
            })
        }
    }

    // Download project files
    const downloadProject = () => {
        const zip = new JSZip()

        Object.entries(codeFiles).forEach(([filePath, content]) => {
            zip.file(filePath, content)
        })

        zip.generateAsync({ type: "blob" }).then((content) => {
            const url = URL.createObjectURL(content)
            const a = document.createElement("a")
            a.href = url
            a.download = `${session?.projectName || "project"}.zip`
            document.body.appendChild(a)
            a.click()
            document.body.removeChild(a)
            URL.revokeObjectURL(url)
        })
    }

    // Utility functions
    const generateId = () => Math.random().toString(36).substr(2, 9)

    const generateTitle = (prompt: string) => {
        const words = prompt.split(" ").slice(0, 5)
        return words.join(" ") + (words.length < prompt.split(" ").length ? "..." : "")
    }

    const getFileLanguage = (fileName: string): string => {
        const ext = fileName.split(".").pop()?.toLowerCase()
        const languageMap: Record<string, string> = {
            tsx: "typescript",
            ts: "typescript",
            jsx: "javascript",
            js: "javascript",
            css: "css",
            scss: "scss",
            html: "html",
            json: "json",
            md: "markdown",
            py: "python",
            java: "java",
            cpp: "cpp",
            c: "c",
        }
        return languageMap[ext || ""] || "text"
    }

    const formatTimestamp = (date: Date): string => {
        const now = new Date()
        const diff = now.getTime() - date.getTime()
        const minutes = Math.floor(diff / 60000)

        if (minutes < 1) return "Just now"
        if (minutes < 60) return `${minutes}m ago`
        if (minutes < 1440) return `${Math.floor(minutes / 60)}h ago`
        return date.toLocaleDateString()
    }

    // Resize handlers
    const handleMouseDown = useCallback((panel: "chat" | "explorer") => {
        setIsResizing(panel)
        document.body.style.cursor = "col-resize"
        document.body.style.userSelect = "none"
    }, [])

    const handleMouseMove = useCallback(
        (e: MouseEvent) => {
            if (!isResizing) return

            if (isResizing === "chat") {
                const newWidth = Math.max(280, Math.min(500, e.clientX))
                setChatWidth(newWidth)
            } else if (isResizing === "explorer") {
                const newWidth = Math.max(200, Math.min(400, e.clientX - chatWidth))
                setExplorerWidth(newWidth)
            }
        },
        [isResizing, chatWidth],
    )

    const handleMouseUp = useCallback(() => {
        setIsResizing(null)
        document.body.style.cursor = ""
        document.body.style.userSelect = ""
    }, [])

    // Effect for mouse events
    useEffect(() => {
        if (isResizing) {
            document.addEventListener("mousemove", handleMouseMove)
            document.addEventListener("mouseup", handleMouseUp)
            return () => {
                document.removeEventListener("mousemove", handleMouseMove)
                document.removeEventListener("mouseup", handleMouseUp)
            }
        }
    }, [isResizing, handleMouseMove, handleMouseUp])

    // Responsive handling
    useEffect(() => {
        const handleResize = () => {
            const mobile = window.innerWidth < 768
            setIsMobile(mobile)
            if (mobile) {
                setIsChatCollapsed(true)
                setIsExplorerCollapsed(true)
            }
        }

        handleResize()
        window.addEventListener("resize", handleResize)
        return () => window.removeEventListener("resize", handleResize)
    }, [])

    // File tree operations
    const toggleFolder = (folderPath: string) => {
        const newExpanded = new Set(expandedFolders)
        if (newExpanded.has(folderPath)) {
            newExpanded.delete(folderPath)
        } else {
            newExpanded.add(folderPath)
        }
        setExpandedFolders(newExpanded)
    }

    const openFile = (filePath: string) => {
        if (!openTabs.includes(filePath)) {
            setOpenTabs([...openTabs, filePath])
        }
        setActiveTab(filePath)
        setSelectedFile(filePath)
    }

    const closeTab = (filePath: string) => {
        const newTabs = openTabs.filter((tab) => tab !== filePath)
        setOpenTabs(newTabs)
        if (activeTab === filePath && newTabs.length > 0) {
            setActiveTab(newTabs[newTabs.length - 1])
        } else if (newTabs.length === 0) {
            setActiveTab(null)
        }
    }

    const getFileIcon = (fileName: string, type: string) => {
        if (type === "folder") return null

        const ext = fileName.split(".").pop()?.toLowerCase()

        if (ext === "tsx" || ext === "ts") {
            return (
                <div className="w-4 h-4 bg-blue-500 rounded-sm flex items-center justify-center text-white text-xs font-bold">
                    TS
                </div>
            )
        }
        if (ext === "jsx" || ext === "js") {
            return (
                <div className="w-4 h-4 bg-yellow-500 rounded-sm flex items-center justify-center text-white text-xs font-bold">
                    JS
                </div>
            )
        }
        if (ext === "css" || ext === "scss") {
            return (
                <div className="w-4 h-4 bg-purple-500 rounded-sm flex items-center justify-center text-white text-xs font-bold">
                    CSS
                </div>
            )
        }
        if (ext === "json") {
            return (
                <div className="w-4 h-4 bg-green-500 rounded-sm flex items-center justify-center text-white text-xs font-bold">
                    JSON
                </div>
            )
        }
        return <FileText className="w-4 h-4 text-gray-500" />
    }

    const renderFileTree = (node: FileNode, level = 0) => {
        const isExpanded = expandedFolders.has(node.path)
        const isSelected = selectedFile === node.path

        return (
            <div key={node.path}>
                <div
                    className={`flex items-center space-x-2 py-1 px-2 rounded cursor-pointer hover:bg-muted/50 ${isSelected && node.type === "file" ? "bg-muted" : ""
                        }`}
                    style={{ paddingLeft: `${level * 16 + 8}px` }}
                    onClick={() => {
                        if (node.type === "folder") {
                            toggleFolder(node.path)
                        } else {
                            openFile(node.path)
                        }
                    }}
                >
                    {node.type === "folder" ? (
                        <>
                            {isExpanded ? (
                                <ChevronDown className="w-4 h-4 text-muted-foreground" />
                            ) : (
                                <ChevronRight className="w-4 h-4 text-muted-foreground" />
                            )}
                            {isExpanded ? (
                                <FolderOpen className="w-4 h-4 text-blue-500" />
                            ) : (
                                <Folder className="w-4 h-4 text-blue-500" />
                            )}
                        </>
                    ) : (
                        <>
                            <div className="w-4" />
                            {getFileIcon(node.name, node.type)}
                        </>
                    )}
                    <span className={`text-sm truncate ${isSelected && node.type === "file" ? "font-medium" : ""}`}>
                        {node.name}
                    </span>
                    {node.type === "file" && node.lastModified && (
                        <span className="text-xs text-muted-foreground ml-auto">{formatTimestamp(node.lastModified)}</span>
                    )}
                </div>
                {node.type === "folder" && isExpanded && node.children && (
                    <div>{node.children.map((child) => renderFileTree(child, level + 1))}</div>
                )}
            </div>
        )
    }

    // Loading state
    if (isLoading) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="flex items-center space-x-2">
                    <Loader2 className="w-6 h-6 animate-spin" />
                    <span>Loading chat session...</span>
                </div>
            </div>
        )
    }

    // Error state
    if (error) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="text-center space-y-4">
                    <AlertCircle className="w-12 h-12 text-destructive mx-auto" />
                    <h2 className="text-xl font-semibold">Error Loading Chat</h2>
                    <p className="text-muted-foreground">{error}</p>
                    <Button onClick={() => router.push("/")}>Go Home</Button>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-background">
            <div className="flex h-screen overflow-hidden">
                {/* Mobile Menu Button */}
                {isMobile && (
                    <div className="fixed top-4 left-4 z-50 md:hidden">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setIsChatCollapsed(!isChatCollapsed)}
                            className="bg-background"
                        >
                            <Menu className="w-4 h-4" />
                        </Button>
                    </div>
                )}

                {/* Chat Sidebar */}
                {(!isMobile || !isChatCollapsed) && (
                    <div
                        className={`${isMobile ? "fixed inset-y-0 left-0 z-40 bg-background" : "relative"} border-r border-border flex flex-col bg-card transition-all duration-200`}
                        style={{ width: isMobile ? "100vw" : `${chatWidth}px` }}
                    >
                        {/* Chat Header */}
                        <div className="border-b border-border p-4">
                            <div className="flex items-start justify-between mb-3">
                                <div className="flex-1">
                                    <h1 className="text-lg font-semibold text-foreground mb-1">{session?.title || "New Chat"}</h1>
                                    <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                                        <Badge variant="secondary" className="text-xs px-2 py-1">
                                            <Sparkles className="w-3 h-3 mr-1" />
                                            AI Assistant
                                        </Badge>
                                        {session?.projectType && (
                                            <>
                                                <span>•</span>
                                                <span>{session.projectType}</span>
                                            </>
                                        )}
                                    </div>
                                </div>
                                <div className="flex items-center space-x-1">
                                    {projectFiles && (
                                        <Button variant="ghost" size="sm" onClick={downloadProject}>
                                            <Download className="w-4 h-4" />
                                        </Button>
                                    )}
                                    {isMobile && (
                                        <Button variant="ghost" size="sm" onClick={() => setIsChatCollapsed(true)}>
                                            <X className="w-4 h-4" />
                                        </Button>
                                    )}
                                    {!isMobile && (
                                        <Button variant="ghost" size="sm" onClick={() => setIsChatCollapsed(!isChatCollapsed)}>
                                            <PanelLeftClose className="w-4 h-4" />
                                        </Button>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Messages */}
                        <ScrollArea className="flex-1 px-4">
                            <div className="space-y-4 py-4">
                                {messages.map((message) => (
                                    <div key={message.id} className="space-y-2">
                                        <div className="flex items-center space-x-2">
                                            {message.type === "assistant" && (
                                                <Avatar className="w-5 h-5">
                                                    <AvatarFallback
                                                        className={`text-white text-xs font-medium ${message.isError ? "bg-destructive" : "bg-gradient-to-br from-purple-500 to-pink-500"
                                                            }`}
                                                    >
                                                        {message.isError ? "!" : "AI"}
                                                    </AvatarFallback>
                                                </Avatar>
                                            )}
                                            <span className="text-xs font-medium text-foreground">
                                                {message.type === "user" ? "You" : "AI"}
                                            </span>
                                            <span className="text-xs text-muted-foreground">{formatTimestamp(message.timestamp)}</span>
                                            {message.metadata?.filesGenerated && (
                                                <Badge variant="outline" className="text-xs">
                                                    {message.metadata.filesGenerated.length} files
                                                </Badge>
                                            )}
                                        </div>
                                        <div className={`${message.type === "assistant" ? "ml-7" : ""}`}>
                                            <div className="prose prose-sm max-w-none text-foreground">
                                                <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
                                            </div>
                                            {message.type === "assistant" && (
                                                <div className="flex items-center space-x-2 mt-2">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-6 text-xs"
                                                        onClick={() => copyMessage(message.content)}
                                                    >
                                                        <Copy className="w-3 h-3 mr-1" />
                                                        Copy
                                                    </Button>
                                                    {message.type === "assistant" && !message.isError && (
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            className="h-6 text-xs"
                                                            onClick={() => handleRetryMessage(message.id)}
                                                        >
                                                            <RotateCcw className="w-3 h-3 mr-1" />
                                                            Retry
                                                        </Button>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                                {isGenerating && (
                                    <div className="space-y-2">
                                        <div className="flex items-center space-x-2">
                                            <Avatar className="w-5 h-5">
                                                <AvatarFallback className="bg-gradient-to-br from-purple-500 to-pink-500 text-white text-xs font-medium">
                                                    AI
                                                </AvatarFallback>
                                            </Avatar>
                                            <span className="text-xs font-medium text-foreground">AI</span>
                                            <span className="text-xs text-muted-foreground">Just now</span>
                                        </div>
                                        <div className="ml-7">
                                            <div className="flex items-center space-x-2">
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                                <span className="text-xs text-muted-foreground">Generating response...</span>
                                            </div>
                                        </div>
                                    </div>
                                )}
                                <div ref={messagesEndRef} />
                            </div>
                        </ScrollArea>

                        {/* Input Area */}
                        <div className="border-t border-border p-4">
                            <div className="relative">
                                <Textarea
                                    placeholder="Describe what you want to build or modify..."
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    className="min-h-[60px] pr-12 resize-none text-sm"
                                    disabled={isGenerating}
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter" && !e.shiftKey) {
                                            e.preventDefault()
                                            handleSendMessage()
                                        }
                                    }}
                                />
                                <div className="absolute bottom-2 right-2 flex items-center space-x-1">
                                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                                        <Paperclip className="w-3 h-3" />
                                    </Button>
                                    <Button
                                        size="sm"
                                        className="h-6 w-6 p-0 bg-foreground text-background hover:bg-foreground/90"
                                        onClick={handleSendMessage}
                                        disabled={!input.trim() || isGenerating}
                                    >
                                        {isGenerating ? <Loader2 className="w-3 h-3 animate-spin" /> : <ArrowUp className="w-3 h-3" />}
                                    </Button>
                                </div>
                            </div>
                        </div>

                        {/* Resize Handle */}
                        {!isMobile && !isChatCollapsed && (
                            <div
                                className="absolute top-0 right-0 w-1 h-full cursor-col-resize bg-transparent hover:bg-blue-500/20 transition-colors group"
                                onMouseDown={() => handleMouseDown("chat")}
                            >
                                <div className="absolute top-1/2 right-0 transform -translate-y-1/2 translate-x-1/2">
                                    <GripVertical className="w-3 h-3 text-muted-foreground group-hover:text-blue-500" />
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* File Explorer */}
                {projectFiles && (!isMobile || !isExplorerCollapsed) && (
                    <div
                        className={`${isMobile ? "fixed inset-y-0 right-0 z-30 bg-background" : "relative"} border-r border-border bg-card flex flex-col transition-all duration-200`}
                        style={{ width: isMobile ? "80vw" : `${explorerWidth}px` }}
                    >
                        {/* Explorer Header */}
                        <div className="border-b border-border p-3">
                            <div className="flex items-center justify-between mb-2">
                                <h3 className="text-sm font-semibold text-foreground">EXPLORER</h3>
                                <div className="flex items-center space-x-1">
                                    {isMobile && (
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-6 w-6 p-0"
                                            onClick={() => setIsExplorerCollapsed(true)}
                                        >
                                            <X className="w-3 h-3" />
                                        </Button>
                                    )}
                                </div>
                            </div>
                            <div className="text-xs text-muted-foreground">{Object.keys(codeFiles).length} files</div>
                        </div>

                        {/* File Tree */}
                        <ScrollArea className="flex-1">
                            <div className="p-2">{renderFileTree(projectFiles)}</div>
                        </ScrollArea>

                        {/* Resize Handle */}
                        {!isMobile && !isExplorerCollapsed && (
                            <div
                                className="absolute top-0 right-0 w-1 h-full cursor-col-resize bg-transparent hover:bg-blue-500/20 transition-colors group"
                                onMouseDown={() => handleMouseDown("explorer")}
                            >
                                <div className="absolute top-1/2 right-0 transform -translate-y-1/2 translate-x-1/2">
                                    <GripVertical className="w-3 h-3 text-muted-foreground group-hover:text-blue-500" />
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Main Content Area */}
                <div className="flex-1 flex flex-col min-w-0">
                    {/* Top Bar */}
                    {openTabs.length > 0 && (
                        <div className="border-b border-border flex-shrink-0">
                            {/* Tabs */}
                            <div className="flex items-center min-h-[40px]">
                                <div className="flex-1 flex items-center overflow-x-auto">
                                    {openTabs.map((tab) => (
                                        <div
                                            key={tab}
                                            className={`flex items-center space-x-2 px-3 py-2 border-r border-border cursor-pointer text-sm min-w-0 ${activeTab === tab ? "bg-background" : "bg-muted/50 hover:bg-muted"
                                                }`}
                                            onClick={() => setActiveTab(tab)}
                                        >
                                            <div className="flex-shrink-0">{getFileIcon(tab.split("/").pop() || "", "file")}</div>
                                            <span className="truncate max-w-32">{tab.split("/").pop()}</span>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-4 w-4 p-0 hover:bg-muted-foreground/20 flex-shrink-0"
                                                onClick={(e) => {
                                                    e.stopPropagation()
                                                    closeTab(tab)
                                                }}
                                            >
                                                <X className="w-3 h-3" />
                                            </Button>
                                        </div>
                                    ))}
                                </div>

                                {/* View Mode Toggle */}
                                <div className="flex items-center border-l border-border flex-shrink-0">
                                    <Button
                                        variant={viewMode === "preview" ? "default" : "ghost"}
                                        size="sm"
                                        className="rounded-none h-10"
                                        onClick={() => setViewMode("preview")}
                                    >
                                        <Eye className="w-4 h-4 mr-1" />
                                        <span className="hidden sm:inline">Preview</span>
                                    </Button>
                                    <Button
                                        variant={viewMode === "code" ? "default" : "ghost"}
                                        size="sm"
                                        className="rounded-none h-10"
                                        onClick={() => setViewMode("code")}
                                    >
                                        <Code className="w-4 h-4 mr-1" />
                                        <span className="hidden sm:inline">Code</span>
                                    </Button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Content Area */}
                    <div className="flex-1 overflow-hidden">
                        {!activeTab ? (
                            /* Welcome State */
                            <div className="h-full flex items-center justify-center bg-muted/20">
                                <div className="text-center space-y-4">
                                    <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto">
                                        <Code className="w-8 h-8 text-muted-foreground" />
                                    </div>
                                    <h3 className="text-lg font-semibold">No File Selected</h3>
                                    <p className="text-muted-foreground max-w-md">
                                        {projectFiles
                                            ? "Select a file from the explorer to view its contents"
                                            : "Start a conversation to generate your first project files"}
                                    </p>
                                </div>
                            </div>
                        ) : viewMode === "preview" ? (
                            /* Preview Mode */
                            <PreviewSection weBuildString={rowArtifact || ""} />
                        ) : (
                            /* Code Mode */
                            <div className="h-full bg-gray-900 text-gray-100 flex flex-col">
                                <div className="flex items-center justify-between px-4 py-2 bg-gray-800 border-b border-gray-700 flex-shrink-0">
                                    <span className="text-sm font-medium truncate">{activeTab}</span>
                                    <div className="flex items-center space-x-2">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="text-gray-400 hover:text-white"
                                            onClick={() => copyFileContent(activeTab)}
                                        >
                                            <Copy className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </div>
                                <ScrollArea className="flex-1">
                                    <pre className="p-4 text-sm leading-relaxed">
                                        <code>{codeFiles[activeTab] || "// Loading file content..."}</code>
                                    </pre>
                                </ScrollArea>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
