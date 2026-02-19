import { useState } from "react";

const Navbar = () => {
  const [open, setOpen] = useState(false);

  const links = [
    { label: "About", href: "#about" },
    { label: "Our Model", href: "#model" },
    { label: "Focus Areas", href: "#focus" },
    { label: "Leadership", href: "#leadership" },
    { label: "Why Join", href: "#why-join" },
  ];

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-primary/95 backdrop-blur-sm border-b border-white/10">
      <div className="container mx-auto px-6 h-16 flex items-center justify-between">
        {/* Logo */}
        <a href="#" className="font-display text-2xl font-black text-white">
          Aawaaj<span className="text-saffron">.</span>
        </a>

        {/* Desktop links */}
        <div className="hidden md:flex items-center gap-8">
          {links.map((l) => (
            <a
              key={l.label}
              href={l.href}
              className="text-white/70 hover:text-saffron font-heading font-semibold text-sm tracking-wide uppercase transition-colors duration-200"
            >
              {l.label}
            </a>
          ))}
        </div>

        {/* CTA */}
        <div className="hidden md:block">
          <a
            href="/register"
            className="bg-saffron hover:bg-saffron-dark text-white font-heading font-bold text-sm px-6 py-2.5 rounded-sm tracking-wide transition-all duration-200"
          >
            Join Now
          </a>
        </div>

        {/* Mobile hamburger */}
        <button
          className="md:hidden text-white p-2"
          onClick={() => setOpen(!open)}
          aria-label="Toggle menu"
        >
          {open ? (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          )}
        </button>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="md:hidden bg-primary border-t border-white/10 px-6 py-4 space-y-3">
          {links.map((l) => (
            <a
              key={l.label}
              href={l.href}
              className="block text-white/75 hover:text-saffron font-heading font-semibold text-sm tracking-wide uppercase py-2 border-b border-white/5"
              onClick={() => setOpen(false)}
            >
              {l.label}
            </a>
          ))}
          <a
            href="/register"
            className="block bg-saffron text-white font-heading font-bold text-sm px-6 py-3 rounded-sm tracking-wide text-center mt-4"
          >
            Join Now
          </a>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
