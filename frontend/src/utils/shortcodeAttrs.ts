/** Decode HTML entities inside shortcode attribute values (DOMParser encodes & on save). */
export function decodeShortcodeAttribute(value: string): string {
  if (!value) return value;
  return value
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

/** Encode user text for shortcode double-quoted attributes. */
export function encodeShortcodeAttribute(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;");
}

/** Normalize stored HTML so shortcode attribute values use plain & not &amp; entities. */
export function decodeShortcodesInHtml(html: string): string {
  if (!html?.trim()) return html;
  return html.replace(/\[([a-zA-Z0-9-]+)([^\]]*)\]\[\/\1\]/g, (_full, type: string, attrs: string) => {
    const decodedAttrs = attrs
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&amp;/g, "&");
    return `[${type}${decodedAttrs}][/${type}]`;
  });
}
