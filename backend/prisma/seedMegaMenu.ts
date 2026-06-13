import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const newMegaMenus = [
  {
    menu: "Interior Lighting",
    slug: "interior-lighting",
    sections: [
      {
        title: "Categories",
        items: [
          { name: "All Lamps", slug: "all-lamps" },
          { name: "Pendant Lights", slug: "pendant-light" },
          { name: "Wall Lights", slug: "wall-lights" },
          { name: "Floor Lamps", slug: "floor-lamps" },
          { name: "Table Lamps", slug: "table-lamps" },
          { name: "Spotlights", slug: "spotlights" },
          { name: "Light Sources", slug: "light-sources" },
        ]
      },
      {
        title: "Rooms",
        items: [
          { name: "Living Room", slug: "all-lamps?room=Living Room" },
          { name: "Bedroom", slug: "all-lamps?room=Bedroom" },
          { name: "Kitchen", slug: "all-lamps?room=Kitchen" },
          { name: "Bathroom", slug: "all-lamps?room=Bathroom" },
          { name: "Dining Room", slug: "all-lamps?room=Dining Room" },
          { name: "Hallway", slug: "all-lamps?room=Hallway" },
        ]
      },
      {
        title: "Styles",
        items: [
          { name: "Modern", slug: "all-lamps?style=Modern" },
          { name: "Industrial", slug: "all-lamps?style=Industrial" },
          { name: "Classic", slug: "all-lamps?style=Classic" },
          { name: "Vintage", slug: "all-lamps?style=Vintage" },
          { name: "Scandinavian", slug: "all-lamps?style=Scandinavian" },
          { name: "Minimal", slug: "all-lamps?style=Minimal" },
        ]
      }
    ]
  },
  {
    menu: "Pendant Lights",
    slug: "pendant-light",
    sections: [
      {
        title: "By Room",
        items: [
          { name: "Dining Room", slug: "pendant-light?room=Dining Room" },
          { name: "Kitchen Island", slug: "pendant-light?room=Kitchen" },
          { name: "Living Room", slug: "pendant-light?room=Living Room" },
          { name: "Bedroom", slug: "pendant-light?room=Bedroom" },
          { name: "Hallway", slug: "pendant-light?room=Hallway" }
        ]
      },
      {
        title: "By Style",
        items: [
          { name: "Modern", slug: "pendant-light?style=Modern" },
          { name: "Minimal", slug: "pendant-light?style=Minimal" },
          { name: "Industrial", slug: "pendant-light?style=Industrial" },
          { name: "Classic", slug: "pendant-light?style=Classic" }
        ]
      },
      {
        title: "Popular",
        items: [
          { name: "Glass Pendants", slug: "pendant-light?material=Glass" },
          { name: "Cluster Pendants", slug: "pendant-light?style=Cluster" },
          { name: "Black Pendants", slug: "pendant-light?color=Black" },
          { name: "Brass Pendants", slug: "pendant-light?color=Brass" },
          { name: "Dimmable Pendants", slug: "pendant-light?dimmable=Yes" }
        ]
      }
    ]
  },
  {
    menu: "Wall Lights",
    slug: "wall-lights",
    sections: [
      {
        title: "By Use",
        items: [
          { name: "Bedside Wall Lights", slug: "wall-lights?room=Bedroom" },
          { name: "Hallway Wall Lights", slug: "wall-lights?room=Hallway" },
          { name: "Bathroom Wall Lights", slug: "wall-lights?room=Bathroom" },
          { name: "Reading Wall Lights", slug: "wall-lights?room=Reading Corner" },
          { name: "Decorative Wall Lights", slug: "wall-lights?style=Decorative" }
        ]
      },
      {
        title: "By Style",
        items: [
          { name: "Modern", slug: "wall-lights?style=Modern" },
          { name: "Classic", slug: "wall-lights?style=Classic" },
          { name: "Vintage", slug: "wall-lights?style=Vintage" },
          { name: "Minimal", slug: "wall-lights?style=Minimal" }
        ]
      },
      {
        title: "Popular",
        items: [
          { name: "Up & Down Lights", slug: "wall-lights?style=Up & Down" },
          { name: "Sconces", slug: "wall-lights?style=Sconce" },
          { name: "Swing Arm Lights", slug: "wall-lights?style=Swing Arm" },
          { name: "LED Wall Lights", slug: "wall-lights?fitting=LED" },
          { name: "Gold Wall Lights", slug: "wall-lights?color=Gold" }
        ]
      }
    ]
  },
  {
    menu: "Floor Lamps",
    slug: "floor-lamps",
    sections: [
      {
        title: "By Room",
        items: [
          { name: "Living Room", slug: "floor-lamps?room=Living Room" },
          { name: "Bedroom", slug: "floor-lamps?room=Bedroom" },
          { name: "Reading Corner", slug: "floor-lamps?room=Reading Corner" },
          { name: "Office", slug: "floor-lamps?room=Office" }
        ]
      },
      {
        title: "By Type",
        items: [
          { name: "Arc Floor Lamps", slug: "floor-lamps?style=Arc" },
          { name: "Tripod Lamps", slug: "floor-lamps?style=Tripod" },
          { name: "LED Floor Lamps", slug: "floor-lamps?fitting=LED" },
          { name: "Uplighters", slug: "floor-lamps?style=Uplighter" }
        ]
      },
      {
        title: "Popular",
        items: [
          { name: "Black Floor Lamps", slug: "floor-lamps?color=Black" },
          { name: "Gold Floor Lamps", slug: "floor-lamps?color=Gold" },
          { name: "Minimal Floor Lamps", slug: "floor-lamps?style=Minimal" },
          { name: "Dimmable Floor Lamps", slug: "floor-lamps?dimmable=Yes" }
        ]
      }
    ]
  },
  {
    menu: "Table Lamps",
    slug: "table-lamps",
    sections: [
      {
        title: "By Room",
        items: [
          { name: "Bedroom", slug: "table-lamps?room=Bedroom" },
          { name: "Living Room", slug: "table-lamps?room=Living Room" },
          { name: "Office", slug: "table-lamps?room=Office" },
          { name: "Hallway", slug: "table-lamps?room=Hallway" }
        ]
      },
      {
        title: "By Type",
        items: [
          { name: "Bedside Lamps", slug: "table-lamps?room=Bedroom" },
          { name: "Desk Lamps", slug: "table-lamps?room=Office" },
          { name: "Touch Lamps", slug: "table-lamps?style=Touch" },
          { name: "Ceramic Lamps", slug: "table-lamps?material=Ceramic" }
        ]
      },
      {
        title: "Popular",
        items: [
          { name: "Modern Table Lamps", slug: "table-lamps?style=Modern" },
          { name: "Fabric Shade Lamps", slug: "table-lamps?material=Fabric" },
          { name: "Glass Lamps", slug: "table-lamps?material=Glass" },
          { name: "Small Table Lamps", slug: "table-lamps?style=Small" }
        ]
      }
    ]
  },
  {
    menu: "Spotlights",
    slug: "spotlights",
    sections: [
      {
        title: "By Type",
        items: [
          { name: "Ceiling Spotlights", slug: "spotlights?style=Ceiling Spot" },
          { name: "Surface Spotlights", slug: "spotlights?style=Surface Spot" },
          { name: "Adjustable Spotlights", slug: "spotlights?style=Adjustable Spot" },
          { name: "Rail Spotlights", slug: "spotlights?style=Rail Spot" }
        ]
      },
      {
        title: "By Room",
        items: [
          { name: "Kitchen", slug: "spotlights?room=Kitchen" },
          { name: "Hallway", slug: "spotlights?room=Hallway" },
          { name: "Living Room", slug: "spotlights?room=Living Room" },
          { name: "Bathroom", slug: "spotlights?room=Bathroom" }
        ]
      },
      {
        title: "Popular",
        items: [
          { name: "Black Spotlights", slug: "spotlights?color=Black" },
          { name: "White Spotlights", slug: "spotlights?color=White" },
          { name: "LED Spotlights", slug: "spotlights?fitting=LED" },
          { name: "2-Light Spots", slug: "spotlights?style=2-Light" },
          { name: "4-Light Bars", slug: "spotlights?style=4-Light" }
        ]
      }
    ]
  },
  {
    menu: "Light Sources",
    slug: "light-sources",
    sections: [
      {
        title: "By Base",
        items: [
          { name: "E27", slug: "light-sources?fitting=E27" },
          { name: "E14", slug: "light-sources?fitting=E14" },
          { name: "GU10", slug: "light-sources?fitting=GU10" },
          { name: "G9", slug: "light-sources?fitting=G9" }
        ]
      },
      {
        title: "By Type",
        items: [
          { name: "LED Bulbs", slug: "light-sources?fitting=LED" },
          { name: "Filament Bulbs", slug: "light-sources?style=Filament" },
          { name: "Dimmable Bulbs", slug: "light-sources?dimmable=Yes" },
          { name: "Warm White Bulbs", slug: "light-sources?style=Warm White" }
        ]
      },
      {
        title: "Smart",
        items: [
          { name: "Smart Bulbs", slug: "light-sources?style=Smart" },
          { name: "Tunable White", slug: "light-sources?style=Tunable White" },
          { name: "Color Bulbs", slug: "light-sources?style=Color" },
          { name: "Energy Saving Bulbs", slug: "light-sources?style=Energy Saving" }
        ]
      }
    ]
  },
  {
    menu: "Deals",
    slug: "deals",
    sections: [
      {
        title: "Shop Deals",
        items: [
          { name: "Pendant Deals", slug: "deals?category=pendant-light" },
          { name: "Wall Light Deals", slug: "deals?category=wall-lights" },
          { name: "Floor Lamp Deals", slug: "deals?category=floor-lamps" },
          { name: "Table Lamp Deals", slug: "deals?category=table-lamps" },
          { name: "Bulb Deals", slug: "deals?category=light-sources" }
        ]
      },
      {
        title: "Discount Type",
        items: [
          { name: "Under €25", slug: "deals?price-max=25" },
          { name: "Under €50", slug: "deals?price-max=50" },
          { name: "Clearance", slug: "deals?clearance=Clearance" },
          { name: "Bundle Offers", slug: "deals?bundle=Bundle" }
        ]
      },
      {
        title: "Featured",
        items: [
          { name: "Bestsellers on Sale", slug: "deals?bestseller=Yes" },
          { name: "Limited Time Offers", slug: "deals?limited=Yes" },
          { name: "New Deals", slug: "deals?new=Yes" }
        ]
      }
    ]
  }
];

async function main() {
  console.log("🌱 Starting Seeding of new MegaMenu structure...");
  
  // Clean only megaMenu table
  await prisma.megaMenu.deleteMany({});
  console.log("🧹 Cleared existing mega menu configurations.");

  for (const m of newMegaMenus) {
    await prisma.megaMenu.create({
      data: {
        menu: m.menu,
        slug: m.slug,
        sections: m.sections as any
      }
    });
  }

  console.log("✨ Seeding of new MegaMenu structure completed successfully!");
}

main()
  .catch((e) => {
    console.error("❌ Error during mega menu seeding:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
