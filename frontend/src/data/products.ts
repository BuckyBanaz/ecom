import { categories } from "./categories";

export type Product = {
  id: string;
  slug: string;
  name: string;
  brand: string;
  category: string; // category slug
  price: number;
  oldPrice?: number;
  rating: number;
  reviewCount: number;
  image: string;
  color: string;
  material: string;
  style: string;
  fitting: string;
  inStock: boolean;
  description: string;
  specs: Record<string, string>;
  attributes?: Record<string, string[]>; // EAV dynamic attributes list
};

const img = (slug: string) => categories.find((c) => c.slug === slug)!.image;

const base = (
  i: number,
  name: string,
  brand: string,
  catSlug: string,
  price: number,
  oldPrice?: number,
  extras: Partial<Product> = {},
): Product => {
  const colorVal = ["Black", "White", "Gold", "Silver", "Copper", "Natural"][i % 6];
  const materialVal = ["Metal", "Rattan", "Glass", "Fabric", "Plastic", "Wood", "Concrete"][i % 7];
  const styleVal = ["Modern", "Industrial", "Scandinavian", "Classic", "Vintage", "Design"][i % 6];
  const fittingVal = ["E27", "E14", "GU10", "G9", "Integrated LED"][i % 5];
  const dimmerVal = ["Remote control", "Light switch", "App", "Touch dimmer", "3-step dimmable via switch", "LED dimmer"][i % 6];
  const roomVal = ["Living room", "Bedroom", "Bathroom", "Kitchen", "Outdoor", "Office"][i % 6];
  const dimmableVal = i % 2 === 0 ? "Yes" : "No";
  const ipVal = catSlug.includes("outdoor") ? "IP44" : "IP20";

  return {
    id: `p-${i}`,
    slug: `${name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}-${i}`,
    name,
    brand,
    category: catSlug,
    price,
    oldPrice,
    rating: 4 + ((i % 10) / 10),
    reviewCount: 12 + i * 7,
    image: img(catSlug),
    color: colorVal,
    material: materialVal,
    style: styleVal,
    fitting: fittingVal,
    inStock: i % 11 !== 0,
    description:
      "A beautifully crafted lamp that combines functional lighting with timeless design. Perfect for setting the mood in any room.",
    specs: {
      "Installation Manual": "Download PDF",
      "Maximum wattage": `${[7, 10, 15, 25][i % 4]}W`,
      "Connection voltage": "220-240V",
      "Number of lights": `${(i % 3) + 1}`,
      "Type of fitting": fittingVal,
      "Includes light": i % 3 === 0 ? "Yes" : "No",
      "Base/mounting plate width in cm": `${12 + (i % 3) * 2}`,
      "Foot/mounting plate length": `${12 + (i % 3) * 2}`,
      "Length in cm": `${30 + (i % 5) * 10}`,
      "Height of foot/mounting plate": "2.5",
      "Height in cm": `${120 + (i % 5) * 20}`,
      "Width in cm": `${30 + (i % 5) * 10}`,
      Dimmable: dimmableVal === "Yes" ? "Yes (not included)" : "No",
      Warranty: "2 years",
      "IP rating": ipVal === "IP44" ? "IP44 (splashproof)" : "IP20 (dustproof)",
      Colour: colorVal,
      Material: materialVal,
      Style: styleVal,
      "Article number": `Q10${750 + i}`,
    },
    attributes: {
      color: [colorVal],
      "light-color": [["1800K (candlelight)", "2700K (extra warm white)", "3000K (warm white)", "4000K (white)", "Adjustable from warm to cool white", "RGBW (all colors + white)"][i % 6]],
      material: [materialVal],
      style: [styleVal],
      room: [roomVal],
      fitting: [fittingVal],
      dimmable: [dimmableVal],
      "ip-rating": [ipVal],
      "dimmer-type": [dimmerVal],
      length: [["Under 10 cm", "10 - 20 cm", "20 - 40 cm", "40 - 60 cm", "60 - 80 cm", "80 - 100 cm"][i % 6]],
      height: [["Under 10 cm", "20 - 40 cm", "40 - 60 cm", "60 - 100 cm", "100 - 150 cm", "150 - 200 cm"][i % 6]],
      width: [["Under 20 cm", "20 - 50 cm", "50 - 100 cm"][i % 3]],
      diameter: [["Under 20 cm", "20 - 50 cm", "50 - 100 cm"][i % 3]],
    },
    ...extras,
  };
};

const names: Record<string, string[]> = {
  "pendant-lamps": ["Mira Rattan Pendant", "Nordic Dome Pendant", "Globe Glass Pendant", "Bamboo Bell Pendant"],
  "string-lights": ["Café Outdoor String Lights 10m", "Festoon LED Lights 20m"],
  "ceiling-lamps": ["Halo Plaster Ceiling Light", "Scallop Cloud Ceiling Lamp", "Round Flush Mount LED"],
  "wall-lamps": ["Spot Adjustable Wall Light", "Brass Sconce Wall Lamp"],
  "outdoor-lamps": ["Bollard Garden Path Light", "Solar Stake Light Set", "Wall Outdoor Lantern"],
  "floor-lamps": ["Tripod Rattan Floor Lamp", "Arc Marble Base Floor Lamp"],
  "smart-bulbs": ["Smart Color RGB Bulb E27", "Smart White Tunable Bulb E14"],
  lampshades: ["Pink Elephant Kids Shade", "Linen Drum Shade Natural"],
  "table-lamps": ["Rattan Cage Table Lamp", "Ceramic Vase Table Lamp"],
  chandeliers: ["Linear Crystal Chandelier", "Black Branch Chandelier"],
  "led-bulbs": ["Edison Filament LED 6W", "Globe LED Warm 8W"],
  "office-lighting": ["LED Panel 60x60 4000K", "Suspended Office Light"],
};

const brands = ["Lumio", "Brilliant", "Calex", "Philips", "Eglo", "Steinhauer"];

let counter = 0;
export const products: Product[] = Object.entries(names).flatMap(([slug, list]) =>
  list.map((n) => {
    counter++;
    const price = 19.95 + ((counter * 7) % 240);
    const onSale = counter % 3 === 0;
    return base(counter, n, brands[counter % brands.length], slug, +price.toFixed(2), onSale ? +(price * 1.4).toFixed(2) : undefined);
  }),
);

export const featuredProducts = products.filter((_, i) => i % 2 === 0).slice(0, 8);
export const dealProducts = products.filter((p) => p.oldPrice).slice(0, 8);

export const findProduct = (slug: string) => products.find((p) => p.slug === slug);
export const productsByCategory = (slug: string) => products.filter((p) => p.category === slug);

export const brandsList = ["Philips", "Calex", "Eglo", "Steinhauer", "Brilliant", "Lumio", "Trio", "Nordlux"];

export const reviews = [
  { name: "Sophie V.", rating: 5, title: "Beautiful lamp, fast delivery", text: "Ordered late in the evening and it arrived the next morning. The lamp is even nicer in person." },
  { name: "Mark D.", rating: 5, title: "Great service", text: "Helpful customer service when I had a question about the bulb fitting. Recommended!" },
  { name: "Anna J.", rating: 4, title: "Looks lovely", text: "Looks great in the living room. One star less because assembly took a bit of time." },
];