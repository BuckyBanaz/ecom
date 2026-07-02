/** Shared Google service-account credential parsing for GA4 + Search Console. */

export function parseGooglePrivateKey(raw: string): string {
  let privateKey = raw.replace(/^["']|["']$/g, "");
  const beginMarker = "-----BEGIN PRIVATE KEY-----";
  const endMarker = "-----END PRIVATE KEY-----";

  if (privateKey.includes(beginMarker) && privateKey.includes(endMarker)) {
    let base64 = privateKey.substring(
      privateKey.indexOf(beginMarker) + beginMarker.length,
      privateKey.indexOf(endMarker),
    );
    base64 = base64.replace(/\s/g, "").replace(/\\n/g, "").replace(/\\/g, "");
    const chunks = base64.match(/.{1,64}/g) || [];
    privateKey = `${beginMarker}\n${chunks.join("\n")}\n${endMarker}\n`;
  } else {
    privateKey = privateKey.replace(/\\+n/g, "\n").trim();
  }

  return privateKey;
}

export function getGoogleServiceAccountCredentials(): { clientEmail: string; privateKey: string } | null {
  const clientEmail = process.env.GA4_CLIENT_EMAIL?.trim();
  const rawKey = process.env.GA4_PRIVATE_KEY?.trim();
  if (!clientEmail || !rawKey) return null;
  return {
    clientEmail,
    privateKey: parseGooglePrivateKey(rawKey),
  };
}

export function getGscSiteUrl(): string | null {
  const configured = process.env.GSC_SITE_URL?.trim();
  if (configured) return configured;
  const canonical = process.env.SEO_CANONICAL_URL?.trim();
  if (!canonical) return null;
  return canonical.endsWith("/") ? canonical : `${canonical}/`;
}

export function isGoogleApiConfigured(): boolean {
  return !!getGoogleServiceAccountCredentials() && !!getGscSiteUrl();
}
