import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function CTA() {
  return (
    <section className="flex flex-col justify-center items-center py-20 px-16 w-full bg-cinnabar-darkest">
      <div className="flex flex-col items-center gap-8 w-full max-w-[800px]">
        {/* Main Headline */}
        <h2 className="text-neutral-white font-heading text-h2 leading-[120%] tracking-[-0.01em] text-center w-full">
          Ready to Make Smarter Real Estate Decisions?
        </h2>
        
        {/* Supporting Text */}
        <p className="text-neutral-white font-body text-bodyLg leading-[150%] text-center w-full opacity-90">
          Join thousands of investors and homebuyers who use our AI-powered platform to analyze properties and make confident decisions.
        </p>
        
        {/* CTA Buttons */}
        <div className="flex items-center gap-4 justify-center">
          <Link href="/analysis">
            <Button 
              className="bg-cinnabar-lightest hover:bg-cinnabar-lighter text-neutral-darkest border-2 border-neutral-darkest rounded-sm px-8 py-4 font-medium text-lg"
              style={{ 
                boxShadow: "0px 2px 2px rgba(0, 0, 0, 0.15), inset 0px 4px 0px rgba(255, 255, 255, 0.2), inset 0px -5px 0px rgba(0, 0, 0, 0.15)" 
              }}
            >
              Start Your Analysis
            </Button>
          </Link>
          <Button 
            variant="outline"
            className="bg-neutral-lightest hover:bg-neutral-white text-neutral-darkest border-2 border-neutral-darkest rounded-sm px-8 py-4 font-medium text-lg"
            style={{ 
              boxShadow: "0px 2px 2px rgba(0, 0, 0, 0.15), inset 0px 4px 0px rgba(255, 255, 255, 0.2), inset 0px -5px 0px rgba(0, 0, 0, 0.15)" 
            }}
          >
            View Demo
          </Button>
        </div>
        
        {/* Trust Signal */}
        <div className="flex flex-col items-center gap-2 mt-4">
          <p className="text-neutral-white font-body text-bodySm opacity-75">
            No credit card required • Free trial available
          </p>
          <div className="flex items-center gap-2 text-neutral-white opacity-60">
            <span className="text-bodyXs">★★★★★</span>
            <span className="text-bodySm">4.9/5 from 500+ users</span>
          </div>
        </div>
      </div>
    </section>
  );
}