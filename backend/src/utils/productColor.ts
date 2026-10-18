/**
 * Fixture colour of a product from free text ("This we have Gold color", "kleur: zwart", "golden wala"), and
 * helpers to keep linked colour variants from inheriting each other's colour in their titles.
 * Colour words in titles/specs follow the AI output language setting.
 */
import { getAiOutputLanguage, type AiOutputLanguage } from "./aiLanguage";

export interface ProductColor {
  /** Word used in product titles and the colour spec, in the AI output language */
  title: string;
  /** Value of the `color` filter attribute, when one exists for this colour */
  attribute?: string;
}

type Titles = Record<AiOutputLanguage, string>;

// `words`: everything recognised in hints and titles (NL / EN / DE / FR, plus common Hinglish)
const COLORS: Array<{ words: string[]; titles: Titles; attribute?: string }> = [
  {
    words: ["zwart", "black", "noir", "schwarz", "kala", "kaala"],
    titles: { nl: "Zwart", en: "Black", de: "Schwarz", fr: "Noir" },
    attribute: "Black",
  },
  {
    words: ["goud", "gold", "golden", "messing", "brass", "doré", "sunehra", "sunehri"],
    titles: { nl: "Goud", en: "Gold", de: "Gold", fr: "Doré" },
    attribute: "Gold",
  },
  {
    words: ["chroom", "chrome", "chrom", "chromé"],
    titles: { nl: "Chroom", en: "Chrome", de: "Chrom", fr: "Chromé" },
    attribute: "Silver",
  },
  {
    words: ["zilver", "silver", "silber", "argenté", "chandi", "chaandi"],
    titles: { nl: "Zilver", en: "Silver", de: "Silber", fr: "Argenté" },
    attribute: "Silver",
  },
  {
    words: ["wit", "white", "weiß", "weiss", "blanc", "safed", "safaid"],
    titles: { nl: "Wit", en: "White", de: "Weiß", fr: "Blanc" },
    attribute: "White",
  },
  {
    words: ["koper", "copper", "kupfer", "cuivre"],
    titles: { nl: "Koper", en: "Copper", de: "Kupfer", fr: "Cuivre" },
    attribute: "Copper",
  },
  { words: ["brons", "bronze"], titles: { nl: "Brons", en: "Bronze", de: "Bronze", fr: "Bronze" } },
  {
    words: ["grijs", "grey", "gray", "grau", "gris", "antraciet", "anthracite"],
    titles: { nl: "Grijs", en: "Grey", de: "Grau", fr: "Gris" },
  },
  { words: ["bruin", "brown", "braun", "marron"], titles: { nl: "Bruin", en: "Brown", de: "Braun", fr: "Marron" } },
  { words: ["crème", "creme", "cream"], titles: { nl: "Crème", en: "Cream", de: "Creme", fr: "Crème" } },
];

const ALL_WORDS = COLORS.flatMap((c) => c.words);
const WORD_RE = new RegExp(`(?<![\\p{L}])(${ALL_WORDS.join("|")})(?![\\p{L}])`, "giu");
/** Light colour, not fixture colour: "warm wit", "koel wit", "neutral white", "warmweiß" */
const LIGHT_COLOR_PREFIX = /(warm|koel|cool|neutraal|neutral|daylight|daglicht|kalt|tageslicht|chaud|froid)[\s-]*$/i;

/** Key of the colour spec in the AI output language ("Kleur", "Color", ...) */
export function colorSpecKey(lang: AiOutputLanguage = getAiOutputLanguage()): string {
  return { nl: "Kleur", en: "Color", de: "Farbe", fr: "Couleur" }[lang];
}

/** Matches colour spec keys in any supported language, but not light-colour keys ("Lichtkleur") */
export function isColorSpecKey(key: string): boolean {
  return /kleur|colou?r|farbe|couleur/i.test(key) && !/licht|light/i.test(key);
}

function colorForWord(word: string): ProductColor | null {
  const lower = word.toLowerCase();
  const entry = COLORS.find((c) => c.words.includes(lower));
  return entry ? { title: entry.titles[getAiOutputLanguage()], attribute: entry.attribute } : null;
}

/**
 * Fixture colour mentioned in a hint. An explicit "<colour> color" / "kleur: <colour>" wins; otherwise the
 * first colour word that is not a light colour ("warm white") is used.
 */
export function detectProductColor(text: string | undefined | null): ProductColor | null {
  if (!text) return null;
  const words = ALL_WORDS.join("|");
  const explicit =
    new RegExp(`(?<![\\p{L}])(${words})\\s+(?:colou?r|kleur|farbe|couleur|rang)`, "iu").exec(text) ||
    new RegExp(`(?:colou?r|kleur|farbe|couleur|rang)\\s*[:=]?\\s*(${words})(?![\\p{L}])`, "iu").exec(text);
  if (explicit) return colorForWord(explicit[1]);

  for (const match of text.matchAll(WORD_RE)) {
    const before = text.slice(0, match.index);
    if (LIGHT_COLOR_PREFIX.test(before)) continue;
    return colorForWord(match[1]);
  }
  return null;
}

/** Title without colour words, e.g. "Signo Ring Zwart – Moderne LED Hanglamp" -> "Signo Ring – Moderne LED Hanglamp" */
export function stripColorWords(title: string): string {
  return title
    .replace(WORD_RE, "")
    .replace(/\s{2,}/g, " ")
    .replace(/\s+([–\-,])/g, " $1")
    .trim();
}

/**
 * Make a title carry `color`: any other colour word in it is replaced. Titles without a colour word are
 * left alone (not every product name mentions one).
 */
export function applyColorToTitle(title: string, color: ProductColor): string {
  const fixtureColorWords = [...title.matchAll(WORD_RE)].filter((m) => !LIGHT_COLOR_PREFIX.test(title.slice(0, m.index)));
  // Already names this colour (possibly two-tone, "Zwart Goud"): leave it
  if (fixtureColorWords.some((m) => colorForWord(m[1])?.title === color.title)) return title;
  if (fixtureColorWords.length === 0) return title;

  let replaced = false;
  const result = title.replace(WORD_RE, (word: string, _w: string, offset: number) => {
    if (LIGHT_COLOR_PREFIX.test(title.slice(0, offset))) return word;
    if (replaced) return "";
    replaced = true;
    return color.title;
  });
  return result.replace(/\s{2,}/g, " ").replace(/\s+([–\-,])/g, " $1").trim();
}
