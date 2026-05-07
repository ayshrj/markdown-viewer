import type { Metadata } from "next";
import { cookies } from "next/headers";
import { MarkdownStudio } from "@/components/markdown-studio";
import {
  ACTIVE_DOCUMENT_TITLE_COOKIE,
  SITE_DESCRIPTION,
  SITE_ICON_PATH,
  SITE_NAME,
  SITE_TITLE,
  SITE_URL,
} from "@/lib/site";

export async function generateMetadata(): Promise<Metadata> {
  const cookieStore = await cookies();
  const filename = getFilenameFromCookie(
    cookieStore.get(ACTIVE_DOCUMENT_TITLE_COOKIE)?.value
  );

  return {
    title: {
      absolute: filename ? `${filename} - ${SITE_NAME}` : SITE_TITLE,
    },
  };
}

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

function getFilenameFromCookie(value: string | undefined): string | null {
  if (!value) return null;

  let decodedValue = value;
  try {
    decodedValue = decodeURIComponent(value);
  } catch {
    decodedValue = value;
  }

  const filename = decodedValue.replace(/[\u0000-\u001f\u007f]/g, "").trim();
  if (!filename) return null;

  return filename.slice(0, 140);
}
