/**
 * Fixture colour of a product from free text ("This we have Gold color", "kleur: zwart"), and helpers
 * to keep linked colour variants from inheriting each other's colour in their titles.
 */

export interface ProductColor {
  /** Word used in Dutch product titles and the "Kleur" spec */
  title: string;
  /** Value of the `color` filter attribute, when one exists for this colour */
  attribute?: string;
}

const COLORS: Array<{ words: string[]; color: ProductColor }> = [
  { words: ["zwart", "black", "noir"], color: { title: "Zwart", attribute: "Black" } },
  { words: ["goud", "gold", "golden", "messing", "brass"], color: { title: "Goud", attribute: "Gold" } },
  { words: ["chroom", "chrome"], color: { title: "Chroom", attribute: "Silver" } },
  { words: ["zilver", "silver"], color: { title: "Zilver", attribute: "Silver" } },
  { words: ["wit", "white"], color: { title: "Wit", attribute: "White" } },
  { words: ["koper", "copper"], color: { title: "Koper", attribute: "Copper" } },
  { words: ["brons", "bronze"], color: { title: "Brons" } },
  { words: ["grijs", "grey", "gray", "antraciet", "anthracite"], color: { title: "Grijs" } },
  { words: ["bruin", "brown"], color: { title: "Bruin" } },
  { words: ["crème", "creme", "cream"], color: { title: "Crème" } },
];

const ALL_WORDS = COLORS.flatMap((c) => c.words);
const WORD_RE = new RegExp(`(?<![\\p{L}])(${ALL_WORDS.join("|")})(?![\\p{L}])`, "giu");
/** Light colour, not fixture colour: "warm wit", "koel wit", "neutral white" */
const LIGHT_COLOR_PREFIX = /(warm|koel|cool|neutraal|neutral|daylight|daglicht)[\s-]*$/i;

function colorForWord(word: string): ProductColor | null {
  const lower = word.toLowerCase();
  return COLORS.find((c) => c.words.includes(lower))?.color ?? null;
}

/**
 * Fixture colour mentioned in a hint. An explicit "<colour> color" / "kleur: <colour>" wins; otherwise the
 * first colour word that is not a light colour ("warm white") is used.
 */
export function detectProductColor(text: string | undefined | null): ProductColor | null {
  if (!text) return null;
  const explicit =
    new RegExp(`(?<![\\p{L}])(${ALL_WORDS.join("|")})\\s+(?:colou?r|kleur)`, "iu").exec(text) ||
    new RegExp(`(?:colou?r|kleur)\\s*[:=]?\\s*(${ALL_WORDS.join("|")})(?![\\p{L}])`, "iu").exec(text);
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
