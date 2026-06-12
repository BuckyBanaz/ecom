/**
 * Human-reviewed translations for CMS / API English phrases.
 * Used before Google Translate to avoid wrong or inconsistent meanings.
 */
const PHRASES: Record<string, Record<string, string>> = {
  nl: {
    "Spring Deals": "Voorjaarsaanbiedingen",
    "Spring deals": "Voorjaarsaanbiedingen",
    "Shop now": "Nu shoppen",
    "Shop Now": "Nu shoppen",
    "Up to 50% off": "Tot 50% korting",
    "Up to 50% Off": "Tot 50% korting",
    "Bestsellers": "Best verkocht",
    "Best sellers": "Best verkocht",
    "Deals": "Aanbiedingen",
    "Clearance": "Opruiming",
    "Outlet": "Outlet",
    "Relief": "Verlichting",
    "Buying lighting? Choose a category": "Verlichting kopen? Kies een categorie",
    "View all": "Alles bekijken",
    "View All": "Alles bekijken",
    "Learn more": "Meer informatie",
    "Read more": "Lees meer",
    "Add to cart": "In winkelwagen",
    "Free shipping on orders over €75": "Gratis verzending vanaf €75",
    "Secure checkout": "Veilig afrekenen",
    "New arrivals": "Nieuw binnen",
    "Featured": "Uitgelicht",
    "Sale": "Sale",
    "Interior lighting": "Binnenverlichting",
    "Outdoor lighting": "Buitenverlichting",
    "Light sources": "Lichtbronnen",
    "Categories": "Categorieën",
    "Pendant lights": "Hanglampen",
    "Ceiling lights": "Plafondlampen",
    "Wall lights": "Wandlampen",
    "Table lamps": "Tafellampen",
    "Floor lamps": "Vloerlampen",
    "Rooms": "Ruimtes",
    "Living room": "Woonkamer",
    "Bedroom": "Slaapkamer",
    "Kitchen": "Keuken",
    "Bathroom": "Badkamer",
    "Dining room": "Eetkamer",
    "Hallway": "Hal",
    "Styles": "Stijlen",
    "Modern": "Modern",
    "Industrial": "Industrieel",
    "Classic": "Klassiek",
    "Vintage": "Vintage",
    "Design": "Design",
    "Rustic": "Rustiek",
    "Smart lighting": "Slimme verlichting",
    "LED strips": "LED strips",
    "Outdoor wall lights": "Buiten wandlampen",
    "Standing lights": "Staande lampen",
    "Solar lights": "Solarlampen",
    "Sensor lights": "Sensorlampen",
    "Spotlights": "Spots",
    "Motion sensor": "Bewegingssensor",
    "Dimmable": "Dimbaar",
    "Smart outdoor": "Slimme buitenverlichting",
    "New in": "Nieuw binnen",
    "Offers": "Aanbiedingen",
    "Fittings": "Fittingen",
    "E27 (Large)": "E27 (Groot)",
    "E14 (Small)": "E14 (Klein)",
    "GU10": "GU10",
    "G9": "G9",
    "Types": "Soorten",
    "LED Bulbs": "LED lampen",
    "Smart Bulbs": "Slimme lampen",
    "Filament Bulbs": "Filament lampen",
    "Business lighting": "Zakelijke verlichting",
    "Smart home": "Smart home",
    "Accessories": "Accessoires",
    "Pendant lamps": "Hanglampen",
    "Ceiling lamps": "Plafondlampen",
    "Wall lamps": "Wandlampen",
    "Floor lamps": "Vloerlampen",
    "Table lamps": "Tafellampen",
    "Chandeliers": "Kroonluchters",
    "Outdoor lamps": "Buitenlampen",
    "String lights": "Lichtslingers",
    "LED bulbs": "LED lampen",
    "Smart bulbs": "Slimme lampen",
    "Office lighting": "Kantoorverlichting",
    "Lampshades": "Lampenkappen",
    "15,000+ reviews": "15.000+ reviews",
    "Ordered before 22:00, delivered next day": "Voor 22:00 besteld, morgen in huis",
    "30-day returns": "30 dagen bedenktijd",
    "Business": "Zakelijk",
    "Customer service": "Klantenservice",
    "Contact us": "Neem contact op",
    "About us": "Over ons",
    "Our story": "Ons verhaal",
    "(View styles & all options)": "(Bekijk stijlen & alle opties)",
  },
};

// CMS often stores Dutch copy — map back to English when TAAL is EN.
const NL_TO_EN: Record<string, string> = {};
for (const [english, dutch] of Object.entries(PHRASES.nl)) {
  NL_TO_EN[dutch] = english;
  NL_TO_EN[english] = english;
}
// Common Dutch header variants (CMS / topbar)
Object.assign(NL_TO_EN, {
  "15.000+ reviews": "15,000+ reviews",
  "15,000+ beoordelingen": "15,000+ reviews",
  "15.000+ beoordelingen": "15,000+ reviews",
  "30 dagen retourrecht": "30-day returns",
  "Voor 22:00 besteld, morgen in huis": "Ordered before 22:00, delivered next day",
  Zakelijke: "Business",
  Klantenservice: "Customer service",
  Aanbiedingen: "Deals",
  Binnenverlichting: "Interior lighting",
  Buitenverlichting: "Outdoor lighting",
  Lichtbronnen: "Light sources",
  Groothandel: "Wholesale",
  Samenwerkingen: "Partnerships",
  "Zakelijke verlichting voor grotere inkoopvolumes":
    "Business lighting for larger purchase volumes",
  "Voor retailers, aannemers, architecten, interieurprofessionals en projectinkopers die zoeken naar scherpe prijzen, betrouwbare levering en persoonlijke ondersteuning.":
    "For retailers, contractors, architects, interior professionals and project buyers looking for competitive prices, reliable delivery and personal support.",
  "Vraag een offerte aan": "Request a quote",
  "Bekijk de voordelen": "View the benefits",
  Bulk: "Bulk",
  Zakelijk: "Business",
  Project: "Project",
  "Ondersteuning bij grotere bestellingen": "Support for larger orders",
  "Scherpe prijzen voor professionals": "Competitive prices for professionals",
  "Passend advies voor zakelijke inkoop": "Tailored advice for business purchasing",
});

PHRASES.en = NL_TO_EN;

/** Look up a curated translation; case-insensitive fallback. */
export function lookupStaticPhrase(text: string, targetLang: string): string | null {
  if (!text?.trim()) return null;
  const lang = targetLang.split("-")[0].toLowerCase();

  const table = PHRASES[lang];
  if (!table) return null;

  const trimmed = text.trim();
  if (table[trimmed]) return table[trimmed];

  const lower = trimmed.toLowerCase();
  for (const [key, value] of Object.entries(table)) {
    if (key.toLowerCase() === lower) return value;
  }
  return null;
}
