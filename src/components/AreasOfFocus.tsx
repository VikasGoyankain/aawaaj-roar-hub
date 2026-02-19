import { useState } from "react";

const areas = [
  {
    icon: "🎓",
    title: "Youth Leadership",
    color: "saffron",
    description:
      "Developing the next generation of fearless legal thinkers and activists — equipped with knowledge, network, and courage to lead change.",
    points: ["Leadership training programs", "Mentorship from legal experts", "Student chapter networks"],
  },
  {
    icon: "🤲",
    title: "Marginalized Support",
    color: "primary",
    description:
      "Standing alongside those society has overlooked — Dalits, tribal communities, women, minorities — ensuring their voices reach the courts and corridors of power.",
    points: ["Free legal consultation camps", "Rights awareness drives", "Direct intervention cases"],
  },
  {
    icon: "📢",
    title: "Grassroots Advocacy",
    color: "saffron",
    description:
      "Turning citizen frustration into organized advocacy — from local panchayats to national policy rooms, we follow issues wherever they lead.",
    points: ["RTI filing support", "Public interest campaigns", "Local authority engagement"],
  },
  {
    icon: "📊",
    title: "Information Equity",
    color: "primary",
    description:
      "Combating misinformation and information poverty — making verified, accurate, and actionable information available to every citizen, free of cost.",
    points: ["Fact-checking unit", "Legal literacy materials", "Open access reports"],
  },
];

const AreasOfFocus = () => {
  const [hovered, setHovered] = useState<number | null>(null);

  return (
    <section className="py-16 sm:py-24 gradient-dark-green">
      <div className="container mx-auto px-4 sm:px-6">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="inline-block text-saffron font-heading font-bold tracking-widest uppercase text-sm mb-4">
            What We Fight For
          </div>
          <h2 className="font-display text-3xl sm:text-4xl md:text-5xl font-black text-white leading-tight">
            Areas of Focus
          </h2>
          <div className="w-16 h-1 bg-saffron mx-auto mt-6" />
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {areas.map((area, i) => (
            <div
              key={area.title}
              className={`group relative cursor-pointer rounded-sm border transition-all duration-300 overflow-hidden ${
                hovered === i
                  ? area.color === "saffron"
                    ? "border-saffron bg-saffron shadow-[0_20px_50px_rgba(0,0,0,0.4)] -translate-y-2 scale-[1.03]"
                    : "border-primary-light bg-primary-light shadow-[0_20px_50px_rgba(0,0,0,0.4)] -translate-y-2 scale-[1.03]"
                  : "border-white/10 bg-white/5 hover:border-white/20"
              }`}
              onMouseEnter={() => setHovered(i)}
              onMouseLeave={() => setHovered(null)}
            >
              <div className="p-5 sm:p-7">
                <div className="text-4xl mb-5">{area.icon}</div>
                <h3
                  className={`font-display text-xl font-bold mb-3 transition-colors duration-300 ${
                    hovered === i ? "text-white" : "text-white"
                  }`}
                >
                  {area.title}
                </h3>
                <p className={`text-sm font-body leading-relaxed mb-5 transition-colors duration-300 ${hovered === i ? "text-white/90" : "text-white/60"}`}>
                  {area.description}
                </p>
                <ul className="space-y-2">
                  {area.points.map((pt) => (
                    <li key={pt} className={`flex items-start gap-2 text-xs font-body transition-colors duration-300 ${hovered === i ? "text-white/85" : "text-white/45"}`}>
                      <span className={`w-1 h-1 rounded-full mt-1.5 flex-shrink-0 ${hovered === i && area.color === "saffron" ? "bg-white" : hovered === i ? "bg-saffron" : "bg-saffron"}`} />
                      {pt}
                    </li>
                  ))}
                </ul>
              </div>
              {/* Bottom accent bar */}
              <div className={`absolute bottom-0 left-0 right-0 h-0.5 transition-all duration-300 ${hovered === i ? "bg-white/40" : "bg-saffron/30"}`} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default AreasOfFocus;
