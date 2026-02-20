import SEO from "@/components/SEO";
import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import AboutSection from "@/components/AboutSection";
import AawaajModel from "@/components/AawaajModel";
import AreasOfFocus from "@/components/AreasOfFocus";
import LeadershipSection from "@/components/LeadershipSection";
import WhyJoin from "@/components/WhyJoin";
import FooterSection from "@/components/FooterSection";

const Index = () => {
  return (
    <div className="min-h-screen">
      <SEO
        title="Home"
        description="Aawaaj Movement — Empowering voices, amplifying change. Join India's youth-led social impact movement fighting for justice, equality, and community welfare."
      />
      <Navbar />
      <main>
        <HeroSection />
        <AboutSection />
        <div id="model">
          <AawaajModel />
        </div>
        <div id="focus">
          <AreasOfFocus />
        </div>
        <div id="leadership">
          <LeadershipSection />
        </div>
        <div id="why-join">
          <WhyJoin />
        </div>
      </main>
      <FooterSection />
    </div>
  );
};

export default Index;
