import { Star, ChevronLeft, ChevronRight } from "lucide-react";

export default function Testimonial() {
  return (
    <section className="flex flex-col items-center py-28 px-16 w-full bg-neutral-white min-h-[927px]">
      <div className="flex flex-col items-start gap-8 w-full max-w-[1280px]">
        {/* Main Content */}
        <div className="flex items-start gap-8 w-full">
          <div className="flex items-center gap-20 w-full">
            {/* Image */}
            <div className="flex-1">
              <div className="w-full rounded-md overflow-hidden" style={{ height: "623px" }}>
                <img 
                  src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600&h=623&fit=crop&crop=face" 
                  alt="Sarah Johnson testimonial"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
            
            {/* Content */}
            <div className="flex flex-col items-start gap-8 flex-1">
              {/* Stars */}
              <div className="flex items-start gap-1">
                {[...Array(5)].map((_, index) => (
                  <Star 
                    key={index} 
                    size={20} 
                    className="text-neutral-darkest fill-neutral-darkest"
                  />
                ))}
              </div>
              
              {/* Quote */}
              <blockquote className="text-neutral-darkest font-heading text-h5 leading-[140%] tracking-[-0.01em] w-full">
                "HH.Fun transformed how I analyze properties. What used to take hours of research now takes seconds, and the insights are incredibly accurate. It's like having a team of analysts in my pocket."
              </blockquote>
              
              {/* Avatar */}
              <div className="flex items-center gap-5">
                <div className="flex flex-col items-start">
                  <p className="text-neutral-darkest font-semibold text-bodySm leading-[150%]">
                    Sarah Johnson
                  </p>
                  <p className="text-neutral-darkest font-body text-bodySm leading-[150%]">
                    Real Estate Investor
                  </p>
                </div>
                
                {/* Divider */}
                <div 
                  className="border-2 border-neutral-darkest transform rotate-90"
                  style={{ width: "61px", height: "0px" }}
                />
                
                {/* Company Logo */}
                <div className="w-[120px] h-12 bg-neutral-darkest rounded flex items-center justify-center">
                  <span className="text-neutral-white font-bold">COMPANY</span>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Controls */}
        <div className="flex justify-between items-center gap-10 w-full">
          {/* Slider Dots */}
          <div className="flex items-start gap-2 mx-auto">
            <div className="w-2 h-2 bg-neutral-darkest rounded-full" />
            <div className="w-2 h-2 bg-neutral-darkest opacity-20 rounded-full" />
          </div>
          
          {/* Navigation Buttons */}
          <div className="flex items-start gap-4 mx-auto">
            <button className="flex justify-center items-center p-3 gap-2 w-12 h-12 bg-neutral-white border-2 border-neutral-darkest rounded-sm hover:bg-neutral-lightest transition-colors">
              <ChevronLeft size={24} className="text-neutral-darkest" />
            </button>
            <button className="flex justify-center items-center p-3 gap-2 w-12 h-12 bg-neutral-white border-2 border-neutral-darkest rounded-sm hover:bg-neutral-lightest transition-colors">
              <ChevronRight size={24} className="text-neutral-darkest" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}