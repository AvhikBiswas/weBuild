"use client"
import { HoverEffect } from "@/components/ui/card-hover-effect"

export function ModelsSection() {
  return (
    <div className="max-w-7xl mx-auto px-4 py-20">
      <div className="text-center mb-16">
        <h2 className="text-3xl md:text-5xl font-bold text-white mb-4">Supported AI Models</h2>
        <p className="text-neutral-400 text-lg max-w-2xl mx-auto">
          Choose from a variety of AI models or bring your own. We support all major providers and custom deployments.
        </p>
      </div>
      <div className="max-w-5xl mx-auto px-8">
        <HoverEffect items={models} />
      </div>
    </div>
  )
}

export const models = [
  {
    title: "OpenAI GPT",
    description:
      "Industry-leading language models including GPT-4 and GPT-3.5 for powerful text generation and code assistance.",
    link: "#",
  },
  {
    title: "Anthropic Claude",
    description:
      "Advanced AI assistant known for helpful, harmless, and honest responses with excellent reasoning capabilities.",
    link: "#",
  },
  {
    title: "Google Gemini",
    description: "Google's multimodal AI model with strong performance across text, code, and reasoning tasks.",
    link: "#",
  },
  {
    title: "Mistral AI",
    description:
      "High-performance open-source models with excellent multilingual capabilities and efficient inference.",
    link: "#",
  },
  {
    title: "Ollama",
    description: "Run large language models locally with support for Llama, Mistral, and other open-source models.",
    link: "#",
  },
  {
    title: "Custom Models",
    description:
      "Deploy and integrate your own models by providing the API endpoint and model configuration. (Coming Soon)",
    link: "#",
  },
]
