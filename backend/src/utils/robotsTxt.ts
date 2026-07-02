/** Sanitize robots.txt — invalid lines break Lighthouse SEO (must use # comments). */

const VALID_DIRECTIVE = /^(User-agent|Disallow|Allow|Sitemap|Crawl-delay|Host)\s*:/i;

export function sanitizeRobotsTxt(raw: string): string {
  if (!raw?.trim()) return "";

  const out: string[] = [];

  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed) {
      out.push("");
      continue;
    }
    if (trimmed.startsWith("#")) {
      out.push(line.trimEnd());
      continue;
    }
    if (VALID_DIRECTIVE.test(trimmed)) {
      out.push(line.trimEnd());
      continue;
    }
    // e.g. "LLM context file: https://..." is invalid without a leading #
    out.push(`# ${trimmed}`);
  }

  let result = out.join("\n").trim();
  if (result && !result.endsWith("\n")) result += "\n";
  return result;
}

export function getRobotsTxtValidationError(raw: string): string | null {
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    if (!VALID_DIRECTIVE.test(trimmed)) {
      return `Invalid robots.txt line: "${trimmed}". Use # for comments (e.g. "# LLM context: https://…").`;
    }
  }
  if (!raw.includes("User-agent:")) {
    return "robots.txt must include at least one User-agent: directive.";
  }
  return null;
}
