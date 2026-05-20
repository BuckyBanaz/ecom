import { PrismaClient } from "@prisma/client";
import * as bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting database seeding...");

  // 1. Clean existing records in reverse order of foreign key dependencies
  console.log("🧹 Clearing old database records...");
  await prisma.megaMenu.deleteMany();
  await prisma.cmsConfig.deleteMany();
  await prisma.wishlist.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.review.deleteMany();
  await prisma.variantAttributeValue.deleteMany();
  await prisma.productVariant.deleteMany();
  await prisma.productAttributeValue.deleteMany();
  await prisma.attributeValue.deleteMany();
  await prisma.attribute.deleteMany();
  await prisma.product.deleteMany();
  await prisma.category.deleteMany();
  await prisma.series.deleteMany();
  await prisma.brand.deleteMany();
  await prisma.group.deleteMany();
  await prisma.user.deleteMany();

  // 2. Create Users (Demo Admins and Demo Customers)
  console.log("👥 Creating user accounts...");
  const passwordHash = await bcrypt.hash("admin123", 10);

  await prisma.user.create({
    data: {
      name: "Super Admin",
      email: "super@lamp.com",
      passwordHash,
      role: "superadmin",
      avatar: "https://api.dicebear.com/7.x/adventurer/svg?seed=super",
    },
  });

  await prisma.user.create({
    data: {
      name: "Admin User",
      email: "admin@lamp.com",
      passwordHash,
      role: "admin",
      avatar: "https://api.dicebear.com/7.x/adventurer/svg?seed=admin",
    },
  });

  await prisma.user.create({
    data: {
      name: "Moderator User",
      email: "mod@lamp.com",
      passwordHash,
      role: "moderator",
      avatar: "https://api.dicebear.com/7.x/adventurer/svg?seed=mod",
    },
  });

  const customerNames = ["Sophie V.", "Mark D.", "Anna J.", "Jan K.", "Lisa M.", "Tom B."];
  const customers: any[] = [];

  for (let i = 0; i < customerNames.length; i++) {
    const name = customerNames[i];
    const email = `${name.split(" ")[0].toLowerCase()}@example.com`;
    const customerHash = await bcrypt.hash("customer123", 10);

    const u = await prisma.user.create({
      data: {
        id: `user-${i}`,
        name,
        email,
        passwordHash: customerHash,
        role: "customer",
        avatar: `https://api.dicebear.com/7.x/initials/svg?seed=${name}`,
      },
    });
    customers.push(u);
  }

  // 3. Create Groups
  console.log("📂 Creating groups...");
  const groupsData = [
    { id: "interior-lighting", name: "Indoor lighting" },
    { id: "outdoor-lighting", name: "Outdoor lighting" },
    { id: "light-sources", name: "Light bulbs" },
    { id: "commercial-lighting", name: "Business lighting" },
    { id: "smart-home", name: "Smart home" },
    { id: "accessories", name: "Accessories" },
  ];
  for (const group of groupsData) {
    await prisma.group.create({ data: group });
  }

  // 4. Create Brands
  console.log("🏢 Creating brands...");
  const brandsData = [
    { name: "Lumio", logo: "/assets/brand-lumio.png" },
    { name: "Brilliant", logo: "/assets/brand-brilliant.png" },
    { name: "Calex", logo: "/assets/brand-calex.png" },
    { name: "Philips", logo: "/assets/brand-philips.png" },
    { name: "Eglo", logo: "/assets/brand-eglo.png" },
    { name: "Steinhauer", logo: "/assets/brand-steinhauer.png" },
  ];
  const brandsMap: Record<string, any> = {};
  for (const brand of brandsData) {
    const b = await prisma.brand.create({
      data: brand
    });
    brandsMap[b.name] = b;
  }

  // 4.5. Create Series
  console.log("📺 Creating series collections...");
  const seriesData = [
    { name: "Hue White & Color", brandName: "Philips", logo: "", slug: "hue-white-color" },
    { name: "Hue Filament", brandName: "Philips", logo: "", slug: "hue-filament" },
    { name: "Townshend", brandName: "Eglo", logo: "", slug: "townshend" },
    { name: "Connect Smart", brandName: "Eglo", logo: "", slug: "connect-smart" },
    { name: "Retro Filament", brandName: "Calex", logo: "", slug: "retro-filament" },
    { name: "Ligno Collection", brandName: "Lumio", logo: "", slug: "ligno-collection" },
  ];
  for (const ser of seriesData) {
    const brandObj = brandsMap[ser.brandName];
    if (brandObj) {
      await prisma.series.create({
        data: {
          name: ser.name,
          brandId: brandObj.id,
          logo: ser.logo,
          slug: ser.slug,
        }
      });
    }
  }

  // 5. Create Parent Categories
  console.log("🏷️ Creating parent categories...");
  const parentCats = {
    indoor: await prisma.category.create({
      data: { slug: "indoor-lighting", name: "Indoor Lighting", image: "/assets/cat-pendant.jpg", group: "interior-lighting" }
    }),
    outdoor: await prisma.category.create({
      data: { slug: "outdoor-lighting", name: "Outdoor Lighting", image: "/assets/cat-outdoor.jpg", group: "outdoor-lighting" }
    }),
    bulbs: await prisma.category.create({
      data: { slug: "light-bulbs", name: "Light Bulbs", image: "/assets/cat-bulbs.jpg", group: "light-sources" }
    }),
    smart: await prisma.category.create({
      data: { slug: "smart-home", name: "Smart Home", image: "/assets/cat-smart.jpg", group: "light-sources" }
    }),
    accessories: await prisma.category.create({
      data: { slug: "accessories", name: "Accessories", image: "/assets/cat-shades.jpg", group: "interior-lighting" }
    }),
    business: await prisma.category.create({
      data: { slug: "business-lighting", name: "Business Lighting", image: "/assets/cat-office.jpg", group: "commercial-lighting" }
    }),
  };

  // Create Subcategories referencing parent categories
  console.log("🏷️ Creating subcategories...");
  const subCategoriesData = [
    { slug: "pendant-lamps", name: "Pendant lamps", image: "/assets/cat-pendant.jpg", group: "interior-lighting", parentId: parentCats.indoor.id },
    { slug: "string-lights", name: "String lights", image: "/assets/cat-string.jpg", group: "outdoor-lighting", parentId: parentCats.outdoor.id },
    { slug: "ceiling-lamps", name: "Ceiling lamps", image: "/assets/cat-ceiling.jpg", group: "interior-lighting", parentId: parentCats.indoor.id },
    { slug: "wall-lamps", name: "Wall lamps", image: "/assets/cat-wall.jpg", group: "interior-lighting", parentId: parentCats.indoor.id },
    { slug: "outdoor-lamps", name: "Outdoor lamps", image: "/assets/cat-outdoor.jpg", group: "outdoor-lighting", parentId: parentCats.outdoor.id },
    { slug: "floor-lamps", name: "Floor lamps", image: "/assets/cat-floor.jpg", group: "interior-lighting", parentId: parentCats.indoor.id },
    { slug: "smart-bulbs", name: "Smart bulbs", image: "/assets/cat-smart.jpg", group: "light-sources", parentId: parentCats.smart.id },
    { slug: "lampshades", name: "Lampshades", image: "/assets/cat-shades.jpg", group: "interior-lighting", parentId: parentCats.accessories.id },
    { slug: "table-lamps", name: "Table lamps", image: "/assets/cat-table.jpg", group: "interior-lighting", parentId: parentCats.indoor.id },
    { slug: "chandeliers", name: "Chandeliers", image: "/assets/cat-chandelier.jpg", group: "interior-lighting", parentId: parentCats.indoor.id },
    { slug: "led-bulbs", name: "LED bulbs", image: "/assets/cat-bulbs.jpg", group: "light-sources", parentId: parentCats.bulbs.id },
    { slug: "office-lighting", name: "Office lighting", image: "/assets/cat-office.jpg", group: "commercial-lighting", parentId: parentCats.business.id },
  ];

  const categoriesMap: Record<string, any> = {};
  for (const cat of subCategoriesData) {
    const c = await prisma.category.create({ data: cat });
    categoriesMap[c.slug] = c;
  }

  // 6. Create Attributes
  console.log("⚙️ Creating Attributes...");
  const attributesData = [
    { name: "Color", slug: "color", type: "select" },
    { name: "Material", slug: "material", type: "multi_select" },
    { name: "Style", slug: "style", type: "select" },
    { name: "Room", slug: "room", type: "multi_select" },
    { name: "Bulb fitting", slug: "fitting", type: "select" },
    { name: "Dimmable", slug: "dimmable", type: "boolean" },
    { name: "IP Rating", slug: "ip-rating", type: "select" },
    { name: "Length", slug: "length", type: "range" },
    { name: "Width", slug: "width", type: "range" },
    { name: "Diameter", slug: "diameter", type: "range" },
  ];

  const attributesMap: Record<string, any> = {};
  for (const attr of attributesData) {
    const a = await prisma.attribute.create({ data: attr });
    attributesMap[a.slug] = a;
  }

  // 7. Create Attribute Values
  console.log("⚙️ Creating Attribute Values...");
  const rawValues: Record<string, Array<{ value: string; colorCode?: string }>> = {
    color: [
      { value: "Black", colorCode: "#000000" },
      { value: "White", colorCode: "#ffffff" },
      { value: "Gold", colorCode: "#FFD700" },
      { value: "Silver", colorCode: "#C0C0C0" },
      { value: "Copper", colorCode: "#B87333" },
      { value: "Natural", colorCode: "#E6C280" },
    ],
    material: [
      { value: "Metal" },
      { value: "Rattan" },
      { value: "Glass" },
      { value: "Fabric" },
      { value: "Plastic" },
      { value: "Wood" },
      { value: "Concrete" }
    ],
    style: [
      { value: "Modern" },
      { value: "Industrial" },
      { value: "Scandinavian" },
      { value: "Classic" },
      { value: "Vintage" },
      { value: "Design" }
    ],
    room: [
      { value: "Living room" },
      { value: "Bedroom" },
      { value: "Bathroom" },
      { value: "Kitchen" },
      { value: "Outdoor" },
      { value: "Office" }
    ],
    fitting: [
      { value: "E27" },
      { value: "E14" },
      { value: "GU10" },
      { value: "G9" },
      { value: "Integrated LED" }
    ],
    dimmable: [
      { value: "Yes" },
      { value: "No" }
    ],
    "ip-rating": [
      { value: "IP20" },
      { value: "IP44" },
      { value: "IP65" },
      { value: "IP67" }
    ],
    length: [
      { value: "20-40 cm" },
      { value: "40-60 cm" },
      { value: "60-80 cm" },
      { value: "80-100 cm" }
    ],
    width: [
      { value: "10-20 cm" },
      { value: "20-30 cm" },
      { value: "30-40 cm" },
      { value: "40-50 cm" }
    ],
    diameter: [
      { value: "20-40 cm" },
      { value: "40-60 cm" },
      { value: "60-80 cm" }
    ],
  };

  const valuesMap: Record<string, Record<string, any>> = {}; // slug -> value string -> object
  for (const [attrSlug, list] of Object.entries(rawValues)) {
    const attr = attributesMap[attrSlug];
    valuesMap[attrSlug] = {};
    for (const item of list) {
      const v = await prisma.attributeValue.create({
        data: {
          attributeId: attr.id,
          value: item.value,
          colorCode: item.colorCode,
        }
      });
      valuesMap[attrSlug][item.value.toLowerCase()] = v;
    }
  }


  // 9. Create Products
  console.log("📦 Creating EAV Products...");
  const brandList = ["Lumio", "Brilliant", "Calex", "Philips", "Eglo", "Steinhauer"];
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

  const createdProducts: any[] = [];
  let counter = 0;

  for (const [catSlug, list] of Object.entries(names)) {
    const category = categoriesMap[catSlug];
    if (!category) continue;

    for (const n of list) {
      counter++;
      const price = +(19.95 + ((counter * 7) % 240)).toFixed(2);
      const onSale = counter % 3 === 0;
      const oldPrice = onSale ? +(price * 1.4).toFixed(2) : null;

      const imgShorthand = catSlug
        .replace("-lamps", "")
        .replace("-lights", "")
        .replace("-bulbs", "");

      const brandName = brandList[counter % brandList.length];
      const brand = brandsMap[brandName];

      const colorVal = ["Black", "White", "Gold", "Natural"][counter % 4];
      const materialVal = ["Metal", "Rattan", "Glass", "Fabric"][counter % 4];
      const styleVal = ["Modern", "Industrial", "Scandinavian", "Classic"][counter % 4];
      const fittingVal = ["E27", "E14", "GU10", "Integrated LED"][counter % 4];
      const dimmableVal = counter % 2 === 0 ? "Yes" : "No";
      const ipRatingVal = catSlug.includes("outdoor") ? "IP44" : "IP20";
      const roomVal = catSlug.includes("outdoor") ? "Outdoor" : "Living room";
      const diameterVal = ["20-40 cm", "40-60 cm"][counter % 2];
      const lengthVal = "40-60 cm";

      // Specs Backup
      const specs = {
        Material: materialVal,
        "Bulb fitting": fittingVal,
        Dimmable: dimmableVal,
        "IP rating": ipRatingVal,
        Warranty: "2 years",
      };

      const product = await prisma.product.create({
        data: {
          id: `p-${counter}`,
          slug: `${n.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}-${counter}`,
          name: n,
          brandId: brand ? brand.id : null,
          categoryId: category.id,
          price,
          oldPrice,
          rating: +(4 + ((counter % 10) / 10)).toFixed(1),
          reviewCount: 12 + counter * 7,
                  image: `/assets/cat-${imgShorthand}.jpg`,
          inStock: counter % 11 !== 0,
          isNewArrival: counter % 4 === 0,
          isBestSelling: counter % 3 === 0,
          description: "A beautifully crafted lamp that combines functional lighting with timeless design. Perfect for setting the mood in any room.",
          specs,
          seoTitle: `${n} - Buy Premium E-Commerce Lighting`,
          seoDescription: `Get the premium ${n} at discounted prices. High quality design, fast shipping.`,
          seoKeywords: `lamp, lighting, ${n.toLowerCase()}`,
        },
      });

      createdProducts.push(product);

      // Now create EAV maps!
      const attrsToMap = [
        { slug: "color", val: colorVal },
        { slug: "material", val: materialVal },
        { slug: "style", val: styleVal },
        { slug: "fitting", val: fittingVal },
        { slug: "dimmable", val: dimmableVal },
        { slug: "ip-rating", val: ipRatingVal },
        { slug: "room", val: roomVal },
        { slug: "diameter", val: diameterVal },
        { slug: "length", val: lengthVal },
      ];

      for (const mapItem of attrsToMap) {
        const attribute = attributesMap[mapItem.slug];
        const valObj = valuesMap[mapItem.slug]?.[mapItem.val.toLowerCase()];
        if (attribute && valObj) {
          await prisma.productAttributeValue.create({
            data: {
              productId: product.id,
              attributeId: attribute.id,
              attributeValueId: valObj.id,
            }
          });
        }
      }

      // 10. Create Product Variants
      if (counter % 3 === 0) {
        const variantColors = ["Black", "White", "Gold"];
        for (const [idx, vColor] of variantColors.entries()) {
          const sku = `${n.substring(0, 3).toUpperCase()}-${counter}-${vColor.substring(0, 3).toUpperCase()}`;
          const variant = await prisma.productVariant.create({
            data: {
              productId: product.id,
              sku,
              stock: 10 + (idx * 5),
              price: price + (idx * 5.00),
            }
          });

          // Link Variant to Color Value
          const colAttrVal = valuesMap["color"]?.[vColor.toLowerCase()];
          if (colAttrVal) {
            await prisma.variantAttributeValue.create({
              data: {
                variantId: variant.id,
                attributeValueId: colAttrVal.id
              }
            });
          }

          // Link Variant to Material Value (same as parent)
          const matAttrVal = valuesMap["material"]?.[materialVal.toLowerCase()];
          if (matAttrVal) {
            await prisma.variantAttributeValue.create({
              data: {
                variantId: variant.id,
                attributeValueId: matAttrVal.id
              }
            });
          }
        }
      }

      // Create 3 reviews per product
      await prisma.review.create({
        data: {
          productId: product.id,
          name: "Sophie V.",
          rating: 5,
          title: "Beautiful lamp, fast delivery",
          text: "Ordered late in the evening and it arrived the next morning. The lamp is even nicer in person.",
        },
      });

      await prisma.review.create({
        data: {
          productId: product.id,
          name: "Mark D.",
          rating: 5,
          title: "Great service",
          text: "Helpful customer service when I had a question about the bulb fitting. Recommended!",
        },
      });

      await prisma.review.create({
        data: {
          productId: product.id,
          name: "Anna J.",
          rating: 4,
          title: "Looks lovely",
          text: "Looks great in the living room. One star less because assembly took a bit of time.",
        },
      });
    }
  }

  // 11. Create Mock Orders matching orders.ts
  console.log("🛒 Creating orders and items...");
  for (let i = 0; i < 15; i++) {
    const p1 = createdProducts[i % createdProducts.length];
    const p2 = createdProducts[(i + 3) % createdProducts.length];
    const qty1 = 1 + (i % 3);
    const qty2 = i % 2 === 0 ? 1 : 0;

    const items = [
      {
        productName: p1.name,
        productImage: p1.image,
        quantity: qty1,
        price: p1.price,
        variant: "Default",
        productId: p1.id,
      },
      ...(qty2
        ? [
            {
              productName: p2.name,
              productImage: p2.image,
              quantity: 1,
              price: p2.price,
              variant: "Default",
              productId: p2.id,
            },
          ]
        : []),
    ];

    const subtotal = items.reduce((s, it) => s + it.price * it.quantity, 0);
    const shipping = subtotal > 75 ? 0 : 5.95;
    const total = subtotal + shipping;

    const statuses = ["delivered", "shipped", "processing", "pending", "cancelled"];
    const namesList = ["Sophie V.", "Mark D.", "Anna J.", "Jan K.", "Lisa M.", "Tom B."];
    const date = new Date(2025, 3, 1 + i);

    const order = await prisma.order.create({
      data: {
        id: `ord-${i}`,
        orderNumber: `LG-${10000 + i}`,
        userId: `user-${i % 3}`,
        customerName: namesList[i % namesList.length],
        customerEmail: `${namesList[i % namesList.length].split(" ")[0].toLowerCase()}@example.com`,
        subtotal: +subtotal.toFixed(2),
        shipping,
        total: +total.toFixed(2),
        status: statuses[i % statuses.length],
        paymentMethod: ["iDEAL", "Credit Card", "PayPal"][i % 3],
        shippingAddress: `${100 + i} Main St, Amsterdam, NL`,
        createdAt: date,
        updatedAt: new Date(date.getTime() + 86400000),
      },
    });

    for (const item of items) {
      await prisma.orderItem.create({
        data: {
          orderId: order.id,
          productId: item.productId,
          productName: item.productName,
          productImage: item.productImage,
          quantity: item.quantity,
          price: item.price,
          variant: item.variant,
        },
      });
    }
  }

  // 12. Seed CMS dynamic config templates
  console.log("📺 Seeding CMS Dynamic configurations...");
  await prisma.cmsConfig.create({
    data: {
      key: "homepage_slider",
      value: {
        slides: [
          {
            id: 1,
            title: "Light Up Your Living Room",
            subtitle: "Spring Clearance Deals - Up to 40% Off on Pendant Lights",
            buttonText: "Shop Pendant Lights",
            link: "/category/pendant-lamps",
            image: "/assets/cat-pendant.jpg",
          },
          {
            id: 2,
            title: "Bring Light Outdoors",
            subtitle: "Stunning String Lights & Wall Lanterns for Balcony & Garden",
            buttonText: "Shop Outdoor",
            link: "/category/string-lights",
            image: "/assets/cat-string.jpg",
          },
        ],
      },
    },
  });

  // 13. Seed Mega Menu structure
  console.log("🧭 Seeding Mega Menu configurations...");
  await prisma.megaMenu.createMany({
    data: [
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
            ]
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
            ]
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
            ]
          }
        ],
      },
      {
        menu: "Outdoor lighting",
        slug: "outdoor-lighting",
        sections: [
          {
            title: "Categories",
            items: [
              { name: "Wall lanterns", slug: "wall-lanterns" },
              { name: "Post lights", slug: "post-lights" },
              { name: "String lights", slug: "string-lights" },
              { name: "Security lights", slug: "security-lights" },
            ]
          }
        ],
      },
      {
        menu: "Light sources",
        slug: "light-sources",
        sections: [
          {
            title: "Bulb Types",
            items: [
              { name: "LED bulbs", slug: "led-bulbs" },
              { name: "Smart bulbs", slug: "smart-bulbs" },
              { name: "Halogen", slug: "halogen" },
            ]
          }
        ],
      }
    ]
  });

  // 14. Seed Landing Pages data
  console.log("🧭 Seeding CMS Page blocks and SEO metadata...");
  await prisma.cmsConfig.create({
    data: {
      key: "landing_pages_data",
      value: {
        "interior-lighting": {
          pageTitle: "Interior lighting",
          pageBlocks: [
            {
              id: "1",
              type: "banner",
              heading: "Interior lighting",
              content: "<h2><strong>Discover Our Premium Selection of Interior lighting</strong></h2><p>Upgrade your space with modern styles, custom designs, and premium quality crafted for your lifestyle.</p>"
            },
            {
              id: "2",
              type: "product_grid",
              category: "pendant-lamps",
              description: ""
            }
          ],
          seoTitle: "Interior lighting | Buy Premium Lighting Online",
          seoDescription: "Shop our selection of premium Interior lighting. Free shipping on orders over $50, fast delivery, and modern designs.",
          seoKeywords: "lighting, interior lighting, modern decor, lights",
          seoImage: ""
        },
        "outdoor-lighting": {
          pageTitle: "Outdoor lighting",
          pageBlocks: [],
          seoTitle: "Outdoor lighting | Buy Premium Lighting Online",
          seoDescription: "Shop our selection of premium Outdoor lighting.",
          seoKeywords: "outdoor lighting, garden lights",
          seoImage: ""
        },
        "light-sources": {
          pageTitle: "Light sources",
          pageBlocks: [],
          seoTitle: "Light sources | Buy Premium Lighting Online",
          seoDescription: "Shop our selection of premium Light sources.",
          seoKeywords: "light bulbs, led, smart bulbs",
          seoImage: ""
        }
      }
    }
  });

  console.log("✨ Seeding completed successfully!");
}

main()
  .catch((e) => {
    console.error("❌ Error during database seeding:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
