import { MarkdownStudio } from "@/components/markdown-studio";
import { SITE_DESCRIPTION, SITE_ICON_PATH, SITE_NAME, SITE_URL } from "@/lib/site";

export default function Home() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: SITE_NAME,
    description: SITE_DESCRIPTION,
    url: SITE_URL,
    applicationCategory: "ProductivityApplication",
    operatingSystem: "Any",
    image: `${SITE_URL}${SITE_ICON_PATH}`,
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <MarkdownStudio />
    </>
  );
}
