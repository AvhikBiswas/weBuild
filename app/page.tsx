
import { ModelsSection } from "@/components/models-section"
import { CTASection } from "@/components/cta-section"
import { Footer } from "@/components/footer"
import { NavbarSection } from "@/components/navbar-Section"
import HeroParallaxDemoSection from "@/components/hero-parallax-demo-section"

export default function Home() {
  return (
    <NavbarSection>
      <main className=" bg-black">
        <HeroParallaxDemoSection />
        <ModelsSection />
        <CTASection />
        <Footer />
      </main>
    </NavbarSection>

  )
}
