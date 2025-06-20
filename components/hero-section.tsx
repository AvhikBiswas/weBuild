"use client"
import { Spotlight } from "@/components/ui/spotlight"
import { HoverBorderGradient } from "@/components/ui/hover-border-gradient"

export function HeroSection() {
  return (
    <div className="h-screen w-full flex items-center justify-center bg-black relative overflow-hidden">
      <Spotlight className="-top-40 left-0 md:left-60 md:-top-20" fill="white" />

      <div className="max-w-4xl mx-auto text-center px-4 relative z-10">
        {/* Clean, minimal heading */}
        <h1 className="text-5xl md:text-7xl font-bold text-white mb-8 tracking-tight">weBuild</h1>

        {/* Clear, readable description */}
        <p className="text-xl md:text-2xl text-gray-300 mb-4 font-light max-w-3xl mx-auto leading-relaxed">
          Build web apps together with some help of AI
        </p>

        <p className="text-lg text-gray-400 mb-12 max-w-2xl mx-auto leading-relaxed">
          Share your idea and get a quick MVP in minutes. Use your own API keys with multiple AI models including
          OpenAI, Claude, Mistral, and more.
        </p>

        {/* Simple, clean CTA */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <HoverBorderGradient
            containerClassName="rounded-lg"
            as="button"
            className="bg-white text-black hover:bg-gray-100 px-8 py-4 text-lg font-medium transition-all duration-200"
          >
            Start Building Now
          </HoverBorderGradient>

          <button className="px-8 py-4 text-lg font-medium text-gray-300 hover:text-white transition-colors duration-200 border border-gray-600 rounded-lg hover:border-gray-400">
            View Demo
          </button>
        </div>

        {/* Subtle feature highlights */}
        <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
          <div className="text-gray-400">
            <div className="text-2xl font-bold text-white mb-2">5+ AI Models</div>
            <div className="text-sm">OpenAI, Claude, Mistral & more</div>
          </div>
          <div className="text-gray-400">
            <div className="text-2xl font-bold text-white mb-2">Your API Keys</div>
            <div className="text-sm">Full control over costs & usage</div>
          </div>
          <div className="text-gray-400">
            <div className="text-2xl font-bold text-white mb-2">Quick MVP</div>
            <div className="text-sm">From idea to prototype in minutes</div>
          </div>
        </div>
      </div>
    </div>
  )
}
