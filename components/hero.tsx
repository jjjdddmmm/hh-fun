"use client";

import { Button } from "@/components/ui/button";
import Link from "next/link";

const propertyImages = [
  {
    src: "https://images.unsplash.com/photo-1449844908441-8829872d2607?w=312&h=332&fit=crop&crop=edges",
    alt: "Real estate analytics"
  }
];

const propertyImagesRight = [
  {
    src: "https://images.unsplash.com/photo-1570129477492-45c003edd2be?w=312&h=332&fit=crop&crop=edges",
    alt: "Luxury home interior"
  },
  {
    src: "https://images.unsplash.com/photo-1551434678-e076c223a692?w=312&h=332&fit=crop&crop=edges",
    alt: "Property data dashboard"
  }
];

export default function Hero() {
  return (
    <section className="flex flex-col items-center py-10 px-16 w-full bg-cinnabar-darkest min-h-[900px]">
      <div className="flex flex-col items-start gap-20 w-full max-w-[1280px] h-full">
        <div className="flex items-center w-full h-full">
          {/* Content */}
          <div className="flex flex-col justify-center items-start pr-20 gap-8 flex-1 h-full">
            <div className="flex flex-col items-start gap-6 w-full">
              <h1 className="text-neutral-white font-heading text-h1 leading-[120%] tracking-[-0.01em] w-full">
                Stop Overpaying for Real Estate
              </h1>
              
              <p className="text-neutral-white font-body text-bodyLg leading-[150%] w-full">
                Get AI-powered property analysis in seconds. Compare market values, analyze investment potential, and make confident real estate decisions with professional-grade insights.
              </p>
            </div>
            
            {/* CTA Buttons */}
            <div className="flex items-start gap-4">
              <Link href="/analysis">
                <Button 
                  className="bg-cinnabar-lightest hover:bg-cinnabar-lighter text-neutral-darkest border-2 border-neutral-darkest px-6 py-3 font-medium"
                  style={{ 
                    borderRadius: '8px',
                    boxShadow: "0px 2px 2px rgba(0, 0, 0, 0.15), inset 0px 4px 0px rgba(255, 255, 255, 0.2), inset 0px -5px 0px rgba(0, 0, 0, 0.15)" 
                  }}
                >
                  Get Started
                </Button>
              </Link>
              <Button 
                variant="outline"
                className="bg-neutral-lightest hover:bg-neutral-lighter text-neutral-darkest border-2 border-neutral-darkest px-6 py-3 font-medium"
                style={{ 
                  borderRadius: '8px',
                  boxShadow: "0px 2px 2px rgba(0, 0, 0, 0.15), inset 0px 4px 0px rgba(255, 255, 255, 0.2), inset 0px -5px 0px rgba(0, 0, 0, 0.15)" 
                }}
              >
                View Demo
              </Button>
            </div>
          </div>
          
          {/* Image Grid */}
          <div className="flex items-start gap-4 flex-1 h-full">
            {/* Left Column */}
            <div className="flex flex-col items-start justify-center gap-4 flex-1 h-full">
              {propertyImages.map((image, index) => (
                <div key={index} className="w-full rounded-md overflow-hidden bg-neutral-light" style={{ height: "332px" }}>
                  <img 
                    src={image.src}
                    alt={image.alt}
                    className="w-full h-full object-cover"
                  />
                </div>
              ))}
            </div>
            
            {/* Right Column */}
            <div className="flex flex-col items-start gap-4 flex-1">
              {propertyImagesRight.map((image, index) => (
                <div key={index} className="w-full rounded-md overflow-hidden bg-neutral-light" style={{ height: "332px" }}>
                  <img 
                    src={image.src}
                    alt={image.alt}
                    className="w-full h-full object-cover"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}