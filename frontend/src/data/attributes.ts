export type AttributeType = "select" | "multi_select" | "boolean" | "range" | "color" | "dimension";

export type AttributeValue = {
  id: string;
  value: string;
  colorCode?: string;
};

export type Attribute = {
  id: string;
  name: string;
  slug: string;
  type: AttributeType;
  values: AttributeValue[];
  visibility?: "admin" | "filter" | "both";
};

export const attributes: Attribute[] = [
  {
    id: "a-1",
    name: "Color",
    slug: "color",
    type: "color",
    values: [
      { id: "v-1", value: "Black", colorCode: "#000000" },
      { id: "v-2", value: "White", colorCode: "#ffffff" },
      { id: "v-3", value: "Gold", colorCode: "#FFD700" },
      { id: "v-4", value: "Silver", colorCode: "#C0C0C0" },
      { id: "v-5", value: "Copper", colorCode: "#B87333" },
      { id: "v-6", value: "Natural", colorCode: "#E6C280" },
    ],
  },
  {
    id: "a-13",
    name: "Light color",
    slug: "light-color",
    type: "color",
    values: [
      { id: "v-61", value: "1800K (candlelight)", colorCode: "#ffa500" },
      { id: "v-62", value: "2700K (extra warm white)", colorCode: "#fffa9e" },
      { id: "v-63", value: "3000K (warm white)", colorCode: "#fffde6" },
      { id: "v-64", value: "4000K (white)", colorCode: "#f8f8ff" },
      { id: "v-65", value: "Adjustable from warm to cool white", colorCode: "linear-gradient(90deg, #ffa500 0%, #fffa9e 50%, #e0ffff 100%)" },
      { id: "v-66", value: "RGBW (all colors + white)", colorCode: "linear-gradient(90deg, red, orange, yellow, green, blue, purple)" },
    ],
  },
  {
    id: "a-2",
    name: "Material",
    slug: "material",
    type: "multi_select",
    values: [
      { id: "v-7", value: "Metal" },
      { id: "v-8", value: "Rattan" },
      { id: "v-9", value: "Glass" },
      { id: "v-10", value: "Fabric" },
      { id: "v-11", value: "Plastic" },
      { id: "v-12", value: "Wood" },
      { id: "v-13", value: "Concrete" },
    ],
  },
  {
    id: "a-3",
    name: "Style",
    slug: "style",
    type: "select",
    values: [
      { id: "v-14", value: "Modern" },
      { id: "v-15", value: "Industrial" },
      { id: "v-16", value: "Scandinavian" },
      { id: "v-17", value: "Classic" },
      { id: "v-18", value: "Vintage" },
      { id: "v-19", value: "Design" },
    ],
  },
  {
    id: "a-4",
    name: "Room",
    slug: "room",
    type: "multi_select",
    values: [
      { id: "v-20", value: "Living room" },
      { id: "v-21", value: "Bedroom" },
      { id: "v-22", value: "Bathroom" },
      { id: "v-23", value: "Kitchen" },
      { id: "v-24", value: "Outdoor" },
      { id: "v-25", value: "Office" },
    ],
  },
  {
    id: "a-5",
    name: "Bulb fitting",
    slug: "fitting",
    type: "select",
    values: [
      { id: "v-26", value: "E27" },
      { id: "v-27", value: "E14" },
      { id: "v-28", value: "GU10" },
      { id: "v-29", value: "G9" },
      { id: "v-30", value: "Integrated LED" },
    ],
  },
  {
    id: "a-6",
    name: "Dimmable",
    slug: "dimmable",
    type: "boolean",
    values: [
      { id: "v-31", value: "Yes" },
      { id: "v-32", value: "No" },
    ],
  },
  {
    id: "a-7",
    name: "IP Rating",
    slug: "ip-rating",
    type: "select",
    values: [
      { id: "v-33", value: "IP20" },
      { id: "v-34", value: "IP44" },
      { id: "v-35", value: "IP65" },
      { id: "v-36", value: "IP67" },
    ],
  },
  {
    id: "a-8",
    name: "Dimmer type",
    slug: "dimmer-type",
    type: "multi_select",
    values: [
      { id: "v-37", value: "Remote control" },
      { id: "v-38", value: "Light switch" },
      { id: "v-39", value: "App" },
      { id: "v-40", value: "Touch dimmer" },
      { id: "v-41", value: "3-step dimmable via switch" },
      { id: "v-42", value: "LED dimmer" },
    ],
  },
  {
    id: "a-9",
    name: "Length",
    slug: "length",
    type: "dimension",
    values: [
      { id: "v-43", value: "Under 10 cm" },
      { id: "v-44", value: "10 - 20 cm" },
      { id: "v-45", value: "20 - 40 cm" },
      { id: "v-46", value: "40 - 60 cm" },
      { id: "v-47", value: "60 - 80 cm" },
      { id: "v-48", value: "80 - 100 cm" },
    ],
  },
  {
    id: "a-10",
    name: "Height",
    slug: "height",
    type: "dimension",
    values: [
      { id: "v-49", value: "Under 10 cm" },
      { id: "v-50", value: "20 - 40 cm" },
      { id: "v-51", value: "40 - 60 cm" },
      { id: "v-52", value: "60 - 100 cm" },
      { id: "v-53", value: "100 - 150 cm" },
      { id: "v-54", value: "150 - 200 cm" },
    ],
  },
  {
    id: "a-11",
    name: "Width",
    slug: "width",
    type: "dimension",
    values: [
      { id: "v-55", value: "Under 20 cm" },
      { id: "v-56", value: "20 - 50 cm" },
      { id: "v-57", value: "50 - 100 cm" },
    ],
  },
  {
    id: "a-12",
    name: "Diameter",
    slug: "diameter",
    type: "dimension",
    values: [
      { id: "v-58", value: "Under 20 cm" },
      { id: "v-59", value: "20 - 50 cm" },
      { id: "v-60", value: "50 - 100 cm" },
    ],
  },
];
