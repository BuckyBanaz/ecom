import { Request, Response, NextFunction } from "express";
import { prisma } from "../config/db";
import { sanitizeProductForClient, sanitizeProductsForClient } from "../utils/productSerializer";
import { InventoryService } from "../services/inventoryService";

const CATEGORY_ALIASES: Record<string, string> = {
  // Indoor lighting / Parent / All
  "binnenverlichting": "interior-lighting",
  "binnen-verlichting": "interior-lighting",
  "indoor-lighting": "interior-lighting",
  "indoor": "interior-lighting",
  "interior-lighting": "interior-lighting",
  "interior": "interior-lighting",
  "all-lamps": "interior-lighting",
  "alle-lampen": "interior-lighting",
  "all-products": "interior-lighting",
  "alle-producten": "interior-lighting",
  "all-lights": "interior-lighting",
  "all": "interior-lighting",

  // Pendant lights / Hanglampen
  "hanglampen": "pendant-light",
  "hanglamp": "pendant-light",
  "pendant": "pendant-light",
  "pendants": "pendant-light",
  "pendant-lamps": "pendant-light",
  "pendant-lights": "pendant-light",
  "pendant-light": "pendant-light",

  // Table lamps / Tafellampen
  "tafellampen": "table-lamps",
  "tafellamp": "table-lamps",
  "table-lamps": "table-lamps",
  "table-lamp": "table-lamps",
  "table-lights": "table-lamps",

  // Ceiling lights / Plafondlampen
  "plafondlampen": "plafondlamp",
  "plafondlamp": "plafondlamp",
  "ceiling-lamps": "plafondlamp",
  "ceiling-lights": "plafondlamp",
  "ceiling-light": "plafondlamp",

  // Wall lights / Wandlampen
  "wandlampen": "wall-lights",
  "wandlamp": "wall-lights",
  "wall-lamps": "wall-lights",
  "wall-lights": "wall-lights",

  // Floor lamps / Vloerlampen
  "vloerlampen": "floor-lamps",
  "vloerlamp": "floor-lamps",
  "floor-lamps": "floor-lamps",
  "floor-lights": "floor-lamps",

  // Spots / Spotlights
  "spots": "spotlights",
  "spot": "spotlights",
  "spotlights": "spotlights",
  "opbouwspots": "spotlights",
  "opbouwspot": "spotlights",

  // Light sources / Lichtbronnen
  "lichtbronnen": "light-sources",
  "lichtbron": "light-sources",
  "light-sources": "light-sources",
  "light-source": "light-sources",
  "smart-bulbs": "light-sources",
  "led-bulbs": "light-sources",
  "bulbs": "light-sources",

  // Outdoor / Buitenverlichting
  "buitenverlichting": "outdoor-lighting",
  "outdoor-lighting": "outdoor-lighting",
  "outdoor-lamps": "outdoor-lighting",
  "outdoor": "outdoor-lighting",

  // Commercial / Kantoorverlichting
  "kantoorverlichting": "office-lighting",
  "office-lighting": "office-lighting",
  "commercial-lighting": "office-lighting",

  // Chandeliers / Kroonluchters
  "kroonluchters": "chandeliers",
  "kroonluchter": "chandeliers",
  "chandeliers": "chandeliers",
  "chandelier": "chandeliers",
};

// Helper to extract filters from query parameters
const parseFilters = (query: any) => {
  const {
    category,
    brand,
    minPrice,
    maxPrice,
    search,
    sort = "relevance",
    page = "1",
    limit = "20",
    isNewArrival,
    isBestSelling,
    facets: facetsParam,
    ...attributeParams
  } = query;

  const filters: Record<string, string[]> = {};
  for (const [key, val] of Object.entries(attributeParams)) {
    if (val && typeof val === "string") {
      filters[key] = val.split(",");
    } else if (Array.isArray(val)) {
      filters[key] = val as string[];
    }
  }

  return {
    categorySlug: category as string,
    brands: brand ? (brand as string).split(",") : [],
    minPrice: minPrice ? parseFloat(minPrice as string) : undefined,
    maxPrice: maxPrice ? parseFloat(maxPrice as string) : undefined,
    search: search as string,
    sort: sort as string,
    page: parseInt(page as string, 10),
    limit: parseInt(limit as string, 10),
    isNewArrival: isNewArrival === "true",
    isBestSelling: isBestSelling === "true",
    includeFacets: facetsParam === "true",
    attributeFilters: filters,
  };
};

