import { Home, TrendingUp } from "lucide-react";

const features = [
  {
    icon: Home,
    title: "Property Intelligence",
    description: "Advanced algorithms analyze market data, comparable sales, and neighborhood trends to give you the complete picture."
  },
  {
    icon: TrendingUp,
    title: "Investment Insights",
    description: "Identify opportunities and risks with predictive analytics and market forecasting."
  }
];

export default function ValueProp() {
  return (
    <section className="flex flex-col items-center py-28 px-16 w-full bg-neutral-white min-h-[864px]">
      <div className="flex flex-col items-start gap-20 w-full max-w-[1280px]">
        <div className="flex items-center gap-20 w-full">
          {/* Content */}
          <div className="flex flex-col items-start gap-8 flex-1">
            {/* Section Title */}
            <div className="flex flex-col items-start gap-6 w-full">
              <h2 className="text-neutral-darkest font-heading text-h3 leading-[120%] tracking-[-0.01em] w-full">
                Stop guessing. Start investing with confidence.
              </h2>
              <p className="text-neutral-darkest font-body text-bodyLg leading-[150%] w-full">
                Transform your real estate decisions with AI-powered analysis that delivers professional-grade insights in seconds.
              </p>
            </div>
            
            {/* Features List */}
            <div className="flex flex-col items-start gap-4 w-full">
              <div className="flex items-start py-2 gap-6 w-full">
                {features.map((feature, index) => (
                  <div key={index} className="flex flex-col items-start gap-4 flex-1">
                    <feature.icon size={48} className="text-neutral-darkest" />
                    <h3 className="text-neutral-darkest font-heading text-h6 leading-[140%] tracking-[-0.01em] w-full">
                      {feature.title}
                    </h3>
                    <p className="text-neutral-darkest font-body text-bodySm leading-[150%] w-full">
                      {feature.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
          
          {/* Image */}
          <div className="flex-1">
            <div className="w-full rounded-md overflow-hidden" style={{ height: "640px" }}>
              <img 
                src="https://images.unsplash.com/photo-1551434678-e076c223a692?w=600&h=640&fit=crop&crop=edges" 
                alt="Real estate data analysis dashboard"
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}