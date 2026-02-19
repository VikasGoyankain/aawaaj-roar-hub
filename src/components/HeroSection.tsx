import { useState, useEffect, useRef } from "react";
import heroImage from "@/assets/hero-activists.jpg";

/* ── Count-up hook (triggers once on intersection) ── */
function useCountUp(end: number, duration = 1800) {
  const [value, setValue] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const started = useRef(false);
  useEffect(() => {
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !started.current) {
          started.current = true;
          const startTime = performance.now();
          const tick = (now: number) => {
            const progress = Math.min((now - startTime) / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            setValue(Math.round(eased * end));
            if (progress < 1) requestAnimationFrame(tick);
          };
          requestAnimationFrame(tick);
          obs.disconnect();
        }
      },
      { threshold: 0.5 }
    );
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, [end, duration]);
  return { value, ref };
}

function StatCounter({ value, suffix, label }: { value: number; suffix: string; label: string }) {
  const { value: count, ref } = useCountUp(value);
  return (
    <div ref={ref} className="text-center border-r border-white/20 last:border-0">
      <div className="text-2xl sm:text-3xl font-display font-black text-saffron">
        {count}{suffix}
      </div>
      <div className="text-white/70 text-xs sm:text-sm font-body tracking-widest uppercase mt-1">{label}</div>
    </div>
  );
}

const HeroSection = () => {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background Image */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${heroImage})` }}
      />
      {/* Gradient Overlay */}
      <div className="absolute inset-0 gradient-hero" />

      {/* Saffron accent line at top */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-saffron" />

      {/* Content */}
      <div className="relative z-10 container mx-auto px-6 text-center">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 bg-saffron/20 border border-saffron/40 text-saffron px-4 py-2 rounded-full text-sm font-heading font-semibold tracking-widest uppercase mb-8 animate-fade-in">
          <span className="w-2 h-2 rounded-full bg-saffron animate-pulse inline-block" />
          Youth-Led · Legal Activists · India
        </div>

        {/* Main Headline */}
        <h1 className="font-display text-4xl sm:text-5xl md:text-7xl lg:text-8xl font-black text-white leading-[1.05] mb-6 animate-slide-up-blur" style={{ animationDelay: '0.2s', opacity: 0 }}>
          Aawaaj Movement:<br />
          <span className="text-saffron italic">Roar of the Youth !!</span>
        </h1>

        {/* Sub-headline */}
        <p className="text-white/85 text-base md:text-2xl font-body font-light max-w-3xl mx-auto mb-8 sm:mb-12 leading-relaxed animate-fade-up" style={{ animationDelay: '0.4s', opacity: 0 }}>
          Turning individual frustration into a coordinated roar that the system can no longer ignore.
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center animate-fade-up" style={{ animationDelay: '0.6s', opacity: 0 }}>
          <a
            href="/register"
            className="inline-flex items-center justify-center gap-2 bg-saffron hover:bg-saffron-dark text-white font-heading font-bold text-base sm:text-lg px-7 sm:px-10 py-3 sm:py-4 rounded-sm transition-all duration-300 shadow-saffron hover:shadow-lg hover:-translate-y-1 tracking-wide"
          >
            Join the Movement
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </a>
          <a
            href="#about"
            className="inline-flex items-center justify-center gap-2 border-2 border-white/60 text-white hover:bg-white/10 font-heading font-semibold text-base sm:text-lg px-7 sm:px-10 py-3 sm:py-4 rounded-sm transition-all duration-300 tracking-wide"
          >
            Learn More
          </a>
        </div>

        {/* Stats bar */}
        <div className="mt-12 sm:mt-20 grid grid-cols-3 gap-2 sm:gap-6 max-w-2xl mx-auto animate-fade-up" style={{ animationDelay: '0.8s', opacity: 0 }}>
          <StatCounter value={25} suffix="+" label="Districts" />
          <StatCounter value={500} suffix="+" label="Youth Members" />
          <StatCounter value={100} suffix="+" label="Cases Raised" />
        </div>
      </div>


    </section>
  );
};

export default HeroSection;
