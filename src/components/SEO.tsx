import { Helmet } from "react-helmet-async";

interface SEOProps {
  title?: string;
  description?: string;
  keywords?: string;
  ogType?: string;
  ogImage?: string;
  canonical?: string;
  noIndex?: boolean;
}

const SITE_NAME = "Aawaaj Movement";
const DEFAULT_DESCRIPTION =
  "Aawaaj Movement — Empowering voices, amplifying change. Join India's youth-led social impact movement fighting for justice, equality, and community welfare.";
const DEFAULT_OG_IMAGE = "/og-default.png"; // replace with your actual OG image

export default function SEO({
  title,
  description = DEFAULT_DESCRIPTION,
  keywords = "Aawaaj Movement, social impact, youth movement, India, volunteer, justice, equality, community welfare, NGO",
  ogType = "website",
  ogImage = DEFAULT_OG_IMAGE,
  canonical,
  noIndex = false,
}: SEOProps) {
  const fullTitle = title ? `${title} — ${SITE_NAME}` : SITE_NAME;

  return (
    <Helmet>
      {/* Primary */}
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      {keywords && <meta name="keywords" content={keywords} />}
      {noIndex && <meta name="robots" content="noindex, nofollow" />}
      {canonical && <link rel="canonical" href={canonical} />}

      {/* Open Graph */}
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:type" content={ogType} />
      {ogImage && <meta property="og:image" content={ogImage} />}
      <meta property="og:site_name" content={SITE_NAME} />

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      {ogImage && <meta name="twitter:image" content={ogImage} />}
    </Helmet>
  );
}