export const getProducts = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const {
      categorySlug,
      brands,
      minPrice,
      maxPrice,
      search,
      sort,
      page,
      limit,
      isNewArrival,
      isBestSelling,
      includeFacets,
      attributeFilters,
    } = parseFilters(req.query);

    const whereConditions: any = { AND: [] };

    // New Arrival & Best Selling filters
    if (isNewArrival) {
      whereConditions.AND.push({ isNewArrival: true });
    }
    if (isBestSelling) {
      whereConditions.AND.push({ isBestSelling: true });
    }

    // Search query
    if (search) {
      whereConditions.AND.push({
        OR: [
          { name: { contains: search, mode: "insensitive" } },
          { description: { contains: search, mode: "insensitive" } },
        ],
      });
    }

    // Category filter (includes subcategories recursively, aliases, and master indoor group)
    if (categorySlug && categorySlug !== "deals") {
      const cleanSlug = (categorySlug as string).trim().toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-+|-+$/g, "");
      const aliasedSlug = CATEGORY_ALIASES[cleanSlug] || cleanSlug;

      if (
        aliasedSlug === "interior-lighting" ||
        cleanSlug === "binnenverlichting" ||
        cleanSlug === "indoor-lighting" ||
        cleanSlug === "all-lamps" ||
        cleanSlug === "alle-producten" ||
        cleanSlug === "all-products"
      ) {
        // Master Indoor lighting / Binnenverlichting: match all indoor categories & subcategories
        const indoorCats = await prisma.category.findMany({
          where: {
            OR: [
              { group: { in: ["indoor", "interior-lighting", "binnenverlichting"] } },
              {
                slug: {
                  in: [
                    "pendant-lights", "table-lamps", "ceiling-lights", "wall-lights",
                    "floor-lamps", "spotlights", "chandeliers", "interior-lighting",
                    "indoor-lighting", "binnenverlichting", "pendant-lamps", "table-lamp",
                    "ceiling-lamps", "wall-lamps", "floor-lamps", "spots", "hanglampen",
                    "tafellampen", "plafondlampen", "wandlampen", "vloerlampen"
                  ],
                },
              },
              {
                parent: {
                  slug: {
                    in: ["indoor-lighting", "interior-lighting", "binnenverlichting"],
                  },
                },
              },
            ],
          },
          select: { id: true },
        });

        const indoorIds = indoorCats.map((c) => c.id);
        if (indoorIds.length > 0) {
          whereConditions.AND.push({
            categoryId: { in: indoorIds },
          });
        }
      } else {
        const category = await prisma.category.findFirst({
          where: {
            OR: [
              { slug: { equals: aliasedSlug, mode: "insensitive" } },
              { slug: { equals: cleanSlug, mode: "insensitive" } },
              { slug: { equals: categorySlug, mode: "insensitive" } },
              { name: { equals: categorySlug.replace(/-/g, " "), mode: "insensitive" } },
              { name: { equals: cleanSlug.replace(/-/g, " "), mode: "insensitive" } },
            ],
          },
          include: { children: true },
        });

        if (category) {
          const catIds = new Set<string>([category.id]);
          let currentParentIds = [category.id, ...category.children.map((c) => c.id)];
          category.children.forEach((c) => catIds.add(c.id));

          while (currentParentIds.length > 0) {
            const nextChildren = await prisma.category.findMany({
              where: { parentId: { in: currentParentIds } },
              select: { id: true },
            });
            const unvisited = nextChildren.map((c) => c.id).filter((id) => !catIds.has(id));
            if (unvisited.length === 0) break;
            unvisited.forEach((id) => catIds.add(id));
            currentParentIds = unvisited;
          }

          whereConditions.AND.push({
            categoryId: { in: Array.from(catIds) },
          });
        } else {
          // Check if it's a known group in DB
          const groupCats = await prisma.category.findMany({
            where: {
              group: { equals: aliasedSlug, mode: "insensitive" },
            },
            select: { id: true },
          });
          if (groupCats.length > 0) {
            whereConditions.AND.push({
              categoryId: { in: groupCats.map((c) => c.id) },
            });
          }
        }
      }
    } else if (categorySlug === "deals") {
      whereConditions.AND.push({
        oldPrice: { not: null },
      });
    }

    // Brand filter
    if (brands && brands.length > 0) {
      whereConditions.AND.push({
        brand: {
          name: { in: brands, mode: "insensitive" },
        },
      });
    }

    // Price filter
    if (minPrice !== undefined || maxPrice !== undefined) {
      whereConditions.AND.push({
        price: {
          gte: minPrice ?? 0,
          lte: maxPrice ?? 999999,
        },
      });
    }

    // EAV Attribute Filters (AND logic between attributes, OR logic within options of the same attribute)
    for (const [attrSlug, values] of Object.entries(attributeFilters)) {
      if (values && values.length > 0) {
        whereConditions.AND.push({
          productAttributeValues: {
            some: {
              attribute: { slug: attrSlug },
              attributeValue: {
                value: { in: values, mode: "insensitive" },
              },
            },
          },
        });
      }
    }

    // Clean up empty AND
    if (whereConditions.AND.length === 0) {
      delete whereConditions.AND;
    }

    // Sorting
    let orderBy: any = { createdAt: "desc" };
    if (sort === "price-asc") {
      orderBy = { price: "asc" };
    } else if (sort === "price-desc") {
      orderBy = { price: "desc" };
    } else if (sort === "rating") {
      orderBy = { rating: "desc" };
    }

    // Get count and products
    const totalItems = await prisma.product.count({ where: whereConditions });
    const skip = (page - 1) * limit;

    const listInclude = includeFacets
      ? {
          brand: true,
          category: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
          productAttributeValues: {
            include: {
              attribute: true,
              attributeValue: true,
            },
          },
          variants: {
            include: {
              variantAttributeValues: {
                include: {
                  attributeValue: true,
                },
              },
            },
          },
        }
      : {
          brand: true,
          category: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
          productAttributeValues: {
            include: {
              attribute: true,
              attributeValue: true,
            },
          },
        };

    const products = await prisma.product.findMany({
      where: whereConditions,
      orderBy,
      skip,
      take: limit,
      include: listInclude,
    });

    const response: Record<string, unknown> = {
      success: true,
      products: sanitizeProductsForClient(products),
      pagination: {
        totalItems,
        page,
        limit,
        totalPages: Math.ceil(totalItems / limit),
      },
    };

    if (includeFacets) {
      const scopeConditions = { ...whereConditions };

      const matchedProducts = await prisma.product.findMany({
        where: scopeConditions,
        select: { id: true, brandId: true },
      });
      const matchedProductIds = matchedProducts.map((p) => p.id);

      const attrFacetsRaw = await prisma.productAttributeValue.groupBy({
        by: ["attributeValueId", "attributeId"],
        where: {
          productId: { in: matchedProductIds },
        },
        _count: {
          productId: true,
        },
      });

      const valueIds = attrFacetsRaw.map((f) => f.attributeValueId);
      const attrValues = await prisma.attributeValue.findMany({
        where: { id: { in: valueIds } },
        include: { attribute: true },
      });

      const facets: Record<string, Array<{ value: string; colorCode?: string; count: number }>> = {};
      for (const val of attrValues) {
        const facetGroup = val.attribute.slug;
        if (!facets[facetGroup]) {
          facets[facetGroup] = [];
        }
        const rawMatch = attrFacetsRaw.find((f) => f.attributeValueId === val.id);
        facets[facetGroup].push({
          value: val.value,
          colorCode: val.colorCode || undefined,
          count: rawMatch ? rawMatch._count.productId : 0,
        });
      }

      const brandFacetsRaw = await prisma.product.groupBy({
        by: ["brandId"],
        where: {
          id: { in: matchedProductIds },
          brandId: { not: null },
        },
        _count: {
          id: true,
        },
      });

      const brandIds = brandFacetsRaw.map((f) => f.brandId as string);
      const brandsList = await prisma.brand.findMany({
        where: { id: { in: brandIds } },
      });

      const brandFacets = brandsList.map((b) => {
        const rawMatch = brandFacetsRaw.find((f) => f.brandId === b.id);
        return {
          id: b.id,
          name: b.name,
          count: rawMatch ? rawMatch._count.id : 0,
        };
      });

      const priceStats = await prisma.product.aggregate({
        where: scopeConditions,
        _min: { price: true },
        _max: { price: true },
      });

      response.facets = facets;
      response.brandFacets = brandFacets;
      response.priceRange = {
        min: priceStats._min.price || 0,
        max: priceStats._max.price || 1000,
      };
    }

    res.status(200).json(response);
  } catch (error) {
    next(error);
  }
};

