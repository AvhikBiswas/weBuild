"use client"

import React from "react"

import { useState, useRef, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  Paperclip,
  Download,
  Share,
  RotateCcw,
  Copy,
  Code,
  Smartphone,
  Monitor,
  Tablet,
  ExternalLink,
  Sparkles,
  Zap,
  ImageIcon,
  ArrowUp,
  MoreHorizontal,
  Eye,
  ChevronRight,
  ChevronDown,
  Folder,
  FolderOpen,
  X,
  Plus,
  Search,
  FileText,
  RefreshCw,
  GripVertical,
  Menu,
  PanelLeftClose,
  PanelRightClose,
} from "lucide-react"

interface FileNode {
  name: string
  type: "file" | "folder"
  children?: FileNode[]
  content?: string
  language?: string
  isOpen?: boolean
}

export default function Message({ params }: { params: { id: string } }) {
  const [messages, setMessages] = useState([
    {
      id: 1,
      type: "user" as const,
      content:
        "Create a modern e-commerce product page with image gallery, product details, reviews, and add to cart functionality. Make it responsive and include a clean, professional design.",
      timestamp: "2 hours ago",
    },
    {
      id: 2,
      type: "assistant" as const,
      content:
        "I'll create a modern e-commerce product page for you with all the features you requested. This will include an image gallery with zoom functionality, detailed product information, customer reviews section, and a responsive add to cart component.",
      timestamp: "2 hours ago",
      hasCode: true,
    },
    {
      id: 3,
      type: "user" as const,
      content: "Can you add a related products section at the bottom and make the reviews more interactive?",
      timestamp: "1 hour ago",
    },
    {
      id: 4,
      type: "assistant" as const,
      content:
        "Perfect! I've added a related products section with product recommendations and made the reviews section more interactive with helpful/not helpful buttons and review filtering options.",
      timestamp: "1 hour ago",
      hasCode: true,
    },
  ])

  const [input, setInput] = useState("")
  const [isGenerating, setIsGenerating] = useState(false)
  const [selectedDevice, setSelectedDevice] = useState<"mobile" | "tablet" | "desktop">("desktop")
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(["app", "components", "lib"]))
  const [selectedFile, setSelectedFile] = useState("app/page.tsx")
  const [openTabs, setOpenTabs] = useState<string[]>(["app/page.tsx", "components/product-gallery.tsx"])
  const [activeTab, setActiveTab] = useState("app/page.tsx")
  const [viewMode, setViewMode] = useState<"preview" | "code">("preview")

  // Panel sizing states
  const [chatWidth, setChatWidth] = useState(320)
  const [explorerWidth, setExplorerWidth] = useState(256)
  const [isResizing, setIsResizing] = useState<"chat" | "explorer" | null>(null)
  const [isChatCollapsed, setIsChatCollapsed] = useState(false)
  const [isExplorerCollapsed, setIsExplorerCollapsed] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  const chatResizeRef = useRef<HTMLDivElement>(null)
  const explorerResizeRef = useRef<HTMLDivElement>(null)

  const projectFiles: FileNode = {
    name: "ecommerce-product-page",
    type: "folder",
    isOpen: true,
    children: [
      {
        name: "app",
        type: "folder",
        isOpen: true,
        children: [
          { name: "page.tsx", type: "file", language: "tsx" },
          { name: "layout.tsx", type: "file", language: "tsx" },
          { name: "globals.css", type: "file", language: "css" },
          { name: "loading.tsx", type: "file", language: "tsx" },
        ],
      },
      {
        name: "components",
        type: "folder",
        isOpen: true,
        children: [
          {
            name: "ui",
            type: "folder",
            children: [
              { name: "button.tsx", type: "file", language: "tsx" },
              { name: "card.tsx", type: "file", language: "tsx" },
              { name: "badge.tsx", type: "file", language: "tsx" },
              { name: "input.tsx", type: "file", language: "tsx" },
            ],
          },
          { name: "product-gallery.tsx", type: "file", language: "tsx" },
          { name: "product-details.tsx", type: "file", language: "tsx" },
          { name: "reviews-section.tsx", type: "file", language: "tsx" },
          { name: "related-products.tsx", type: "file", language: "tsx" },
          { name: "add-to-cart.tsx", type: "file", language: "tsx" },
        ],
      },
      {
        name: "lib",
        type: "folder",
        isOpen: true,
        children: [
          { name: "utils.ts", type: "file", language: "ts" },
          { name: "data.ts", type: "file", language: "ts" },
          { name: "types.ts", type: "file", language: "ts" },
        ],
      },
      {
        name: "public",
        type: "folder",
        children: [
          {
            name: "images",
            type: "folder",
            children: [
              { name: "product-1.jpg", type: "file" },
              { name: "product-2.jpg", type: "file" },
              { name: "product-3.jpg", type: "file" },
            ],
          },
          {
            name: "icons",
            type: "folder",
            children: [
              { name: "favicon.ico", type: "file" },
              { name: "logo.svg", type: "file" },
            ],
          },
        ],
      },
      {
        name: "styles",
        type: "folder",
        children: [
          { name: "globals.css", type: "file", language: "css" },
          { name: "components.css", type: "file", language: "css" },
        ],
      },
      { name: "package.json", type: "file", language: "json" },
      { name: "tailwind.config.js", type: "file", language: "js" },
      { name: "next.config.js", type: "file", language: "js" },
      { name: "tsconfig.json", type: "file", language: "json" },
      { name: "README.md", type: "file", language: "markdown" },
    ],
  }

  const codeFiles: Record<string, string> = {
    "app/page.tsx": `import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ProductGallery } from "@/components/product-gallery"
import { ProductDetails } from "@/components/product-details"
import { ReviewsSection } from "@/components/reviews-section"
import { RelatedProducts } from "@/components/related-products"

export default function ProductPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 mb-16">
        <ProductGallery />
        <ProductDetails />
      </div>
      
      <ReviewsSection />
      <RelatedProducts />
    </div>
  )
}`,
    "components/product-gallery.tsx": `"use client"

import { useState } from "react"
import { ChevronLeft, ChevronRight, ZoomIn } from 'lucide-react'
import { Button } from "@/components/ui/button"

const productImages = [
  "/images/product-1.jpg",
  "/images/product-2.jpg", 
  "/images/product-3.jpg",
  "/images/product-4.jpg"
]

export function ProductGallery() {
  const [selectedImage, setSelectedImage] = useState(0)
  const [isZoomed, setIsZoomed] = useState(false)

  return (
    <div className="space-y-4">
      <div className="relative aspect-square bg-gray-100 rounded-lg overflow-hidden group">
        <img 
          src={productImages[selectedImage] || "/placeholder.svg"} 
          alt="Product"
          className={\`w-full h-full object-cover transition-transform duration-300 \${
            isZoomed ? 'scale-150' : 'scale-100'
          }\`}
          onClick={() => setIsZoomed(!isZoomed)}
        />
        
        <Button
          variant="ghost"
          size="icon"
          className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={() => setSelectedImage(prev => prev > 0 ? prev - 1 : productImages.length - 1)}
        >
          <ChevronLeft className="w-4 h-4" />
        </Button>
        
        <Button
          variant="ghost"
          size="icon"
          className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={() => setSelectedImage(prev => prev < productImages.length - 1 ? prev + 1 : 0)}
        >
          <ChevronRight className="w-4 h-4" />
        </Button>
        
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-2 right-2 bg-white/80 hover:bg-white opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={() => setIsZoomed(!isZoomed)}
        >
          <ZoomIn className="w-4 h-4" />
        </Button>
      </div>
      
      <div className="grid grid-cols-4 gap-2">
        {productImages.map((image, i) => (
          <div 
            key={i} 
            className={\`aspect-square bg-gray-100 rounded border-2 cursor-pointer transition-colors \${
              selectedImage === i ? 'border-blue-500' : 'border-transparent hover:border-gray-300'
            }\`}
            onClick={() => setSelectedImage(i)}
          >
            <img 
              src={image || "/placeholder.svg"} 
              alt={\`Thumbnail \${i + 1}\`} 
              className="w-full h-full object-cover rounded" 
            />
          </div>
        ))}
      </div>
    </div>
  )
}`,
    "components/product-details.tsx": `"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Star, Heart, ShoppingCart, Minus, Plus } from 'lucide-react'

export function ProductDetails() {
  const [selectedColor, setSelectedColor] = useState(0)
  const [quantity, setQuantity] = useState(1)
  const [isFavorite, setIsFavorite] = useState(false)

  const colors = [
    { name: "Midnight Black", class: "bg-black" },
    { name: "Pearl White", class: "bg-white border-2 border-gray-200" },
    { name: "Ocean Blue", class: "bg-blue-500" },
    { name: "Crimson Red", class: "bg-red-500" }
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-3">
          Premium Wireless Headphones
        </h1>
        <div className="flex items-center space-x-3 mb-4">
          <div className="flex text-yellow-400">
            {[1, 2, 3, 4, 5].map((star) => (
              <Star key={star} className="w-5 h-5 fill-current" />
            ))}
          </div>
          <span className="text-sm text-gray-600 font-medium">(128 reviews)</span>
          <span className="text-sm text-green-600 font-medium">✓ In Stock</span>
        </div>
        <div className="flex items-center space-x-4 mb-6">
          <span className="text-4xl font-bold text-gray-900">$299.99</span>
          <span className="text-xl text-gray-500 line-through">$399.99</span>
          <Badge className="bg-red-100 text-red-800 px-3 py-1">
            Save $100 (25% OFF)
          </Badge>
        </div>
      </div>

      <div className="space-y-6">
        <div>
          <h3 className="font-semibold text-gray-900 mb-3">Color</h3>
          <div className="flex space-x-3">
            {colors.map((color, i) => (
              <div
                key={i}
                className={\`w-10 h-10 rounded-full \${color.class} cursor-pointer ring-2 ring-offset-2 transition-all \${
                  selectedColor === i ? 'ring-gray-400' : 'ring-transparent hover:ring-gray-300'
                }\`}
                title={color.name}
                onClick={() => setSelectedColor(i)}
              />
            ))}
          </div>
          <p className="text-sm text-gray-600 mt-2">Selected: {colors[selectedColor].name}</p>
        </div>

        <div className="flex space-x-4 pt-4">
          <Button className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3 text-lg font-semibold">
            <ShoppingCart className="w-5 h-5 mr-2" />
            Add to Cart
          </Button>
          <Button 
            variant="outline" 
            className={\`px-6 py-3 \${isFavorite ? 'text-red-500 border-red-500' : ''}\`}
            onClick={() => setIsFavorite(!isFavorite)}
          >
            <Heart className={\`w-5 h-5 \${isFavorite ? 'fill-current' : ''}\`} />
          </Button>
        </div>
      </div>
    </div>
  )
}`,
    "package.json": `{
  "name": "ecommerce-product-page",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint"
  },
  "dependencies": {
    "react": "^18",
    "react-dom": "^18",
    "next": "14.0.0",
    "@radix-ui/react-avatar": "^1.0.4",
    "@radix-ui/react-button": "^1.0.3",
    "@radix-ui/react-card": "^1.0.4",
    "@radix-ui/react-badge": "^1.0.2",
    "lucide-react": "^0.294.0",
    "tailwindcss": "^3.3.0",
    "autoprefixer": "^10.0.1",
    "postcss": "^8",
    "typescript": "^5",
    "@types/node": "^20",
    "@types/react": "^18",
    "@types/react-dom": "^18"
  },
  "devDependencies": {
    "eslint": "^8",
    "eslint-config-next": "14.0.0"
  }
}`,
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
  React.useEffect(() => {
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
  React.useEffect(() => {
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
    }
  }

  const getFileIcon = (fileName: string, type: string) => {
    if (type === "folder") return null

    if (fileName.endsWith(".tsx") || fileName.endsWith(".ts")) {
      return (
        <div className="w-4 h-4 bg-blue-500 rounded-sm flex items-center justify-center text-white text-xs font-bold">
          TS
        </div>
      )
    }
    if (fileName.endsWith(".css")) {
      return (
        <div className="w-4 h-4 bg-purple-500 rounded-sm flex items-center justify-center text-white text-xs font-bold">
          CSS
        </div>
      )
    }
    if (fileName.endsWith(".json")) {
      return (
        <div className="w-4 h-4 bg-yellow-500 rounded-sm flex items-center justify-center text-white text-xs font-bold">
          JSON
        </div>
      )
    }
    if (fileName.endsWith(".js")) {
      return (
        <div className="w-4 h-4 bg-yellow-600 rounded-sm flex items-center justify-center text-white text-xs font-bold">
          JS
        </div>
      )
    }
    if (fileName.endsWith(".md")) {
      return (
        <div className="w-4 h-4 bg-gray-600 rounded-sm flex items-center justify-center text-white text-xs font-bold">
          MD
        </div>
      )
    }
    if (fileName.match(/\.(jpg|png|gif|svg|ico)$/)) {
      return <ImageIcon className="w-4 h-4 text-green-500" />
    }
    return <FileText className="w-4 h-4 text-gray-500" />
  }

  const renderFileTree = (node: FileNode, path = "", level = 0) => {
    const fullPath = path ? `${path}/${node.name}` : node.name
    const isExpanded = expandedFolders.has(fullPath)
    const isSelected = selectedFile === fullPath

    return (
      <div key={fullPath}>
        <div
          className={`flex items-center space-x-2 py-1 px-2 rounded cursor-pointer hover:bg-muted/50 ${
            isSelected && node.type === "file" ? "bg-muted" : ""
          }`}
          style={{ paddingLeft: `${level * 16 + 8}px` }}
          onClick={() => {
            if (node.type === "folder") {
              toggleFolder(fullPath)
            } else {
              openFile(fullPath)
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
        </div>
        {node.type === "folder" && isExpanded && node.children && (
          <div>{node.children.map((child) => renderFileTree(child, fullPath, level + 1))}</div>
        )}
      </div>
    )
  }

  const handleSendMessage = () => {
    if (!input.trim()) return

    const newMessage = {
      id: messages.length + 1,
      type: "user" as const,
      content: input,
      timestamp: "Just now",
    }

    setMessages([...messages, newMessage])
    setInput("")
    setIsGenerating(true)

    // Simulate AI response
    setTimeout(() => {
      const aiResponse = {
        id: messages.length + 2,
        type: "assistant" as const,
        content: "I'll help you with that modification. Let me update the code for you.",
        timestamp: "Just now",
        hasCode: true,
      }
      setMessages((prev) => [...prev, aiResponse])
      setIsGenerating(false)
    }, 2000)
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
                  <h1 className="text-lg font-semibold text-foreground mb-1">E-commerce Product Page</h1>
                  <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                    <Badge variant="secondary" className="text-xs px-2 py-1">
                      <Sparkles className="w-3 h-3 mr-1" />
                      v0-1.5-md
                    </Badge>
                    <span>•</span>
                    <span>Updated 1h ago</span>
                  </div>
                </div>
                <div className="flex items-center space-x-1">
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
                  <Button variant="ghost" size="sm">
                    <MoreHorizontal className="w-4 h-4" />
                  </Button>
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
                          <AvatarFallback className="bg-gradient-to-br from-purple-500 to-pink-500 text-white text-xs font-medium">
                            v0
                          </AvatarFallback>
                        </Avatar>
                      )}
                      <span className="text-xs font-medium text-foreground">
                        {message.type === "user" ? "You" : "v0"}
                      </span>
                      <span className="text-xs text-muted-foreground">{message.timestamp}</span>
                    </div>
                    <div className={`${message.type === "assistant" ? "ml-7" : ""}`}>
                      <div className="prose prose-sm max-w-none text-foreground">
                        <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
                      </div>
                      {message.type === "assistant" && (
                        <div className="flex items-center space-x-2 mt-2">
                          <Button variant="ghost" size="sm" className="h-6 text-xs">
                            <Copy className="w-3 h-3 mr-1" />
                            Copy
                          </Button>
                          <Button variant="ghost" size="sm" className="h-6 text-xs">
                            <RotateCcw className="w-3 h-3 mr-1" />
                            Retry
                          </Button>
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
                          v0
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-xs font-medium text-foreground">v0</span>
                      <span className="text-xs text-muted-foreground">Just now</span>
                    </div>
                    <div className="ml-7">
                      <div className="flex items-center space-x-2">
                        <div className="flex space-x-1">
                          <div className="w-1.5 h-1.5 bg-foreground rounded-full animate-bounce"></div>
                          <div
                            className="w-1.5 h-1.5 bg-foreground rounded-full animate-bounce"
                            style={{ animationDelay: "0.1s" }}
                          ></div>
                          <div
                            className="w-1.5 h-1.5 bg-foreground rounded-full animate-bounce"
                            style={{ animationDelay: "0.2s" }}
                          ></div>
                        </div>
                        <span className="text-xs text-muted-foreground">Generating...</span>
                      </div>
                    </div>
                  </div>
                )}
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
                    <ArrowUp className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Resize Handle */}
            {!isMobile && !isChatCollapsed && (
              <div
                ref={chatResizeRef}
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

        {/* Collapsed Chat Button */}
        {!isMobile && isChatCollapsed && (
          <div className="w-12 border-r border-border bg-card flex flex-col items-center py-4">
            <Button variant="ghost" size="sm" onClick={() => setIsChatCollapsed(false)}>
              <Menu className="w-4 h-4" />
            </Button>
          </div>
        )}

        {/* File Explorer */}
        {(!isMobile || !isExplorerCollapsed) && (
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
                  {!isMobile && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0"
                      onClick={() => setIsExplorerCollapsed(!isExplorerCollapsed)}
                    >
                      <PanelRightClose className="w-3 h-3" />
                    </Button>
                  )}
                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                    <Plus className="w-3 h-3" />
                  </Button>
                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                    <RefreshCw className="w-3 h-3" />
                  </Button>
                </div>
              </div>
              <div className="relative">
                <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 text-muted-foreground w-3 h-3" />
                <input
                  type="text"
                  placeholder="Search files..."
                  className="w-full pl-7 pr-2 py-1 text-xs bg-muted rounded border-0 focus:outline-none focus:ring-1 focus:ring-ring"
                />
              </div>
            </div>

            {/* File Tree */}
            <ScrollArea className="flex-1">
              <div className="p-2">{renderFileTree(projectFiles)}</div>
            </ScrollArea>

            {/* Resize Handle */}
            {!isMobile && !isExplorerCollapsed && (
              <div
                ref={explorerResizeRef}
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

        {/* Collapsed Explorer Button */}
        {!isMobile && isExplorerCollapsed && (
          <div className="w-12 border-r border-border bg-card flex flex-col items-center py-4">
            <Button variant="ghost" size="sm" onClick={() => setIsExplorerCollapsed(false)}>
              <Folder className="w-4 h-4" />
            </Button>
          </div>
        )}

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Top Bar */}
          <div className="border-b border-border flex-shrink-0">
            {/* Tabs */}
            <div className="flex items-center min-h-[40px]">
              <div className="flex-1 flex items-center overflow-x-auto">
                {openTabs.map((tab) => (
                  <div
                    key={tab}
                    className={`flex items-center space-x-2 px-3 py-2 border-r border-border cursor-pointer text-sm min-w-0 ${
                      activeTab === tab ? "bg-background" : "bg-muted/50 hover:bg-muted"
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

            {/* Toolbar */}
            {viewMode === "preview" && (
              <div className="flex items-center justify-between px-4 py-2 bg-muted/30 flex-wrap gap-2">
                <div className="flex items-center space-x-4">
                  <Badge
                    variant="secondary"
                    className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100 px-2 py-1"
                  >
                    <Zap className="w-3 h-3 mr-1" />
                    Live Preview
                  </Badge>
                  <div className="flex items-center space-x-1 bg-background rounded-md p-1">
                    <Button
                      variant={selectedDevice === "mobile" ? "default" : "ghost"}
                      size="sm"
                      className="h-6 px-2"
                      onClick={() => setSelectedDevice("mobile")}
                    >
                      <Smartphone className="w-3 h-3" />
                    </Button>
                    <Button
                      variant={selectedDevice === "tablet" ? "default" : "ghost"}
                      size="sm"
                      className="h-6 px-2"
                      onClick={() => setSelectedDevice("tablet")}
                    >
                      <Tablet className="w-3 h-3" />
                    </Button>
                    <Button
                      variant={selectedDevice === "desktop" ? "default" : "ghost"}
                      size="sm"
                      className="h-6 px-2"
                      onClick={() => setSelectedDevice("desktop")}
                    >
                      <Monitor className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Button variant="ghost" size="sm">
                    <ExternalLink className="w-4 h-4" />
                  </Button>
                  <Button variant="outline" size="sm">
                    <Download className="w-4 h-4 mr-2" />
                    <span className="hidden sm:inline">Export</span>
                  </Button>
                  <Button size="sm" className="bg-foreground text-background hover:bg-foreground/90">
                    <Share className="w-4 h-4 mr-2" />
                    <span className="hidden sm:inline">Share</span>
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Content Area - Fixed Height */}
          <div className="flex-1 overflow-hidden">
            {viewMode === "preview" ? (
              /* Preview Mode */
              <div className="h-full bg-gray-50 dark:bg-gray-900 p-4 sm:p-8 overflow-auto">
                <div
                  className={`mx-auto bg-white dark:bg-gray-800 rounded-xl shadow-2xl overflow-hidden transition-all duration-300 ${
                    selectedDevice === "mobile" ? "max-w-sm" : selectedDevice === "tablet" ? "max-w-3xl" : "max-w-7xl"
                  }`}
                >
                  {/* Mock E-commerce Product Page */}
                  <div className="p-4 sm:p-8">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
                      {/* Product Gallery */}
                      <div className="space-y-4">
                        <div className="aspect-square bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800 rounded-xl flex items-center justify-center relative overflow-hidden">
                          <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20"></div>
                          <ImageIcon className="w-16 sm:w-20 h-16 sm:h-20 text-gray-400 relative z-10" />
                          <div className="absolute top-4 right-4 bg-red-500 text-white px-2 py-1 rounded-full text-xs font-bold">
                            25% OFF
                          </div>
                        </div>
                        <div className="grid grid-cols-4 gap-2 sm:gap-3">
                          {[1, 2, 3, 4].map((i) => (
                            <div
                              key={i}
                              className={`aspect-square bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800 rounded-lg border-2 transition-colors cursor-pointer ${
                                i === 1 ? "border-blue-500" : "border-transparent hover:border-gray-300"
                              }`}
                            ></div>
                          ))}
                        </div>
                      </div>

                      {/* Product Details */}
                      <div className="space-y-6">
                        <div>
                          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-3">
                            Premium Wireless Headphones
                          </h1>
                          <div className="flex items-center space-x-3 mb-4">
                            <div className="flex text-yellow-400">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <span key={star} className="text-lg">
                                  ★
                                </span>
                              ))}
                            </div>
                            <span className="text-sm text-gray-600 dark:text-gray-400 font-medium">(128 reviews)</span>
                          </div>
                          <div className="flex items-center space-x-4 mb-6 flex-wrap">
                            <span className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white">
                              $299.99
                            </span>
                            <span className="text-xl text-gray-500 line-through">$399.99</span>
                            <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100 px-3 py-1">
                              Save $100
                            </Badge>
                          </div>
                        </div>

                        <div className="space-y-6">
                          <div>
                            <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Color</h3>
                            <div className="flex space-x-3">
                              {[
                                { color: "bg-black", name: "Midnight Black" },
                                { color: "bg-white border-2 border-gray-200", name: "Pearl White" },
                                { color: "bg-blue-500", name: "Ocean Blue" },
                                { color: "bg-red-500", name: "Crimson Red" },
                              ].map((option, i) => (
                                <div
                                  key={i}
                                  className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full ${option.color} cursor-pointer ring-2 ring-offset-2 transition-all ${
                                    i === 0 ? "ring-gray-400" : "ring-transparent hover:ring-gray-300"
                                  }`}
                                  title={option.name}
                                ></div>
                              ))}
                            </div>
                          </div>

                          <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4 pt-4">
                            <Button className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3 text-lg font-semibold">
                              Add to Cart
                            </Button>
                            <Button variant="outline" className="px-6 py-3">
                              ♡
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              /* Code Mode - Fixed Height */
              <div className="h-full bg-gray-900 text-gray-100 flex flex-col">
                <div className="flex items-center justify-between px-4 py-2 bg-gray-800 border-b border-gray-700 flex-shrink-0">
                  <span className="text-sm font-medium truncate">{activeTab}</span>
                  <div className="flex items-center space-x-2">
                    <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white">
                      <Copy className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white">
                      <Download className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                <ScrollArea className="flex-1">
                  <pre className="p-4 text-sm leading-relaxed">
                    <code>{codeFiles[activeTab] || "// File content not available"}</code>
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
