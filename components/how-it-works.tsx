import { Calendar, FileText, CheckCircle, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

const steps = [
  {
    icon: Calendar,
    title: "Enter Property Details",
    description: "Simply paste any property URL or enter an address to get started."
  },
  {
    icon: FileText,
    title: "AI Analysis",
    description: "Our advanced algorithms analyze market data, comparables, and trends in real-time."
  },
  {
    icon: CheckCircle,
    title: "Get Your Report",
    description: "Receive comprehensive insights and recommendations within seconds."
  }
];

export default function HowItWorks() {
  return (
    <section className="flex flex-col items-center py-28 px-16 w-full bg-neutral-lighter min-h-[915px]">
      <div className="flex flex-col items-start gap-20 w-full max-w-[1280px]">
        {/* Section Title */}
        <div className="flex items-start gap-20 w-full">
          <div className="flex flex-col items-start gap-4 flex-1">
            <div className="flex items-center">
              <span className="text-neutral-darkest font-semibold text-bodySm leading-[150%]">
                Process
              </span>
            </div>
            <h2 className="text-neutral-darkest font-heading text-h2 leading-[120%] tracking-[-0.01em] w-full">
              How HH.Fun Works
            </h2>
          </div>
          <div className="flex-1">
            <p className="text-neutral-darkest font-body text-bodyLg leading-[150%]">
              Get professional-grade property analysis in three simple steps. No complex forms, no waiting periods - just instant insights.
            </p>
          </div>
        </div>
        
        {/* Steps */}
        <div className="flex flex-col items-start gap-16 w-full">
          <div className="flex items-start gap-12 w-full">
            {steps.map((step, index) => (
              <div key={index} className="flex flex-col items-start gap-6 flex-1">
                <step.icon size={48} className="text-neutral-darkest" />
                <h3 className="text-neutral-darkest font-heading text-h4 leading-[130%] tracking-[-0.01em] w-full">
                  {step.title}
                </h3>
                <p className="text-neutral-darkest font-body text-bodySm leading-[150%] w-full">
                  {step.description}
                </p>
              </div>
            ))}
          </div>
          
          {/* Actions */}
          <div className="flex items-center gap-6">
            <Link href="/analysis">
              <Button 
                className="bg-neutral-lightest hover:bg-neutral-white text-neutral-darkest border-2 border-neutral-darkest rounded-sm px-6 py-3 font-medium"
                style={{ 
                  boxShadow: "0px 2px 2px rgba(0, 0, 0, 0.15), inset 0px 4px 0px rgba(255, 255, 255, 0.2), inset 0px -5px 0px rgba(0, 0, 0, 0.15)" 
                }}
              >
                Get Started
              </Button>
            </Link>
            <button className="flex justify-center items-center gap-2 rounded-sm hover:opacity-80 transition-opacity">
              <span className="text-neutral-darkest font-medium text-bodySm leading-[150%]">
                View Demo
              </span>
              <ChevronRight size={24} className="text-neutral-darkest" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}