import { lookupStaticPhrase } from "./cmsPhrases";
import type { TFunction } from "i18next";
import { labelT } from "./i18nLabel";

/** CMS endpoints store rich HTML — never Google-translate the response. */
export function shouldMachineTranslateApiUrl(url: string): boolean {
  const path = url.split("?")[0].toLowerCase();
  if (path.includes("/cms/pages")) return true;
  if (path.includes("/cms/homepage")) return false;
  if (path.includes("/cms/relief")) return false;
  if (path.includes("/cms/header-footer")) return false;
  if (path.includes("/cms/features")) return false;
  if (path.includes("/cms/faqs")) return false;
  if (path.includes("/cms/legal")) return false;
  // /api/v1/cms/business — dynamic page slug
  if (/\/cms\/[^/]+$/.test(path)) return false;
  return true;
}

const TRANSLATABLE_ATTRS = new Set([
  "title",
  "subtitle",
  "description",
  "primary_button_text",
  "secondary_button_text",
  "title_1",
  "desc_1",
  "title_2",
  "desc_2",
  "title_3",
  "desc_3",
  "title_4",
  "desc_4",
]);

/** Rich CMS HTML — never run through Google Translate (breaks grid/CSS/layout). */
const PRESERVE_STORED_HTML_KEYS = new Set(["body", "content"]);

const cache: Record<string, string> = {};

/**
 * Translates a single text string using Google Translate free API.
 * Uses local memory and localStorage caching.
 */
export async function translateText(text: string, targetLang: string): Promise<string> {
  if (!text || !text.trim()) return text;
  
  // Normalize target lang (e.g. nl-NL -> nl)
  const lang = targetLang.split("-")[0].toLowerCase();
  
  // No translation needed if target is English and source is assumed English,
  // but sl=auto will handle it anyway. To save api calls, let's skip for simple cases.
  // Wait, if it's already english and target is english, we skip.
  if (lang === "en") return text;

  const staticPhrase = lookupStaticPhrase(text, lang);
  if (staticPhrase) return staticPhrase;

  const cacheKey = `${lang}:${text}`;
  if (cache[cacheKey]) return cache[cacheKey];

  const localCached = localStorage.getItem(`tr:${cacheKey}`);
  if (localCached) {
    cache[cacheKey] = localCached;
    return localCached;
  }

  try {
    const response = await fetch(
      `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${lang}&dt=t&q=${encodeURIComponent(text)}`
    );
    if (!response.ok) throw new Error("Translation request failed");
    const data = await response.json();
    
    // Join translation parts
    const translation = data[0].map((item: any) => item[0]).join("");
    
    cache[cacheKey] = translation;
    localStorage.setItem(`tr:${cacheKey}`, translation);
    return translation;
  } catch (error) {
    console.warn("Translation failed for text:", text, error);
    return text;
  }
}

function replaceTrimmedPreservingEdges(raw: string, trimmed: string, translated: string): string {
  const start = raw.indexOf(trimmed);
  if (start === -1) return translated;
  return raw.slice(0, start) + translated + raw.slice(start + trimmed.length);
}

/**
 * Translate one CMS text fragment for storefront TAAL (EN/NL).
 * NL → stored Dutch as-is. EN → cmsPhrases + i18n, then Google nl→en (cached).
 * Never mutates HTML — call only on plain text nodes / attribute values.
 */
export async function translateCmsText(
  text: string,
  targetLang: string,
  t?: TFunction,
): Promise<string> {
  if (!text?.trim()) return text;

  const lang = targetLang.split("-")[0].toLowerCase();
  const trimmed = text.trim();

  if (lang === "nl") return text;

  if (t) {
    const fromApp = labelT(t, trimmed, "en");
    if (fromApp && fromApp !== trimmed) {
      return replaceTrimmedPreservingEdges(text, trimmed, fromApp);
    }
  }

  const phrase = lookupStaticPhrase(trimmed, "en");
  if (phrase) return replaceTrimmedPreservingEdges(text, trimmed, phrase);

  const cacheKey = `en-nl:${trimmed}`;
  if (cache[cacheKey]) return replaceTrimmedPreservingEdges(text, trimmed, cache[cacheKey]);

  const localCached = localStorage.getItem(`tr:${cacheKey}`);
  if (localCached) {
    cache[cacheKey] = localCached;
    return replaceTrimmedPreservingEdges(text, trimmed, localCached);
  }

  try {
    const response = await fetch(
      `https://translate.googleapis.com/translate_a/single?client=gtx&sl=nl&tl=en&dt=t&q=${encodeURIComponent(trimmed)}`,
    );
    if (!response.ok) throw new Error("CMS text translation failed");
    const data = await response.json();
    const translation = data[0].map((item: [string]) => item[0]).join("");

    cache[cacheKey] = translation;
    localStorage.setItem(`tr:${cacheKey}`, translation);
    return replaceTrimmedPreservingEdges(text, trimmed, translation);
  } catch (error) {
    console.warn("CMS text translation failed:", trimmed.slice(0, 48), error);
    return text;
  }
}

/**
 * Translates an HTML or Shortcode string safely.
 * Keeps HTML tags and shortcode structures intact, but translates
 * inside text nodes and translatable shortcode attributes.
 */
