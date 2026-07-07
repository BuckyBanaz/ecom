/** Unwrap plain text when Gemini returns JSON like { "robots_txt": "..." }. */

const JSON_VALUE_KEYS = [
  "robots_txt",
  "robots",
  "llms_txt",
  "llms",
  "content",
  "text",
  "body",
];

export function stripAiCodeFences(raw: string): string {
  return raw
    .trim()
    .replace(/^```(?:txt|text|markdown|robots|json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
}

function unescapeJsonString(value: string): string {
  return value.replace(/\\n/g, "\n").replace(/\\"/g, '"').replace(/\\\\/g, "\\");
}

function tryParseJsonPayload(slice: string, keys: string[]): string | null {
  try {
    const parsed = JSON.parse(slice) as Record<string, unknown>;
    for (const key of keys) {
      const val = parsed[key];
      if (typeof val === "string" && val.trim()) {
        return unescapeJsonString(val.trim());
      }
    }
  } catch {
    /* not valid JSON */
  }
  return null;
}

function tryRegexExtract(raw: string, keys: string[]): string | null {
  for (const key of keys) {
    const re = new RegExp(`"${key}"\\s*:\\s*"((?:\\\\.|[^"\\\\])*)"`, "s");
    const match = raw.match(re);
    if (match?.[1]) {
      const extracted = unescapeJsonString(match[1]);
      // Safety check: if the extracted content is less than 50% of the raw response,
      // it is likely a false positive matching inline text, so ignore it.
      if (extracted.length >= raw.length * 0.5) {
        return extracted;
      }
    }
  }
  return null;
}

export function unwrapAiPlainTextPayload(raw: string, keys: string[] = JSON_VALUE_KEYS): string {
  if (!raw?.trim()) return "";

  let text = stripAiCodeFences(raw);

  const jsonStart = text.indexOf("{");
  if (jsonStart !== -1) {
    const fromJson = tryParseJsonPayload(text.slice(jsonStart), keys);
    if (fromJson) return fromJson;
  }

  if (text.startsWith("{") && text.endsWith("}")) {
    const fromJson = tryParseJsonPayload(text, keys);
    if (fromJson) return fromJson;
  }

  const fromRegex = tryRegexExtract(text, keys);
  if (fromRegex) return fromRegex;

  if (text.includes("\\n") && !text.includes("\n")) {
    text = unescapeJsonString(text);
  }

  return text.trim();
}
