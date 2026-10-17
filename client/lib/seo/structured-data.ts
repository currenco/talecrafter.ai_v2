import { SITE_DESCRIPTION, SITE_IMAGE, SITE_NAME, SITE_URL } from "./config";

export const siteStructuredData = {
  "@context": "https://schema.org",
  "@graph": [
    { "@type": "Organization", "@id": `${SITE_URL}/#organization`, name: SITE_NAME, url: SITE_URL, logo: SITE_IMAGE },
    { "@type": "WebSite", "@id": `${SITE_URL}/#website`, name: SITE_NAME, url: SITE_URL, description: SITE_DESCRIPTION, publisher: { "@id": `${SITE_URL}/#organization` } },
  ],
};

// Prevent user-generated story titles from terminating the JSON-LD script tag.
export const serializeJsonLd = (data: unknown) => JSON.stringify(data).replace(/</g, "\\u003c");
