export interface FileNode {
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

export interface Message {
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

export interface ChatSession {
  id: string
  title: string
  createdAt: Date
  updatedAt: Date
  messages: Message[]
  projectName?: string
  projectType?: string
}

export interface ApiResponse {
  artifacts?: Record<string, string>
  headingMessage?: string
  description?: string
  error?: string | null
  metadata?: {
    tokensUsed?: number
    processingTime?: number
  }
}
