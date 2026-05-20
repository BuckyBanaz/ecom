import pendant from "@/assets/cat-pendant.jpg";
import string from "@/assets/cat-string.jpg";
import ceiling from "@/assets/cat-ceiling.jpg";
import wall from "@/assets/cat-wall.jpg";
import outdoor from "@/assets/cat-outdoor.jpg";
import floor from "@/assets/cat-floor.jpg";
import bulbs from "@/assets/cat-bulbs.jpg";
import shades from "@/assets/cat-shades.jpg";
import table from "@/assets/cat-table.jpg";
import chandelier from "@/assets/cat-chandelier.jpg";
import office from "@/assets/cat-office.jpg";
import smart from "@/assets/cat-smart.jpg";

export type Category = {
  id?: string;
  slug: string;
  name: string;
  image: string;
  group: string;
};

export const categories: Category[] = [
  { slug: "pendant-lamps", name: "Pendant lamps", image: pendant, group: "interior-lighting" },
  { slug: "string-lights", name: "String lights", image: string, group: "outdoor-lighting" },
  { slug: "ceiling-lamps", name: "Ceiling lamps", image: ceiling, group: "interior-lighting" },
  { slug: "wall-lamps", name: "Wall lamps", image: wall, group: "interior-lighting" },
  { slug: "outdoor-lamps", name: "Outdoor lamps", image: outdoor, group: "outdoor-lighting" },
  { slug: "floor-lamps", name: "Floor lamps", image: floor, group: "interior-lighting" },
  { slug: "smart-bulbs", name: "Smart bulbs", image: smart, group: "light-sources" },
  { slug: "lampshades", name: "Lampshades", image: shades, group: "interior-lighting" },
  { slug: "table-lamps", name: "Table lamps", image: table, group: "interior-lighting" },
  { slug: "chandeliers", name: "Chandeliers", image: chandelier, group: "interior-lighting" },
  { slug: "led-bulbs", name: "LED bulbs", image: bulbs, group: "light-sources" },
  { slug: "office-lighting", name: "Office lighting", image: office, group: "commercial-lighting" },
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