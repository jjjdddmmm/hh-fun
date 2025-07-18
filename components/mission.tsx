export default function Mission() {
  return (
    <section className="flex flex-col items-center py-28 px-16 w-full bg-cinnabar-darker min-h-[864px]">
      <div className="flex flex-col items-start gap-20 w-full max-w-[1280px]">
        <div className="flex items-center gap-20 w-full">
          {/* Content */}
          <div className="flex flex-col items-start gap-6 flex-1">
            <h2 className="text-neutral-white font-heading text-h3 leading-[120%] tracking-[-0.01em]">
              We believe every real estate decision should be backed by comprehensive data and intelligent analysis, not guesswork.
            </h2>
            <p className="text-neutral-white font-body text-bodyLg leading-[150%]">
              Our mission is to democratize access to professional-grade property analysis, empowering buyers, investors, and agents with the insights they need to make confident, profitable real estate decisions.
            </p>
          </div>
          
          {/* Image */}
          <div className="flex-1">
            <div className="w-full rounded-md overflow-hidden" style={{ height: "640px" }}>
              <img 
                src="https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=600&h=640&fit=crop&crop=edges" 
                alt="Modern real estate analysis"
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}