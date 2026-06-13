import { PrismaClient } from "@prisma/client";
import * as bcrypt from "bcryptjs";
import { seedTemplates } from "../src/utils/seedTemplates";
import { seedExtraProduct } from "./seedProduct";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting database seeding...");

  // 1. Clean existing records in reverse order of foreign key dependencies
  console.log("🧹 Clearing old database records...");
  await prisma.blog.deleteMany();
  await prisma.megaMenu.deleteMany();
  await prisma.cmsPage.deleteMany();
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

  // Dummy @example.com customers removed — use real signups in production.
  const customers: any[] = [];

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
    bulbs: await prisma.category.create({
      data: { slug: "light-sources-parent", name: "Light Sources Parent", image: "/assets/cat-bulbs.jpg", group: "light-sources" }
    }),
  };

  // Create Subcategories referencing parent categories
  console.log("🏷️ Creating subcategories...");
  const subCategoriesData = [
    { slug: "pendant-lights", name: "Pendant Lights", image: "/assets/cat-pendant.jpg", group: "interior-lighting", parentId: parentCats.indoor.id },
    { slug: "wall-lights", name: "Wall Lights", image: "/assets/cat-wall.jpg", group: "interior-lighting", parentId: parentCats.indoor.id },
    { slug: "floor-lamps", name: "Floor Lamps", image: "/assets/cat-floor.jpg", group: "interior-lighting", parentId: parentCats.indoor.id },
    { slug: "table-lamps", name: "Table Lamps", image: "/assets/cat-table.jpg", group: "interior-lighting", parentId: parentCats.indoor.id },
    { slug: "spotlights", name: "Spotlights", image: "/assets/cat-ceiling.jpg", group: "interior-lighting", parentId: parentCats.indoor.id },
    { slug: "light-sources", name: "Light Sources", image: "/assets/cat-bulbs.jpg", group: "light-sources", parentId: parentCats.bulbs.id },
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
    "pendant-lights": [
      "Mira Rattan Pendant",
      "Nordic Dome Pendant",
      "Globe Glass Pendant",
      "Bamboo Bell Pendant",
      "Linear Crystal Chandelier",
      "Black Branch Chandelier"
    ],
    "wall-lights": [
      "Spot Adjustable Wall Light",
      "Brass Sconce Wall Lamp"
    ],
    "floor-lamps": [
      "Tripod Rattan Floor Lamp",
      "Arc Marble Base Floor Lamp"
    ],
    "table-lamps": [
      "Rattan Cage Table Lamp",
      "Ceramic Vase Table Lamp"
    ],
    "spotlights": [
      "Halo Plaster Ceiling Light",
      "Scallop Cloud Ceiling Lamp",
      "Round Flush Mount LED",
      "LED Panel 60x60 4000K",
      "Suspended Office Light"
    ],
    "light-sources": [
      "Smart Color RGB Bulb E27",
      "Smart White Tunable Bulb E14",
      "Edison Filament LED 6W",
      "Globe LED Warm 8W",
      "Pink Elephant Kids Shade",
      "Linen Drum Shade Natural"
    ],
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

      let imgShorthand = catSlug
        .replace("-lamps", "")
        .replace("-lights", "")
        .replace("-bulbs", "");
      if (imgShorthand === "spotlights") {
        imgShorthand = "ceiling";
      }
      if (imgShorthand === "light-sources") {
        imgShorthand = "bulbs";
      }

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

      // Series association
      const brandSeriesList = seriesData.filter((s) => s.brandName === brandName);
      const chosenSeries = brandSeriesList.length > 0 ? brandSeriesList[counter % brandSeriesList.length].name : null;

      const specs = [
        { key: "Maximum wattage", value: `${[7, 10, 15, 25][counter % 4]}W`, link: "" },
        { key: "Connection voltage", value: "220-240V", link: "" },
        { key: "Type of fitting", value: fittingVal, link: "" },
        { key: "Includes light", value: counter % 3 === 0 ? "Yes" : "No", link: "" },
        { key: "Dimmable", value: dimmableVal === "Yes" ? "Yes (not included)" : "No", link: "" },
        { key: "Length in cm", value: `${30 + (counter % 5) * 10}`, link: "" },
        { key: "Width in cm", value: `${30 + (counter % 5) * 10}`, link: "" },
        { key: "Height in cm", value: `${120 + (counter % 5) * 20}`, link: "" },
        { key: "Base/mounting plate width in cm", value: `${12 + (counter % 3) * 2}`, link: "" },
        { key: "Foot/mounting plate length", value: `${12 + (counter % 3) * 2}`, link: "" },
        { key: "Height of foot/mounting plate", value: "2.5", link: "" },
        { key: "Colour", value: colorVal, link: "" },
        { key: "Material", value: materialVal, link: "" },
        { key: "Style", value: styleVal, link: "" },
        { key: "Warranty", value: "2 years", link: "" },
        { key: "Article number", value: `Q10${750 + counter}`, link: "" },
        { key: "IP rating", value: ipRatingVal === "IP44" ? "IP44 (splashproof)" : "IP20 (dustproof)", link: "" },
        { key: "Installation Manual", value: "Download PDF", link: "" },
        { key: "Number of lights", value: `${(counter % 3) + 1}`, link: "" }
      ];

      if (chosenSeries) {
        specs.push({ key: "Series", value: chosenSeries, link: "" });
      }

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
        userId: null,
        customerName: namesList[i % namesList.length],
        customerEmail: `demo-order-${i}@seed.local`,
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

  // 11.5 Create Mock Blogs
  console.log("📝 Creating blogs...");
  await prisma.blog.createMany({
    data: [
      {
        title: "How to Choose the Perfect Living Room Lighting",
        slug: "how-to-choose-living-room-lighting",
        excerpt: "A comprehensive guide to layering light in your living space.",
        body: "<p>When designing your living room, lighting is often an afterthought. However, it is one of the most crucial elements in creating a warm and inviting atmosphere. Start with ambient lighting...</p>",
        cover: "/assets/cat-floor.jpg",
        author: "Interior Design Team",
        published: true,
      },
      {
        title: "5 Trends in Outdoor Lighting for 2026",
        slug: "5-trends-outdoor-lighting-2026",
        excerpt: "Discover what's new and exciting in outdoor illumination.",
        body: "<p>Outdoor lighting has evolved far beyond simple floodlights. Today, it's about creating outdoor living spaces. From solar-powered string lights to smart path lighting...</p>",
        cover: "/assets/cat-outdoor.jpg",
        author: "Lighting Expert",
        published: true,
      },
      {
        title: "Understanding LED Color Temperatures",
        slug: "understanding-led-color-temperatures",
        excerpt: "Warm white, cool white, daylight—what does it all mean?",
        body: "<p>Choosing the right LED color temperature can dramatically affect the mood of a room. Measured in Kelvin (K), color temperature dictates whether a light appears warm (yellowish) or cool (bluish)...</p>",
        cover: "/assets/cat-bulbs.jpg",
        author: "Tech Corner",
        published: true,
      }
    ]
  });

  // 12. Seed CMS dynamic config templates
  console.log("📺 Seeding CMS Dynamic configurations...");
  const wrapBlock = (shortcode: string, name: string) => `<div class="cms-block" style="background-color: #f4f4f5; padding: 16px; border: 1px solid #e4e4e7; border-radius: 8px; margin-bottom: 12px; position: relative; font-family: monospace; font-size: 14px; color: #52525b;"><span contenteditable="false" style="position: absolute; top: -1px; right: -1px; background-color: #71717a; color: white; padding: 4px 8px; font-size: 11px; font-family: sans-serif; font-weight: bold; border-bottom-left-radius: 8px; border-top-right-radius: 8px; user-select: none;">${name}</span>${shortcode}</div>`;
  const defaultHomepageBlocks = [
    wrapBlock('[hero-banner title="Spring Deals" subtitle="Up to 50% off" primary_button_text="Shop now" primary_button_link="/category/deals" background_image="/src/assets/hero-spring.jpg"][/hero-banner]', 'Hero Banner'),
    wrapBlock('[category-block title="Categories"][/category-block]', 'Category Block'),
    wrapBlock('[product-block title="Bestsellers" type="bestsellers"][/product-block]', 'Product Block'),
    wrapBlock('[features-block count="4" icon_1="truck-fast" title_1="Fast delivery" desc_1="Order before 22:00, delivered next day" icon_2="rotate-left" title_2="30-day returns" desc_2="Not happy? Send it back for free" icon_3="shield" title_3="2-year warranty" desc_3="Quality you can trust" icon_4="headset" title_4="Expert support" desc_4="7 days a week"][/features-block]', 'Features Block'),
    wrapBlock('[product-block title="Spring deals" type="deals"][/product-block]', 'Product Block'),
    wrapBlock('[brands-block title="Popular brands"][/brands-block]', 'Brands Block'),
    wrapBlock('[reviews-block title="What our customers say"][/reviews-block]', 'Reviews Block'),
    wrapBlock('[blogs-block title="Latest from the journal" description="Design inspiration, trends, and lighting advice."][/blogs-block]', 'Blogs Block')
  ].join('<p><br/></p>');

  await prisma.cmsConfig.create({
    data: {
      key: "homepage_data",
      value: {
        content: defaultHomepageBlocks,
        seoTitle: "Premium Lighting & Home Decor | YourStore",
        seoDesc: "Shop the best curated lighting collection for your home. Spring deals up to 50% off.",
        seoKeywords: "lighting, lamps, pendant lights, home decor",
        seoImage: null
      },
    },
  });

  // 12.5 Seed CMS Pages
  console.log("📄 Seeding CMS Pages...");
  await prisma.cmsPage.createMany({
    data: [
      { title: "About Us", slug: "about", body: '[hero-banner title="About Us" subtitle="Our story"][/hero-banner]', published: true },
      { title: "Shipping Info", slug: "shipping", body: "<p>Delivery details...</p>", published: true },
      { title: "Returns", slug: "returns", body: "<p>30-day returns...</p>", published: true },
      { title: "Contact", slug: "contact", body: "<p>Get in touch...</p>", published: false }
    ]
  });

  // 13. Seed Mega Menu structure
  console.log("🧭 Seeding Mega Menu configurations...");
  await prisma.megaMenu.createMany({
    data: [
      {
        menu: "Interior Lighting",
        slug: "interior-lighting",
        sections: [
          {
            title: "Categories",
            items: [
              { name: "All Lamps", slug: "all-lamps" },
              { name: "Pendant Lights", slug: "pendant-lights" },
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
              { name: "Living Room", slug: "living-room" },
              { name: "Bedroom", slug: "bedroom" },
              { name: "Kitchen", slug: "kitchen" },
              { name: "Bathroom", slug: "bathroom" },
              { name: "Dining Room", slug: "dining-room" },
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
              { name: "Scandinavian", slug: "scandinavian" },
              { name: "Minimal", slug: "minimal" },
            ]
          }
        ] as any,
      },
      {
        menu: "Pendant Lights",
        slug: "pendant-lights",
        sections: [
          {
            title: "By Room",
            items: [
              { name: "Dining Room", slug: "dining-room" },
              { name: "Kitchen Island", slug: "kitchen" },
              { name: "Living Room", slug: "living-room" },
              { name: "Bedroom", slug: "bedroom" },
              { name: "Hallway", slug: "hallway" }
            ]
          },
          {
            title: "By Style",
            items: [
              { name: "Modern", slug: "modern" },
              { name: "Minimal", slug: "minimal" },
              { name: "Industrial", slug: "industrial" },
              { name: "Classic", slug: "classic" }
            ]
          },
          {
            title: "Popular",
            items: [
              { name: "Glass Pendants", slug: "glass-pendants" },
              { name: "Cluster Pendants", slug: "cluster-pendants" },
              { name: "Black Pendants", slug: "black-pendants" },
              { name: "Brass Pendants", slug: "brass-pendants" },
              { name: "Dimmable Pendants", slug: "dimmable-pendants" }
            ]
          }
        ] as any,
      },
      {
        menu: "Wall Lights",
        slug: "wall-lights",
        sections: [
          {
            title: "By Use",
            items: [
              { name: "Bedside Wall Lights", slug: "bedside-wall-lights" },
              { name: "Hallway Wall Lights", slug: "hallway-wall-lights" },
              { name: "Bathroom Wall Lights", slug: "bathroom-wall-lights" },
              { name: "Reading Wall Lights", slug: "reading-wall-lights" },
              { name: "Decorative Wall Lights", slug: "decorative-wall-lights" }
            ]
          },
          {
            title: "By Style",
            items: [
              { name: "Modern", slug: "modern" },
              { name: "Classic", slug: "classic" },
              { name: "Vintage", slug: "vintage" },
              { name: "Minimal", slug: "minimal" }
            ]
          },
          {
            title: "Popular",
            items: [
              { name: "Up & Down Lights", slug: "up-down-lights" },
              { name: "Sconces", slug: "sconces" },
              { name: "Swing Arm Lights", slug: "swing-arm-lights" },
              { name: "LED Wall Lights", slug: "led-wall-lights" },
              { name: "Gold Wall Lights", slug: "gold-wall-lights" }
            ]
          }
        ] as any,
      },
      {
        menu: "Floor Lamps",
        slug: "floor-lamps",
        sections: [
          {
            title: "By Room",
            items: [
              { name: "Living Room", slug: "living-room" },
              { name: "Bedroom", slug: "bedroom" },
              { name: "Reading Corner", slug: "reading-corner" },
              { name: "Office", slug: "office" }
            ]
          },
          {
            title: "By Type",
            items: [
              { name: "Arc Floor Lamps", slug: "arc-floor-lamps" },
              { name: "Tripod Lamps", slug: "tripod-lamps" },
              { name: "LED Floor Lamps", slug: "led-floor-lamps" },
              { name: "Uplighters", slug: "uplighters" }
            ]
          },
          {
            title: "Popular",
            items: [
              { name: "Black Floor Lamps", slug: "black-floor-lamps" },
              { name: "Gold Floor Lamps", slug: "gold-floor-lamps" },
              { name: "Minimal Floor Lamps", slug: "minimal-floor-lamps" },
              { name: "Dimmable Floor Lamps", slug: "dimmable-floor-lamps" }
            ]
          }
        ] as any,
      },
      {
        menu: "Table Lamps",
        slug: "table-lamps",
        sections: [
          {
            title: "By Room",
            items: [
              { name: "Bedroom", slug: "bedroom" },
              { name: "Living Room", slug: "living-room" },
              { name: "Office", slug: "office" },
              { name: "Hallway", slug: "hallway" }
            ]
          },
          {
            title: "By Type",
            items: [
              { name: "Bedside Lamps", slug: "bedside-lamps" },
              { name: "Desk Lamps", slug: "desk-lamps" },
              { name: "Touch Lamps", slug: "touch-lamps" },
              { name: "Ceramic Lamps", slug: "ceramic-lamps" }
            ]
          },
          {
            title: "Popular",
            items: [
              { name: "Modern Table Lamps", slug: "modern-table-lamps" },
              { name: "Fabric Shade Lamps", slug: "fabric-shade-lamps" },
              { name: "Glass Lamps", slug: "glass-lamps" },
              { name: "Small Table Lamps", slug: "small-table-lamps" }
            ]
          }
        ] as any,
      },
      {
        menu: "Spotlights",
        slug: "spotlights",
        sections: [
          {
            title: "By Type",
            items: [
              { name: "Ceiling Spotlights", slug: "ceiling-spotlights" },
              { name: "Surface Spotlights", slug: "surface-spotlights" },
              { name: "Adjustable Spotlights", slug: "adjustable-spotlights" },
              { name: "Rail Spotlights", slug: "rail-spotlights" }
            ]
          },
          {
            title: "By Room",
            items: [
              { name: "Kitchen", slug: "kitchen" },
              { name: "Hallway", slug: "hallway" },
              { name: "Living Room", slug: "living-room" },
              { name: "Bathroom", slug: "bathroom" }
            ]
          },
          {
            title: "Popular",
            items: [
              { name: "Black Spotlights", slug: "black-spotlights" },
              { name: "White Spotlights", slug: "white-spotlights" },
              { name: "LED Spotlights", slug: "led-spotlights" },
              { name: "2-Light Spots", slug: "2-light-spots" },
              { name: "4-Light Bars", slug: "4-light-bars" }
            ]
          }
        ] as any,
      },
      {
        menu: "Light Sources",
        slug: "light-sources",
        sections: [
          {
            title: "By Base",
            items: [
              { name: "E27", slug: "e27" },
              { name: "E14", slug: "e14" },
              { name: "GU10", slug: "gu10" },
              { name: "G9", slug: "g9" }
            ]
          },
          {
            title: "By Type",
            items: [
              { name: "LED Bulbs", slug: "led-bulbs" },
              { name: "Filament Bulbs", slug: "filament-bulbs" },
              { name: "Dimmable Bulbs", slug: "dimmable-bulbs" },
              { name: "Warm White Bulbs", slug: "warm-white-bulbs" }
            ]
          },
          {
            title: "Smart",
            items: [
              { name: "Smart Bulbs", slug: "smart-bulbs" },
              { name: "Tunable White", slug: "tunable-white" },
              { name: "Color Bulbs", slug: "color-bulbs" },
              { name: "Energy Saving Bulbs", slug: "energy-saving-bulbs" }
            ]
          }
        ] as any,
      },
      {
        menu: "Deals",
        slug: "deals",
        sections: [
          {
            title: "Shop Deals",
            items: [
              { name: "Pendant Deals", slug: "pendant-deals" },
              { name: "Wall Light Deals", slug: "wall-light-deals" },
              { name: "Floor Lamp Deals", slug: "floor-lamp-deals" },
              { name: "Table Lamp Deals", slug: "table-lamp-deals" },
              { name: "Bulb Deals", slug: "bulb-deals" }
            ]
          },
          {
            title: "Discount Type",
            items: [
              { name: "Under €25", slug: "under-25" },
              { name: "Under €50", slug: "under-50" },
              { name: "Clearance", slug: "clearance" },
              { name: "Bundle Offers", slug: "bundle-offers" }
            ]
          },
          {
            title: "Featured",
            items: [
              { name: "Bestsellers on Sale", slug: "bestsellers-sale" },
              { name: "Limited Time Offers", slug: "limited-time-offers" },
              { name: "New Deals", slug: "new-deals" }
            ]
          }
        ] as any,
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
          title: "Interior lighting",
          content: '<h2><strong>Discover Our Premium Selection of Interior lighting</strong></h2><p>Upgrade your space with modern styles, custom designs, and premium quality crafted for your lifestyle.</p><br/>[product-block title="Popular Products" type="pendant-lights"][/product-block]<br/>[category-block title="Browse Interior Categories"][/category-block]',
          seoTitle: "Interior lighting | Buy Premium Lighting Online",
          seoDescription: "Shop our selection of premium Interior lighting. Free shipping on orders over $50, fast delivery, and modern designs.",
          seoKeywords: "lighting, interior lighting, modern decor, lights",
          seoImage: ""
        },
        "outdoor-lighting": {
          title: "Outdoor lighting",
          content: '<h2><strong>Upgrade Your Outdoors</strong></h2><p>Discover durable, stylish outdoor lighting for gardens, patios, and entrances.</p><br/>[product-block title="Popular Outdoor Lamps" type="spotlights"][/product-block]<br/>[category-block title="Outdoor Categories"][/category-block]',
          seoTitle: "Outdoor lighting | Buy Premium Lighting Online",
          seoDescription: "Shop our selection of premium Outdoor lighting.",
          seoKeywords: "outdoor lighting, garden lights",
          seoImage: ""
        },
        "light-sources": {
          title: "Light sources",
          content: '<h2><strong>Find the Right Bulb</strong></h2><p>LED, smart, and classic bulbs for every room and fixture.</p><br/>[product-block title="Popular Bulbs" type="light-sources"][/product-block]<br/>[category-block title="Popular Bulb Categories"][/category-block]',
          seoTitle: "Light sources | Buy Premium Lighting Online",
          seoDescription: "Shop our selection of premium Light sources.",
          seoKeywords: "light bulbs, led, smart bulbs",
          seoImage: ""
        }
      }
    }
  });

  // 12. CMS Configuration
  console.log("Creating CMS configs...");
  
  const defaultReliefContent = `[text-hero title="Relief" subtitle="Buying lighting? Choose a category"][/text-hero]
<p>We are spending more and more time at home. Many people also still work from home, so you want your home to feel comfortable. A pleasant living environment inspires, energizes, and provides peace! Therefore, pay more attention to lighting. Make the interior even cozier by bringing new lamps into your home. Not just a large lamp above the dining table and one above the seating area, but also a desk lamp on the cabinet, a floor lamp next to the sofa, and a few candles on the coffee table.</p><br/>
[menu-category menu_slug="interior-lighting"][/menu-category]
<p>With interior lighting, the possibilities are endless. There are various styles and categories. It is important to choose the right lighting because it creates atmosphere in your home.</p><br/>
[menu-category menu_slug="outdoor-lighting"][/menu-category]
<p>Illuminate your garden, patio, or driveway with our high-quality outdoor lighting options designed to withstand all weather conditions.</p><br/>
[menu-category menu_slug="light-sources"][/menu-category]
<p>Find the perfect bulb with the right fitting, temperature, and brightness for your home lights.</p>`;

  await prisma.cmsConfig.upsert({
    where: { key: "relief_page_data" },
    update: {},
    create: {
      key: "relief_page_data",
      value: {
        content: defaultReliefContent
      }
    }
  });

  console.log("📧 Seeding email templates...");
  await seedTemplates();

  console.log("📦 Seeding extra product...");
  await seedExtraProduct();

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
