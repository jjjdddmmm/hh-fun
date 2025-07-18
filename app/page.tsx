import Navigation from "@/components/navigation";
import Hero from "@/components/hero";
import Mission from "@/components/mission";
import Features from "@/components/features";
import ValueProp from "@/components/value-prop";
import HowItWorks from "@/components/how-it-works";
import Testimonial from "@/components/testimonial";
import CTA from "@/components/cta";
import Footer from "@/components/footer";

export default function HomePage() {
  return (
    <>
      <Navigation />
      <main>
        <Hero />
        <Mission />
        <Features />
        <ValueProp />
        <HowItWorks />
        <Testimonial />
        <CTA />
      </main>
      <Footer />
    </>
  );
}