export const getProductBySlug = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { slug } = req.params;
    const product = await prisma.product.findFirst({
      where: {
        OR: [
          { id: slug },
          { slug }
        ]
      },
      include: {
        brand: true,
        category: {
          include: {
            parent: true,
          },
        },
        reviews: {
          orderBy: { createdAt: "desc" },
        },
        productAttributeValues: {
          include: {
            attribute: true,
            attributeValue: true,
          },
        },
        variants: {
          include: {
            inventoryItems: {
              include: {
                warehouse: true,
              },
            },
            variantAttributeValues: {
              include: {
                attributeValue: {
                  include: {
                    attribute: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!product) {
      res.status(404).json({ success: false, message: "Product not found" });
      return;
    }

    let siblings: any[] = [];
    if (product.colorGroupId) {
      const siblingProducts = await prisma.product.findMany({
        where: {
          colorGroupId: product.colorGroupId,
        },
        select: {
          id: true,
          name: true,
          slug: true,
          price: true,
          image: true,
          inStock: true,
          specs: true,
          productAttributeValues: {
            include: {
              attribute: true,
              attributeValue: true,
            },
          },
        },
        orderBy: { createdAt: "asc" },
      });

      siblings = siblingProducts.map((s) => {
        const colorAttr = s.productAttributeValues?.find(
          (pav) =>
            pav.attribute?.slug === "color" ||
            pav.attribute?.name?.toLowerCase() === "color" ||
            pav.attribute?.name?.toLowerCase() === "kleur"
        );
        const sizeAttr = s.productAttributeValues?.find(
          (pav) =>
            pav.attribute?.slug === "size" ||
            pav.attribute?.slug === "afmeting" ||
            pav.attribute?.name?.toLowerCase() === "size" ||
            pav.attribute?.name?.toLowerCase() === "afmeting" ||
            pav.attribute?.name?.toLowerCase() === "maat" ||
            pav.attribute?.name?.toLowerCase() === "diameter"
        );

        // Check specs JSON for size/afmeting/diameter
        let sizeFromSpecs = "";
        if (s.specs) {
          if (Array.isArray(s.specs)) {
            const found = (s.specs as any[]).find((sp) => {
              const k = String(sp?.key || "").toLowerCase();
              return k.includes("afmeting") || k.includes("maat") || k.includes("diameter") || k.includes("size") || k.includes("breedte");
            });
            if (found?.value) sizeFromSpecs = String(found.value);
          } else if (typeof s.specs === "object") {
            for (const [k, v] of Object.entries(s.specs as Record<string, any>)) {
              const kLower = k.toLowerCase();
              if (kLower.includes("afmeting") || kLower.includes("maat") || kLower.includes("diameter") || kLower.includes("size") || kLower.includes("breedte")) {
                sizeFromSpecs = String(v);
                break;
              }
            }
          }
        }

        // Try extracting size pattern from product name, e.g. "Ø 40 cm", "60cm", "80 cm", "3-Ring", etc.
        let sizeFromName = "";
        const nameMatch = s.name.match(/(?:Ø\s*\d+\s*(?:cm|mm)?|\b\d+\s*(?:cm|mm)\b|\b\d+[- ](?:ring|lichts|rings)\b|\b(?:small|medium|large|xl)\b)/i);
        if (nameMatch) {
          sizeFromName = nameMatch[0].trim();
        }

        return {
          id: s.id,
          name: s.name,
          slug: s.slug,
          price: s.price,
          image: s.image,
          inStock: s.inStock,
          colorName: colorAttr?.attributeValue?.value || s.name,
          colorCode: colorAttr?.attributeValue?.colorCode || "#333333",
          sizeName: sizeAttr?.attributeValue?.value || sizeFromSpecs || sizeFromName || "",
          isCurrent: s.id === product.id,
        };
      });
    }

    const mappedVariants = (product as any).variants?.map((v: any) => {
      const sizeAttr = v.variantAttributeValues?.find((vav: any) => {
        const slug = vav.attributeValue?.attribute?.slug?.toLowerCase();
        const name = vav.attributeValue?.attribute?.name?.toLowerCase();
        return (
          slug === "size" ||
          slug === "afmeting" ||
          name === "size" ||
          name === "afmeting" ||
          name === "maat" ||
          name === "diameter"
        );
      });
      const sizeFromName =
        v.sku?.match(/(?:Ø\s*\d+\s*(?:cm|mm)?|\b\d+\s*(?:cm|mm)\b|\b\d+[- ](?:ring|lichts|rings)\b|\b(?:small|medium|large|xl)\b)/i)?.[0] || "";
      const sizeVal = sizeAttr?.attributeValue?.value || sizeFromName || "";
      return {
        id: v.id,
        sku: v.sku,
        stock: v.stock,
        price: v.price ?? product.price,
        sizeName: sizeVal || v.sku || "Default",
        inStock: (v.stock ?? 0) > 0,
      };
    }) || [];

    const clientProduct = {
      ...sanitizeProductForClient(product),
      variants: mappedVariants,
      siblings,
    };

    res.status(200).json({ success: true, product: clientProduct });
  } catch (error) {
    next(error);
  }
};

// Admin Operations
export const createProduct = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const {
      name,
      slug,
      brandId,
      categoryId,
      price,
      oldPrice,
      image,
      images,
      inStock,
      isNewArrival,
      isBestSelling,
      description,
      shortDescription,
      specs,
      seoTitle,
      seoDescription,
      seoKeywords,
      attributes, // e.g. { "color": "Black", "material": ["Metal", "Glass"] }
      variants, // e.g. [{ sku: "SKU1", stock: 10, price: 19.99, attributes: { "color": "Black" } }]
    } = req.body;

    let finalCategoryId = categoryId;
    if (!finalCategoryId && req.body.category) {
      const catMatch = await prisma.category.findFirst({
        where: {
          OR: [
            { slug: String(req.body.category).trim() },
            { name: { equals: String(req.body.category).trim(), mode: "insensitive" } },
            { slug: { contains: String(req.body.category).trim(), mode: "insensitive" } },
          ],
        },
      });
      if (catMatch) finalCategoryId = catMatch.id;
    }

    if (finalCategoryId) {
      const exists = await prisma.category.findUnique({ where: { id: finalCategoryId } });
      if (!exists) finalCategoryId = null;
    }

    if (!finalCategoryId) {
      const firstCat = await prisma.category.findFirst({ orderBy: { sortOrder: "asc" } });
      if (firstCat) finalCategoryId = firstCat.id;
    }

    let finalBrandId = brandId || null;
    if (finalBrandId === "" || finalBrandId === "none") finalBrandId = null;
    if (finalBrandId) {
      const bExists = await prisma.brand.findUnique({ where: { id: finalBrandId } });
      if (!bExists) finalBrandId = null;
    }
    if (!finalBrandId && req.body.brand) {
      const brandMatch = await prisma.brand.findFirst({
        where: { name: { equals: String(req.body.brand).trim(), mode: "insensitive" } },
      });
      if (brandMatch) finalBrandId = brandMatch.id;
    }

    const cleanPrice = isNaN(parseFloat(price)) ? 0 : parseFloat(price);
    const cleanOldPrice = oldPrice && !isNaN(parseFloat(oldPrice)) ? parseFloat(oldPrice) : null;

    let baseSlug = (slug || name || `product-${Date.now()}`).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
    if (!baseSlug) baseSlug = `product-${Date.now()}`;
    let finalSlug = baseSlug;
    const existingSlug = await prisma.product.findUnique({ where: { slug: finalSlug } });
    if (existingSlug) {
      finalSlug = `${baseSlug}-${Date.now()}`;
    }

    // Create the base product
    const product = await prisma.product.create({
      data: {
        name: name || "Untitled Product",
        slug: finalSlug,
        brandId: finalBrandId,
        categoryId: finalCategoryId as string,
        price: cleanPrice,
        oldPrice: cleanOldPrice,
        image: image || "/assets/cat-pendant.jpg",
        images: Array.isArray(images) ? images : [],
        inStock: inStock !== undefined ? inStock : true,
        isNewArrival: isNewArrival !== undefined ? isNewArrival : false,
        isBestSelling: isBestSelling !== undefined ? isBestSelling : false,
        description: description || "",
        shortDescription: shortDescription || "",
        specs: specs || {},
        colorGroupId: req.body.colorGroupId || undefined,
        seoTitle,
        seoDescription,
        seoKeywords,
      },
    });

    // Insert Product Attribute Value links
    if (attributes && typeof attributes === "object") {
      for (const [attrSlug, val] of Object.entries(attributes)) {
        const attribute = await prisma.attribute.findUnique({
          where: { slug: attrSlug },
        });
        if (!attribute) continue;

        const valList = Array.isArray(val) ? val : [val];
        for (const singleVal of valList) {
          if (!singleVal) continue;
          let attrValue = await prisma.attributeValue.findFirst({
            where: {
              attributeId: attribute.id,
              value: { equals: String(singleVal).trim(), mode: "insensitive" },
            },
          });

          // Create value if not exists
          if (!attrValue) {
            attrValue = await prisma.attributeValue.create({
              data: {
                attributeId: attribute.id,
                value: String(singleVal).trim(),
              },
            });
          }

          await prisma.productAttributeValue.upsert({
            where: {
              productId_attributeId_attributeValueId: {
                productId: product.id,
                attributeId: attribute.id,
                attributeValueId: attrValue.id,
              },
            },
            create: {
              productId: product.id,
              attributeId: attribute.id,
              attributeValueId: attrValue.id,
            },
            update: {},
          });
        }
      }
    }

    // Insert Product Variants
    if (variants && Array.isArray(variants)) {
      for (const v of variants) {
        const variantSku =
          v.sku && String(v.sku).trim()
            ? String(v.sku).trim()
            : `${product.slug || product.id}-var-${Math.random().toString(36).substring(2, 7)}`;

        const variant = await prisma.productVariant.create({
          data: {
            productId: product.id,
            sku: variantSku,
            stock: parseInt(v.stock, 10) || 0,
            price: v.price !== null && v.price !== undefined && !isNaN(parseFloat(v.price)) ? parseFloat(v.price) : null,
          },
        });

        const sizeVal = v.sizeName || v.size || (v.attributes ? (v.attributes.size || v.attributes.afmeting) : null);
        if (sizeVal) {
          let attribute = await prisma.attribute.findFirst({
            where: {
              OR: [
                { slug: "size" },
                { slug: "afmeting" },
                { name: { equals: "Size", mode: "insensitive" } },
                { name: { equals: "Afmeting", mode: "insensitive" } },
              ],
            },
          });
          if (!attribute) {
            attribute = await prisma.attribute.create({
              data: {
                name: "Afmeting",
                slug: "size",
                type: "select",
                visibility: "both",
              },
            });
          }

          let attrValue = await prisma.attributeValue.findFirst({
            where: {
              attributeId: attribute.id,
              value: { equals: String(sizeVal).trim(), mode: "insensitive" },
            },
          });

          if (!attrValue) {
            attrValue = await prisma.attributeValue.create({
              data: {
                attributeId: attribute.id,
                value: String(sizeVal).trim(),
              },
            });
          }

          await prisma.variantAttributeValue.create({
            data: {
              variantId: variant.id,
              attributeValueId: attrValue.id,
            },
          });
        }
      }
    }

    // Automatically synchronize inventory records for product and variants
    await InventoryService.syncProductInventory(product.id, {
      storageStock: req.body.storageStock ? parseInt(req.body.storageStock) : undefined,
      webshopStock: req.body.webshopStock ? parseInt(req.body.webshopStock) : undefined,
      binLocation: req.body.binLocation,
      lowStockThreshold: req.body.lowStockThreshold !== undefined ? parseInt(req.body.lowStockThreshold) : undefined,
    });

    // Handle Sibling / Color Group synchronization
    if (req.body.siblingProductIds && Array.isArray(req.body.siblingProductIds)) {
      const siblingIds = req.body.siblingProductIds.filter((sid: string) => sid && sid !== product.id);
      if (siblingIds.length > 0) {
        const existingGroupedSibling = await prisma.product.findFirst({
          where: {
            id: { in: siblingIds },
            colorGroupId: { not: null },
          },
        });
        const groupId = existingGroupedSibling?.colorGroupId || `grp_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

        await prisma.product.updateMany({
          where: { id: { in: [product.id, ...siblingIds] } },
          data: { colorGroupId: groupId },
        });
      }
    }

    res.status(201).json({ success: true, product });
  } catch (error) {
    next(error);
  }
};

export const updateProduct = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const {
      name,
      slug,
      brandId,
      categoryId,
      price,
      oldPrice,
      image,
      images,
      inStock,
      isNewArrival,
      isBestSelling,
      description,
      shortDescription,
      specs,
      seoTitle,
      seoDescription,
      seoKeywords,
      attributes,
      variants,
    } = req.body;

    const existingProduct = await prisma.product.findUnique({ where: { id } });
    if (!existingProduct) {
      res.status(404).json({ success: false, message: "Product not found" });
      return;
    }

    let finalCategoryId = categoryId;
    if (!finalCategoryId && req.body.category) {
      const catMatch = await prisma.category.findFirst({
        where: {
          OR: [
            { slug: String(req.body.category).trim() },
            { name: { equals: String(req.body.category).trim(), mode: "insensitive" } },
          ],
        },
      });
      if (catMatch) finalCategoryId = catMatch.id;
    }
    if (finalCategoryId) {
      const exists = await prisma.category.findUnique({ where: { id: finalCategoryId } });
      if (!exists) finalCategoryId = undefined;
    }

    let finalBrandId = brandId;
    if (finalBrandId === "" || finalBrandId === "none") finalBrandId = null;
    if (finalBrandId) {
      const bExists = await prisma.brand.findUnique({ where: { id: finalBrandId } });
      if (!bExists) finalBrandId = null;
    }
    if (!finalBrandId && req.body.brand) {
      const brandMatch = await prisma.brand.findFirst({
        where: { name: { equals: String(req.body.brand).trim(), mode: "insensitive" } },
      });
      if (brandMatch) finalBrandId = brandMatch.id;
    }

    // Update base details
    const product = await prisma.product.update({
      where: { id },
      data: {
        name,
        slug,
        brandId: finalBrandId,
        categoryId: finalCategoryId,
        price: price !== undefined ? (!isNaN(parseFloat(price)) ? parseFloat(price) : undefined) : undefined,
        oldPrice: oldPrice !== undefined ? (oldPrice && !isNaN(parseFloat(oldPrice)) ? parseFloat(oldPrice) : null) : undefined,
        image,
        images: Array.isArray(images) ? images : undefined,
        inStock,
        isNewArrival: isNewArrival !== undefined ? isNewArrival : undefined,
        isBestSelling: isBestSelling !== undefined ? isBestSelling : undefined,
        description,
        shortDescription,
        specs: specs || undefined,
        colorGroupId: req.body.colorGroupId !== undefined ? (req.body.colorGroupId || null) : undefined,
        seoTitle,
        seoDescription,
        seoKeywords,
      },
    });

    // Sync attribute mapping
    if (attributes && typeof attributes === "object") {
      // Clear old mappings
      await prisma.productAttributeValue.deleteMany({ where: { productId: id } });

      for (const [attrSlug, val] of Object.entries(attributes)) {
        const attribute = await prisma.attribute.findUnique({
          where: { slug: attrSlug },
        });
        if (!attribute) continue;

        const valList = Array.isArray(val) ? val : [val];
        for (const singleVal of valList) {
          if (!singleVal) continue;
          let attrValue = await prisma.attributeValue.findFirst({
            where: {
              attributeId: attribute.id,
              value: { equals: String(singleVal).trim(), mode: "insensitive" },
            },
          });

          if (!attrValue) {
            attrValue = await prisma.attributeValue.create({
              data: {
                attributeId: attribute.id,
                value: String(singleVal).trim(),
              },
            });
          }

          await prisma.productAttributeValue.upsert({
            where: {
              productId_attributeId_attributeValueId: {
                productId: id,
                attributeId: attribute.id,
                attributeValueId: attrValue.id,
              },
            },
            create: {
              productId: id,
              attributeId: attribute.id,
              attributeValueId: attrValue.id,
            },
            update: {},
          });
        }
      }
    }

    // Sync variants
    if (variants && Array.isArray(variants)) {
      // Delete old variants
      await prisma.productVariant.deleteMany({ where: { productId: id } });

      for (const v of variants) {
        const variantSku =
          v.sku && String(v.sku).trim()
            ? String(v.sku).trim()
            : `${existingProduct.slug || id}-var-${Math.random().toString(36).substring(2, 7)}`;

        const variant = await prisma.productVariant.create({
          data: {
            productId: id,
            sku: variantSku,
            stock: parseInt(v.stock, 10) || 0,
            price: v.price !== null && v.price !== undefined && !isNaN(parseFloat(v.price)) ? parseFloat(v.price) : null,
          },
        });

        const sizeVal = v.sizeName || v.size || (v.attributes ? (v.attributes.size || v.attributes.afmeting) : null);
        if (sizeVal) {
          let attribute = await prisma.attribute.findFirst({
            where: {
              OR: [
                { slug: "size" },
                { slug: "afmeting" },
                { name: { equals: "Size", mode: "insensitive" } },
                { name: { equals: "Afmeting", mode: "insensitive" } },
              ],
            },
          });
          if (!attribute) {
            attribute = await prisma.attribute.create({
              data: {
                name: "Afmeting",
                slug: "size",
                type: "select",
                visibility: "both",
              },
            });
          }

          let attrValue = await prisma.attributeValue.findFirst({
            where: {
              attributeId: attribute.id,
              value: { equals: String(sizeVal).trim(), mode: "insensitive" },
            },
          });

          if (!attrValue) {
            attrValue = await prisma.attributeValue.create({
              data: {
                attributeId: attribute.id,
                value: String(sizeVal).trim(),
              },
            });
          }

          await prisma.variantAttributeValue.create({
            data: {
              variantId: variant.id,
              attributeValueId: attrValue.id,
            },
          });
        }
      }
    }

    // Automatically synchronize inventory records for product and variants on edit
    await InventoryService.syncProductInventory(product.id, {
      storageStock: req.body.storageStock !== undefined ? parseInt(req.body.storageStock) : undefined,
      webshopStock: req.body.webshopStock !== undefined ? parseInt(req.body.webshopStock) : undefined,
      binLocation: req.body.binLocation,
      lowStockThreshold: req.body.lowStockThreshold !== undefined ? parseInt(req.body.lowStockThreshold) : undefined,
    });

    // Handle Sibling / Color Group synchronization
    if (req.body.siblingProductIds !== undefined) {
      const siblingIds: string[] = Array.isArray(req.body.siblingProductIds)
        ? req.body.siblingProductIds.filter((sid: string) => sid && sid !== id)
        : [];

      if (siblingIds.length === 0) {
        if (existingProduct.colorGroupId) {
          const oldGroupId = existingProduct.colorGroupId;
          await prisma.product.update({
            where: { id },
            data: { colorGroupId: null },
          });

          // If 1 or 0 products remain in that group, nullify them as well
          const remaining = await prisma.product.findMany({
            where: { colorGroupId: oldGroupId },
          });
          if (remaining.length <= 1) {
            await prisma.product.updateMany({
              where: { colorGroupId: oldGroupId },
              data: { colorGroupId: null },
            });
          }
        }
      } else {
        let groupId = existingProduct.colorGroupId;
        if (!groupId) {
          const existingGroupedSibling = await prisma.product.findFirst({
            where: {
              id: { in: siblingIds },
              colorGroupId: { not: null },
            },
          });
          groupId = existingGroupedSibling?.colorGroupId || null;
        }

        if (!groupId) {
          groupId = `grp_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
        }

        const allIds = [id, ...siblingIds];
        await prisma.product.updateMany({
          where: { id: { in: allIds } },
          data: { colorGroupId: groupId },
        });

        // If product switched from an old group, clean up old group if only 1 remains
        if (existingProduct.colorGroupId && existingProduct.colorGroupId !== groupId) {
          const oldGroupRemaining = await prisma.product.findMany({
            where: { colorGroupId: existingProduct.colorGroupId },
          });
          if (oldGroupRemaining.length <= 1) {
            await prisma.product.updateMany({
              where: { colorGroupId: existingProduct.colorGroupId },
              data: { colorGroupId: null },
            });
          }
        }
      }
    }

    res.status(200).json({ success: true, product });
  } catch (error) {
    next(error);
  }
};

export const deleteProduct = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    await prisma.product.delete({ where: { id } });
    res.status(200).json({ success: true, message: "Product deleted successfully" });
  } catch (error) {
    next(error);
  }
};
