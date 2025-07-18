import { Calendar, Home, Headphones, ChevronRight } from "lucide-react";

const features = [
  {
    icon: Calendar,
    title: "Instant Property Analysis",
    description: "Get comprehensive property reports in seconds, not hours.",
    buttonText: "Learn More"
  },
  {
    icon: Home,
    title: "Market Comparisons", 
    description: "Compare properties with recent sales and market trends.",
    buttonText: "View"
  },
  {
    icon: Headphones,
    title: "Expert Support",
    description: "Access to real estate professionals when you need guidance.",
    buttonText: "Contact"
  }
];

export default function Features() {
  return (
    <section className="flex flex-col items-center py-28 px-16 w-full bg-neutral-white min-h-[780px]">
      <div className="flex flex-col items-center gap-20 w-full max-w-[1280px]">
        {/* Heading */}
        <h2 className="text-neutral-darkest font-heading text-h3 leading-[120%] text-center tracking-[-0.01em] max-w-[768px]">
          Everything you need to make confident real estate decisions
        </h2>
        
        {/* Features Grid */}
        <div className="flex flex-col items-start gap-16 w-full">
          <div className="flex justify-center items-start gap-12 w-full">
            {features.map((feature, index) => (
              <div key={index} className="flex flex-col items-center gap-8 flex-1">
                <div className="flex flex-col items-center gap-6 w-full">
                  {/* Icon */}
                  <feature.icon size={48} className="text-neutral-darkest" />
                  
                  {/* Content */}
                  <div className="flex flex-col items-start gap-6 w-full">
                    <h3 className="text-neutral-darkest font-heading text-h5 leading-[140%] text-center tracking-[-0.01em] w-full">
                      {feature.title}
                    </h3>
                    <p className="text-neutral-darkest font-body text-bodySm leading-[150%] text-center w-full">
                      {feature.description}
                    </p>
                  </div>
                </div>
                
                {/* Action */}
                <div className="flex flex-col items-center gap-2 w-full">
                  <button className="flex justify-center items-center gap-2 rounded-sm hover:opacity-80 transition-opacity">
                    <span className="text-neutral-darkest font-medium text-bodySm leading-[150%]">
                      {feature.buttonText}
                    </span>
                    <ChevronRight size={24} className="text-neutral-darkest" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}