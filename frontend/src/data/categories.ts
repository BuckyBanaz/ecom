export type Category = {
  id?: string;
  slug: string;
  name: string;
  image: string;
  group: string;
};

/** Fallback categories — no bundled images; API/CMS provides real thumbnails. */
export const categories: Category[] = [
  { slug: "pendant-lamps", name: "Pendant lamps", image: "", group: "interior-lighting" },
  { slug: "string-lights", name: "String lights", image: "", group: "outdoor-lighting" },
  { slug: "ceiling-lamps", name: "Ceiling lamps", image: "", group: "interior-lighting" },
  { slug: "wall-lamps", name: "Wall lamps", image: "", group: "interior-lighting" },
  { slug: "outdoor-lamps", name: "Outdoor lamps", image: "", group: "outdoor-lighting" },
  { slug: "floor-lamps", name: "Floor lamps", image: "", group: "interior-lighting" },
  { slug: "smart-bulbs", name: "Smart bulbs", image: "", group: "light-sources" },
  { slug: "lampshades", name: "Lampshades", image: "", group: "interior-lighting" },
  { slug: "table-lamps", name: "Table lamps", image: "", group: "interior-lighting" },
  { slug: "chandeliers", name: "Chandeliers", image: "", group: "interior-lighting" },
  { slug: "led-bulbs", name: "LED bulbs", image: "", group: "light-sources" },
  { slug: "office-lighting", name: "Office lighting", image: "", group: "commercial-lighting" },
];

export const navGroups = [
  {
    label: "Indoor lighting",
    items: ["Pendant lamps", "Ceiling lamps", "Wall lamps", "Floor lamps", "Table lamps", "Chandeliers"],
  },
  {
    label: "Outdoor lighting",
    items: ["Outdoor lamps", "String lights", "Garden spots", "Wall outdoor", "Solar lights"],
  },
  {
    label: "Light bulbs",
    items: ["LED bulbs", "Filament bulbs", "Smart bulbs", "Halogen", "Spots"],
  },
  {
    label: "Business lighting",
    items: ["Office lighting", "Industrial", "Hospitality", "Retail", "Tracks & systems"],
  },
  {
    label: "By room",
    items: ["Living room", "Kitchen", "Bedroom", "Bathroom", "Kids room", "Office"],
  },
  {
    label: "Accessories",
    items: ["Lampshades", "Cables & cords", "Sockets", "Switches", "Dimmers"],
  },
  { label: "Smart home", items: ["Smart bulbs", "Hubs", "Sensors", "Plugs"] },
  { label: "Deals", items: ["Spring deals", "Clearance", "Outlet"] },
];
