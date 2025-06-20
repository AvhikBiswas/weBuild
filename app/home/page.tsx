"use client"

import Link from "next/link"
import React, { useState } from "react"
import {
  Camera,
  FileImage,
  Globe,
  UserPlus,
  Calculator,
  ChevronDown,
  Paperclip,
  ArrowUp,
  ChevronRight,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

export default function HomePage() {
  const [showPopup, setShowPopup] = useState(false)
  const [model, setModel] = useState("Gemini")

  return (
    <div className="min-h-screen bg-[#0e0e0e] text-white">
      <main className="max-w-4xl mx-auto px-6 py-12">
        {/* Beta Announcement */}
        <div className="flex items-center justify-center mb-12">
          <div className="flex items-center space-x-2 text-sm">
            <Badge className="bg-green-900 text-green-200 border border-green-800">New</Badge>
            <span className="text-gray-400">The weBuild is now in beta.</span>
            <Link
              href="#"
              className="text-blue-400 hover:text-blue-300 flex items-center"
            >
              Learn More
              <ChevronRight className="w-3 h-3 ml-1" />
            </Link>
          </div>
        </div>

        {/* Main Heading */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-8">What can I help you build?</h1>
        </div>

        {/* Input Section */}
        <div className="mb-8">
          <div className="relative border border-gray-700 rounded-lg bg-[#1a1a1a] shadow-sm">
            <div className="flex items-start p-4">
              <div className="flex-1">
                <textarea
                  rows={2}
                  placeholder="Hey, Let's Start Building Together!"
                  className="w-full max-h-60 overflow-y-auto resize-none bg-[#1a1a1a] text-white text-base placeholder:text-gray-500 p-4 rounded-md border border-gray-700 focus:outline-none focus:border-gray-500 scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent"
                />

              </div>
              <div className="flex items-center space-x-2 ml-4 mt-2">
                <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white">
                  <Paperclip className="w-4 h-4" />
                </Button>
                <Button size="sm" className="bg-white text-black hover:bg-gray-200">
                  <ArrowUp className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Dropdown buttons */}
            <div className="flex items-center justify-between px-4 pb-4">
              <div className="flex items-center space-x-2">
                <div className="relative group">
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-white border-gray-600 bg-[#1f1f1f] hover:bg-[#2a2a2a]"
                  >
                    {model}
                    <ChevronDown className="w-3 h-3 ml-1" />
                  </Button>
                  <div className="absolute hidden group-hover:flex flex-col mt-2 bg-[#1f1f1f] border border-gray-700 rounded-md shadow z-10 w-40">
                    <button
                      className="text-white text-left px-4 py-2 hover:bg-[#292929]"
                      onClick={() => setModel("Gemini")}
                    >
                      Gemini
                    </button>
                    <button
                      className="text-gray-500 text-left px-4 py-2 cursor-not-allowed"
                      disabled
                    >
                      Claude (coming)
                    </button>
                    <button
                      className="text-gray-500 text-left px-4 py-2 cursor-not-allowed"
                      disabled
                    >
                      Mistral (coming)
                    </button>
                  </div>
                </div>

                {/* <Button variant="outline" size="sm" className="text-gray-400 border-gray-600 hover:text-white">
                  v0-1.5-md
                  <ChevronDown className="w-3 h-3 ml-1" />
                </Button> */}
              </div>
            </div>
          </div>
        </div>


        {/* Upcoming Features Popup */}
        <div className="text-center mb-10">
          <Button
            variant="outline"
            className="border-gray-600 text-white hover:bg-[#222]"
            onClick={() => setShowPopup(true)}
          >
            View Upcoming Features
          </Button>

          {showPopup && (
            <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
              <div className="bg-[#1a1a1a] border border-gray-700 p-6 rounded-lg w-full max-w-md relative">
                <button
                  className="absolute top-2 right-2 text-gray-400 hover:text-white"
                  onClick={() => setShowPopup(false)}
                >
                  ✕
                </button>
                <h2 className="text-xl font-semibold mb-4">Upcoming Features</h2>
                <div className="flex flex-col gap-3">
                  <FeatureButton icon={Camera} label="Clone a Screenshot" />
                  <FeatureButton icon={FileImage} label="Import from Figma" />
                  <FeatureButton icon={Globe} label="Landing Page" />
                  <FeatureButton icon={UserPlus} label="Sign Up Form" />
                  <FeatureButton icon={Calculator} label="Calculate Factorial" />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Fade-out section */}
        <div className="opacity-20 text-center pointer-events-none">
          <p className="text-sm">More sections will appear here soon...</p>
        </div>
      </main>
    </div>
  )
}

function FeatureButton({ icon: Icon, label }: { icon: React.ElementType; label: string }) {
  return (
    <Button
      variant="ghost"
      className="w-full justify-start text-gray-300 hover:text-white hover:bg-[#2a2a2a]"
    >
      <Icon className="w-4 h-4 mr-2" />
      {label}
    </Button>
  )
}
