import { Request, Response, NextFunction } from "express";
import { prisma } from "../config/db";

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

    // Category filter (includes subcategories recursively if applicable)
    if (categorySlug && categorySlug !== "deals") {
      const category = await prisma.category.findUnique({
        where: { slug: categorySlug },
        include: { children: true },
      });

      if (category) {
        const catIds = [category.id, ...category.children.map((c) => c.id)];
        whereConditions.AND.push({
          categoryId: { in: catIds },
        });
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
      products,
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

    res.status(200).json({ success: true, product });
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

    // Create the base product
    const product = await prisma.product.create({
      data: {
        name,
        slug: slug || `${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${Date.now()}`,
        brandId,
        categoryId,
        price: parseFloat(price),
        oldPrice: oldPrice ? parseFloat(oldPrice) : null,
        image: image || "/assets/cat-pendant.jpg",
        images: Array.isArray(images) ? images : [],
        inStock: inStock !== undefined ? inStock : true,
        isNewArrival: isNewArrival !== undefined ? isNewArrival : false,
        isBestSelling: isBestSelling !== undefined ? isBestSelling : false,
        description: description || "",
        shortDescription: shortDescription || "",
        specs: specs || {},
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
              value: { equals: singleVal, mode: "insensitive" },
            },
          });

          // Create value if not exists
          if (!attrValue) {
            attrValue = await prisma.attributeValue.create({
              data: {
                attributeId: attribute.id,
                value: singleVal,
              },
            });
          }

          await prisma.productAttributeValue.create({
            data: {
              productId: product.id,
              attributeId: attribute.id,
              attributeValueId: attrValue.id,
            },
          });
        }
      }
    }

    // Insert Product Variants
    if (variants && Array.isArray(variants)) {
      for (const v of variants) {
        const variant = await prisma.productVariant.create({
          data: {
            productId: product.id,
            sku: v.sku,
            stock: parseInt(v.stock, 10) || 0,
            price: v.price ? parseFloat(v.price) : null,
          },
        });

        // Link variant attributes
        if (v.attributes && typeof v.attributes === "object") {
          for (const [attrSlug, val] of Object.entries(v.attributes)) {
            const attribute = await prisma.attribute.findUnique({
              where: { slug: attrSlug },
            });
            if (!attribute) continue;

            const singleVal = val as string;
            let attrValue = await prisma.attributeValue.findFirst({
              where: {
                attributeId: attribute.id,
                value: { equals: singleVal, mode: "insensitive" },
              },
            });

            if (!attrValue) {
              attrValue = await prisma.attributeValue.create({
                data: {
                  attributeId: attribute.id,
                  value: singleVal,
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

    // Update base details
    const product = await prisma.product.update({
      where: { id },
      data: {
        name,
        slug,
        brandId,
        categoryId,
        price: price !== undefined ? parseFloat(price) : undefined,
        oldPrice: oldPrice !== undefined ? (oldPrice ? parseFloat(oldPrice) : null) : undefined,
        image,
        images: Array.isArray(images) ? images : undefined,
        inStock,
        isNewArrival: isNewArrival !== undefined ? isNewArrival : undefined,
        isBestSelling: isBestSelling !== undefined ? isBestSelling : undefined,
        description,
        shortDescription,
        specs: specs || undefined,
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
              value: { equals: singleVal, mode: "insensitive" },
            },
          });

          if (!attrValue) {
            attrValue = await prisma.attributeValue.create({
              data: {
                attributeId: attribute.id,
                value: singleVal,
              },
            });
          }

          await prisma.productAttributeValue.create({
            data: {
              productId: id,
              attributeId: attribute.id,
              attributeValueId: attrValue.id,
            },
          });
        }
      }
    }

    // Sync variants
    if (variants && Array.isArray(variants)) {
      // Delete old variants
      await prisma.productVariant.deleteMany({ where: { productId: id } });

      for (const v of variants) {
        const variant = await prisma.productVariant.create({
          data: {
            productId: id,
            sku: v.sku,
            stock: parseInt(v.stock, 10) || 0,
            price: v.price ? parseFloat(v.price) : null,
          },
        });

        if (v.attributes && typeof v.attributes === "object") {
          for (const [attrSlug, val] of Object.entries(v.attributes)) {
            const attribute = await prisma.attribute.findUnique({
              where: { slug: attrSlug },
            });
            if (!attribute) continue;

            const singleVal = val as string;
            let attrValue = await prisma.attributeValue.findFirst({
              where: {
                attributeId: attribute.id,
                value: { equals: singleVal, mode: "insensitive" },
              },
            });

            if (!attrValue) {
              attrValue = await prisma.attributeValue.create({
                data: {
                  attributeId: attribute.id,
                  value: singleVal,
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
