export interface MegaMenuItem {
  name: string;
  slug: string;
}

export interface MegaMenuSection {
  title: string;
  items: MegaMenuItem[];
}

export interface MegaMenu {
  menu: string;
  slug: string;
  sections: MegaMenuSection[];
}

export const megaMenuData: MegaMenu[] = [
  {
    menu: "Interior lighting",
    slug: "interior-lighting",
    sections: [
      {
        title: "Categories",
        items: [
          { name: "Pendant lights", slug: "pendant-lights" },
          { name: "Ceiling lights", slug: "ceiling-lights" },
          { name: "Wall lights", slug: "wall-lights" },
          { name: "Table lamps", slug: "table-lamps" },
          { name: "Floor lamps", slug: "floor-lamps" },
          { name: "Chandeliers", slug: "chandeliers" },
        ],
      },
      {
        title: "Rooms",
        items: [
          { name: "Living room", slug: "living-room" },
          { name: "Bedroom", slug: "bedroom" },
          { name: "Kitchen", slug: "kitchen" },
          { name: "Bathroom", slug: "bathroom" },
          { name: "Dining room", slug: "dining-room" },
          { name: "Hallway", slug: "hallway" },
        ],
      },
      {
        title: "Styles",
        items: [
          { name: "Modern", slug: "modern" },
          { name: "Industrial", slug: "industrial" },
          { name: "Classic", slug: "classic" },
          { name: "Vintage", slug: "vintage" },
          { name: "Design", slug: "design" },
          { name: "Rustic", slug: "rustic" },
        ],
      },
      {
        title: "Featured",
        items: [
          { name: "New arrivals", slug: "new-arrivals" },
          { name: "Best sellers", slug: "best-sellers" },
          { name: "Sale", slug: "sale" },
          { name: "Smart lighting", slug: "smart-lighting" },
          { name: "LED strips", slug: "led-strips" },
        ],
      },
    ],
  },
  {
    menu: "Outdoor lighting",
    slug: "outdoor-lighting",
    sections: [
      {
        title: "Categories",
        items: [
          { name: "Outdoor wall lights", slug: "outdoor-wall-lights" },
          { name: "Standing lights", slug: "standing-lights" },
          { name: "Solar lights", slug: "solar-lights" },
          { name: "Sensor lights", slug: "sensor-lights" },
          { name: "Spotlights", slug: "spotlights" },
        ],
      },
      {
        title: "Styles",
        items: [
          { name: "Modern", slug: "modern-outdoor" },
          { name: "Classic", slug: "classic-outdoor" },
          { name: "Industrial", slug: "industrial-outdoor" },
        ],
      },
      {
        title: "Features",
        items: [
          { name: "Motion sensor", slug: "motion-sensor" },
          { name: "Dimmable", slug: "dimmable" },
          { name: "Smart outdoor", slug: "smart-outdoor" },
        ],
      },
      {
        title: "Featured",
        items: [
          { name: "New in", slug: "new-in" },
          { name: "Offers", slug: "offers" },
        ],
      },
    ],
  },
  {
    menu: "Light sources",
    slug: "light-sources",
    sections: [
      {
        title: "Fittings",
        items: [
          { name: "E27 (Large)", slug: "e27" },
          { name: "E14 (Small)", slug: "e14" },
          { name: "GU10", slug: "gu10" },
          { name: "G9", slug: "g9" },
        ],
      },
      {
        title: "Types",
        items: [
          { name: "LED Bulbs", slug: "led-bulbs" },
          { name: "Smart Bulbs", slug: "smart-bulbs" },
          { name: "Filament Bulbs", slug: "filament-bulbs" },
        ],
      },
    ],
  },
];