export async function translateHtmlOrShortcode(content: string, targetLang: string): Promise<string> {
  if (!content || !content.trim()) return content;
  const lang = targetLang.split("-")[0].toLowerCase();
  if (lang === "en") return content;

  // Split into HTML tags, shortcode tags, and raw text segments.
  // Example: <h2>Title</h2> [banner title="Spring Deals"]Text[/banner]
  const tokenRegex = /(<\/?[a-zA-Z0-9]+[^>]*>|\[\/?[a-zA-Z0-9_-]+[^\]]*\])/g;
  const segments = content.split(tokenRegex);

  const translatedSegments = await Promise.all(
    segments.map(async (segment, index) => {
      // Odd indices are HTML tags or shortcode tags
      if (index % 2 === 1) {
        // Check if it's an opening shortcode tag (starts with '[' but not '[/')
        if (segment.startsWith("[") && !segment.startsWith("[/")) {
          // Parse attributes
          const attrRegex = /([a-zA-Z0-9_]+)="([^"]*)"/g;
          let match;
          let modifiedSegment = segment;
          
          while ((match = attrRegex.exec(segment)) !== null) {
            const attrName = match[1];
            const attrVal = match[2];
            
            if (TRANSLATABLE_ATTRS.has(attrName) && attrVal.trim()) {
              const translatedVal = await translateText(attrVal, lang);
              // Replace in the modified segment
              modifiedSegment = modifiedSegment.replace(
                `${attrName}="${attrVal}"`,
                `${attrName}="${translatedVal.replace(/"/g, '&quot;')}"`
              );
            }
          }
          return modifiedSegment;
        }
        // Return HTML tags or closing/non-attribute shortcodes as is
        return segment;
      } else {
        // Even indices are raw text segments
        // Skip if segment is empty or just whitespace/entities
        if (!segment.trim() || segment.trim() === "<br/>" || segment.trim() === "<br>") {
          return segment;
        }
        return await translateText(segment, lang);
      }
    })
  );

  return translatedSegments.join("");
}

/**
 * Traverses a JSON object and recursively translates all translatable string fields.
 */
export async function translateJsonObject(obj: any, targetLang: string): Promise<any> {
  if (!obj) return obj;
  const lang = targetLang.split("-")[0].toLowerCase();
  if (lang === "en") return obj;

  if (Array.isArray(obj)) {
    return Promise.all(obj.map((item) => translateJsonObject(item, lang)));
  }

  if (typeof obj === "object") {
    const newObj = { ...obj };
    
    for (const key of Object.keys(newObj)) {
      const val = newObj[key];
      
      if (!val) continue;

      if (PRESERVE_STORED_HTML_KEYS.has(key) && typeof val === "string") {
        continue;
      }

      // 1. If key is 'specs' (specifications sheet)
      if (key === "specs") {
        if (Array.isArray(val)) {
          newObj[key] = await Promise.all(
            val.map(async (specItem: any) => {
              if (specItem && typeof specItem === "object") {
                return {
                  ...specItem,
                  key: await translateText(specItem.key, lang),
                  value: await translateText(specItem.value, lang),
                };
              }
              return specItem;
            })
          );
        } else if (typeof val === "object") {
          const newSpecs: Record<string, any> = {};
          for (const k of Object.keys(val)) {
            const translatedK = await translateText(k, lang);
            const translatedV = typeof val[k] === "string" ? await translateText(val[k], lang) : val[k];
            newSpecs[translatedK] = translatedV;
          }
          newObj[key] = newSpecs;
        }
      }
      // 2. If key is 'sections' (e.g. MegaMenu sections)
      else if (key === "sections" && Array.isArray(val)) {
        newObj[key] = await Promise.all(
          val.map(async (sec: any) => {
            if (sec && typeof sec === "object") {
              const newSec = { ...sec };
              if (newSec.title) {
                newSec.title = await translateText(newSec.title, lang);
              }
              if (Array.isArray(newSec.items)) {
                newSec.items = await Promise.all(
                  newSec.items.map(async (item: any) => {
                    if (item && typeof item === "object" && item.name) {
                      return {
                        ...item,
                        name: await translateText(item.name, lang),
                      };
                    }
                    return item;
                  })
                );
              }
              return newSec;
            }
            return sec;
          })
        );
      }
      // 3. Translate specific text fields
      else if (
        typeof val === "string" &&
        [
          "name",
          "title",
          "subtitle",
          "description",
          "shortDescription",
          "excerpt",
          "body",
          "content",
          "menu",
          "customerName",
          "productName",
          "text",
          "label",
          "brandText",
          "seoTitle",
          "seoDesc",
        ].includes(key)
      ) {
        try {
          // Check if it's HTML/Shortcode content
          if (val.includes("<") || val.includes("[")) {
            newObj[key] = await translateHtmlOrShortcode(val, lang);
          } else {
            newObj[key] = await translateText(val, lang);
          }
        } catch {
          newObj[key] = val;
        }
      } 
      // 4. Recursively translate child objects or arrays (except known system keys)
      else if (typeof val === "object" && !["brand", "user"].includes(key)) {
        newObj[key] = await translateJsonObject(val, lang);
      }
    }
    return newObj;
  }

  return obj;
}
