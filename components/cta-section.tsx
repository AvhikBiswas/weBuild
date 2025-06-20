"use client"
import { BackgroundBeams } from "@/components/ui/background-beams"
import { HoverBorderGradient } from "@/components/ui/hover-border-gradient"

export function CTASection() {
  return (
    <div className="h-[40rem] w-full rounded-md bg-neutral-950 relative flex flex-col items-center justify-center antialiased">
      <div className="max-w-2xl mx-auto p-4">
        <h1 className="relative z-10 text-lg md:text-7xl bg-clip-text text-transparent bg-gradient-to-b from-neutral-200 to-neutral-600 text-center font-sans font-bold">
          Ready to build?
        </h1>
        <p className="text-neutral-500 max-w-lg mx-auto my-2 text-sm text-center relative z-10">
          Join thousands of developers who are already building amazing web applications with weBuild. Start your
          journey today and turn your ideas into reality with the power of AI.
        </p>
        <div className="flex justify-center mt-8 relative z-10">
          <HoverBorderGradient
            containerClassName="rounded-full"
            as="button"
            className="dark:bg-black bg-white text-black dark:text-white flex items-center space-x-2 px-8 py-3 text-lg"
          >
            <span>Get Started Free</span>
          </HoverBorderGradient>
        </div>
      </div>
      <BackgroundBeams />
    </div>
  )
}
