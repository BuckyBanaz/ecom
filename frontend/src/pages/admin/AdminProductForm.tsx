import { useState, useRef, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Upload, X, Save, Plus, ImageIcon, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { useAdmin } from "@/context/AdminContext";
import { toast } from "sonner";
import { RichTextEditor } from "@/components/admin/RichTextEditor";
import { Brand, Series } from "@/data/brands";
import { Attribute } from "@/data/attributes";
import { brandRepository, categoryRepository, attributeRepository, productRepository, seriesRepository } from "@/client/apiClient";


export interface SpecItem {
  id: string;
  key: string;
  value: string;
  link?: string;
}

const AdminProductForm = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { hasPermission } = useAdmin();

  const isEdit = id !== undefined && id !== "new";

  // Loading states
  const [isMetadataLoading, setIsMetadataLoading] = useState(true);
  const [isProductLoading, setIsProductLoading] = useState(isEdit);

  // Data states
  const [brands, setBrands] = useState<Brand[]>([]);
  const [categoriesList, setCategoriesList] = useState<any[]>([]);
  const [attributes, setAttributes] = useState<Attribute[]>([]);
  const [seriesList, setSeriesList] = useState<Series[]>([]);

  // Form states
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [oldPrice, setOldPrice] = useState("");
  const [thumbnail, setThumbnail] = useState<string | null>(null);
  const [galleryImages, setGalleryImages] = useState<string[]>([]);
  const [description, setDescription] = useState("");
  const [shortDescription, setShortDescription] = useState("");
  const [inStock, setInStock] = useState(true);
  const [isNewArrival, setIsNewArrival] = useState(false);
  const [isBestSelling, setIsBestSelling] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedBrand, setSelectedBrand] = useState("");
  const [selectedSeries, setSelectedSeries] = useState("");
  const [numberOfLights, setNumberOfLights] = useState("");
  const [selectedAttributeValues, setSelectedAttributeValues] = useState<Record<string, string[]>>({});
  
  // Dynamic Specification states
  const [specs, setSpecs] = useState<SpecItem[]>([]);
  const [newParamName, setNewParamName] = useState("");

  const thumbnailInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  // Load brands, categories, attributes, series
  useEffect(() => {
    const loadMetadata = async () => {
      setIsMetadataLoading(true);
      try {
        // 1. Brands
        try {
          const data = await brandRepository.getAll();
          if (data.success && data.brands) setBrands(data.brands);
        } catch (e) {
          const saved = localStorage.getItem("brands_data");
          if (saved) setBrands(JSON.parse(saved));
          else {
            const { brands: initialBrands } = await import("@/data/brands");
            setBrands(initialBrands);
          }
        }

        // 1.5. Series
        try {
          const data = await seriesRepository.getAll();
          if (data.success && data.series) {
            setSeriesList(data.series);
          } else {
            throw new Error("Failed to fetch series");
          }
        } catch (e) {
          const savedSeries = localStorage.getItem("series_data");
          if (savedSeries) {
            try {
              setSeriesList(JSON.parse(savedSeries));
            } catch (err) {
              const { series: initialSeries } = await import("@/data/brands");
              setSeriesList(initialSeries);
            }
          } else {
            const { series: initialSeries } = await import("@/data/brands");
            setSeriesList(initialSeries);
          }
        }


        // 2. Categories
        try {
          const data = await categoryRepository.getAll();
          if (data.success && data.categories) setCategoriesList(data.categories);
        } catch (e) {
          const saved = localStorage.getItem("categories_data");
          if (saved) setCategoriesList(JSON.parse(saved));
          else {
            const { categories: initialCategories } = await import("@/data/categories");
            setCategoriesList(initialCategories);
          }
        }

        // 3. Attributes
        try {
          const data = await attributeRepository.getAll();
          if (data.success && data.attributes) {
            const mapped = data.attributes.map((a: any) => ({
              id: a.id,
              name: a.name,
              slug: a.slug,
              type: a.type,
              values: a.attributeValues || [],
              visibility: a.visibility || "both",
            }));
            setAttributes(mapped);
          }
        } catch (e) {
          const saved = localStorage.getItem("attributes_data");
          if (saved) setAttributes(JSON.parse(saved));
          else {
            const { attributes: initialAttributes } = await import("@/data/attributes");
            setAttributes(initialAttributes);
          }
        }
      } finally {
        setIsMetadataLoading(false);
      }
    };

    loadMetadata();
  }, []);

  // Reset series when brand changes
  useEffect(() => {
    if (!selectedBrand) {
      setSelectedSeries("");
      return;
    }
    const brandId = brands.find((b) => b.name === selectedBrand)?.id;
    const seriesBelongsToBrand = seriesList.some(
      (s) => s.name === selectedSeries && s.brandId === brandId
    );
    if (!seriesBelongsToBrand && selectedSeries !== "none" && selectedSeries !== "") {
      setSelectedSeries("");
    }
  }, [selectedBrand, brands, seriesList, selectedSeries]);

  const DEFAULT_SPECS_STRUCTURE: SpecItem[] = [
    { id: "e1", key: "Maximum wattage", value: "7W" },
    { id: "e2", key: "Connection voltage", value: "220-240V" },
    { id: "e4", key: "Type of fitting", value: "E27" },
    { id: "e5", key: "Includes light", value: "No" },
    { id: "e6", key: "Dimmable", value: "Yes (not included)" },
    { id: "p1", key: "Length in cm", value: "50" },
    { id: "p2", key: "Width in cm", value: "50" },
    { id: "p3", key: "Height in cm", value: "120" },
    { id: "p4", key: "Base/mounting plate width in cm", value: "12" },
    { id: "p5", key: "Foot/mounting plate length", value: "12" },
    { id: "p6", key: "Height of foot/mounting plate", value: "2.5" },
    { id: "m1", key: "Colour", value: "Black" },
    { id: "m2", key: "Material", value: "Metal" },
    { id: "m3", key: "Style", value: "Modern" },
    { id: "m4", key: "Warranty", value: "2 years" },
    { id: "l1", key: "Article number", value: "Q10757" },
    { id: "l2", key: "IP rating", value: "IP20 (dustproof)" },
    { id: "l3", key: "Installation Manual", value: "Download PDF", link: "" }
  ];

  const parseSpecs = (specsObj: any): SpecItem[] => {
    if (Array.isArray(specsObj)) {
      return specsObj
        .filter(s => s.key !== "Number of lights" && s.key !== "Series")
        .map(s => ({ ...s, id: s.id || `item-${Math.random()}` }));
    }
    
    // Legacy support
    if (typeof specsObj === "object" && specsObj !== null) {
      const items: SpecItem[] = [];
      Object.entries(specsObj).forEach(([fullKey, val]) => {
        let key = fullKey;
        if (fullKey.includes("::")) key = fullKey.split("::")[1];
        if (key === "Number of lights" || key === "Series") return;
        items.push({ id: `item-${Math.random()}`, key, value: String(val) });
      });
      return items.length > 0 ? items : DEFAULT_SPECS_STRUCTURE;
    }
    return DEFAULT_SPECS_STRUCTURE;
  };

  const serializeSpecs = (items: SpecItem[]): any[] => {
    return items.filter(item => item.key.trim()).map(item => ({
      key: item.key.trim(),
      value: item.value.trim(),
      link: item.link?.trim() || ""
    }));
  };

  // Load existing product details (if Edit mode)
  useEffect(() => {
    if (!isEdit) {
      setSpecs(DEFAULT_SPECS_STRUCTURE);
      setNumberOfLights("");
      setSelectedSeries("");
      return;
    }

    const loadProduct = async () => {
      setIsProductLoading(true);
      try {
        // 1. Try backend
        try {
          const data = await productRepository.getByIdOrSlug(id);
          if (data.success && data.product) {
            const p = data.product;
            setName(p.title || p.name || "");
            setPrice(String(p.price || ""));
            setOldPrice(p.oldPrice ? String(p.oldPrice) : "");
            setThumbnail(p.image || null);
            setGalleryImages(p.images || (p.image ? [p.image] : []));
            setDescription(p.description || "");
            setShortDescription(p.shortDescription || "");
            setInStock(p.inStock ?? true);
            setIsNewArrival(p.isNewArrival ?? false);
            setIsBestSelling(p.isBestSelling ?? false);
            setSelectedCategory(p.category?.slug || "");
            setSelectedBrand(p.brand?.name || "");

            // Parse existing EAV attribute values
            const initialAttrVals: Record<string, string[]> = {};
            if (p.productAttributeValues) {
              p.productAttributeValues.forEach((pav: any) => {
                const slug = pav.attribute.slug;
                const value = pav.attributeValue.value;
                if (!initialAttrVals[slug]) {
                  initialAttrVals[slug] = [];
                }
                initialAttrVals[slug].push(value);
              });
            }
            setSelectedAttributeValues(initialAttrVals);

            // Parse specs
            let foundNumLights = "";
            let foundSeries = "";
            if (Array.isArray(p.specs)) {
              p.specs.forEach((s: any) => {
                if (s && s.key === "Number of lights") foundNumLights = String(s.value);
                if (s && s.key === "Series") foundSeries = String(s.value);
              });
            } else {
              Object.entries(p.specs || {}).forEach(([k, val]) => {
                const cleanKey = k.includes("::") ? k.split("::")[1] : k;
                if (cleanKey === "Number of lights") {
                  foundNumLights = String(val);
                }
                if (cleanKey === "Series") {
                  foundSeries = String(val);
                }
              });
            }
            setNumberOfLights(foundNumLights);
            setSelectedSeries(foundSeries || "none");

            const parsed = parseSpecs(p.specs || {});
            setSpecs(parsed.length > 0 ? parsed : DEFAULT_SPECS_STRUCTURE);
            return;
          }
        } catch (e) {
          console.warn("Backend API not reachable for product fetch, using local fallback.");
        }

        // 2. Try localStorage / static mockup fallback
        const savedProducts = localStorage.getItem("products_data");
        let allProducts = [];
        if (savedProducts) {
          try { allProducts = JSON.parse(savedProducts); } catch (e) {}
        } else {
          const { products: initialProducts } = await import("@/data/products");
          allProducts = initialProducts;
        }

        const p = allProducts.find((x: any) => String(x.id) === id);
        if (p) {
          setName(p.name || "");
          setPrice(String(p.price || ""));
          setOldPrice(p.oldPrice ? String(p.oldPrice) : "");
          setThumbnail(p.image || null);
          setGalleryImages(p.images || (p.image ? [p.image] : []));
          setDescription(p.description || "");
          setShortDescription(p.shortDescription || "");
          setInStock(p.inStock ?? true);
          setIsNewArrival(p.isNewArrival ?? false);
          setIsBestSelling(p.isBestSelling ?? false);
          setSelectedCategory(p.category || "");
          setSelectedBrand(p.brand || "");

          // Initialize from local flat fields
          const initialAttrVals: Record<string, string[]> = {};
          if (p.color) initialAttrVals["color"] = [p.color];
          if (p.material) initialAttrVals["material"] = [p.material];
          if (p.style) initialAttrVals["style"] = [p.style];
          if (p.fitting) initialAttrVals["fitting"] = [p.fitting];
          setSelectedAttributeValues(initialAttrVals);

          // Parse specs
          let foundNumLights = "";
          let foundSeries = "";
          if (Array.isArray(p.specs)) {
            p.specs.forEach((s: any) => {
              if (s && s.key === "Number of lights") foundNumLights = String(s.value);
              if (s && s.key === "Series") foundSeries = String(s.value);
            });
          } else {
            Object.entries(p.specs || {}).forEach(([k, val]) => {
              const cleanKey = k.includes("::") ? k.split("::")[1] : k;
              if (cleanKey === "Number of lights") {
                foundNumLights = String(val);
              }
              if (cleanKey === "Series") {
                foundSeries = String(val);
              }
            });
          }
          setNumberOfLights(foundNumLights);
          setSelectedSeries(foundSeries || "none");

          const parsed = parseSpecs(p.specs || {});
          setSpecs(parsed.length > 0 ? parsed : DEFAULT_SPECS_STRUCTURE);
        }
      } finally {
        setIsProductLoading(false);
      }
    };

    loadProduct();
  }, [id, isEdit]);

  const handleAddItem = () => {
    if (!newParamName.trim()) {
      toast.error("Parameter name cannot be empty");
      return;
    }
    setSpecs((prev) => [
      ...prev,
      {
        id: `item-${Date.now()}-${Math.random()}`,
        key: newParamName.trim(),
        value: "",
        link: ""
      }
    ]);
    setNewParamName("");
    toast.success(`Parameter "${newParamName.trim()}" added`);
  };

  const handleUpdateItemKey = (itemId: string, newKey: string) => {
    setSpecs((prev) => prev.map((item) => item.id === itemId ? { ...item, key: newKey } : item));
  };

  const handleUpdateItemValue = (itemId: string, newVal: string) => {
    setSpecs((prev) => prev.map((item) => item.id === itemId ? { ...item, value: newVal } : item));
  };

  const handleUpdateItemLink = (itemId: string, newLink: string) => {
    setSpecs((prev) => prev.map((item) => item.id === itemId ? { ...item, link: newLink } : item));
  };

  const handleDeleteItem = (itemId: string) => {
    setSpecs((prev) => prev.filter((item) => item.id !== itemId));
  };

  const moveSpecItem = (index: number, direction: "up" | "down") => {
    if (direction === "up" && index === 0) return;
    if (direction === "down" && index === specs.length - 1) return;
    
    setSpecs((prev) => {
      const newSpecs = [...prev];
      const targetIndex = direction === "up" ? index - 1 : index + 1;
      const temp = newSpecs[targetIndex];
      newSpecs[targetIndex] = newSpecs[index];
      newSpecs[index] = temp;
      return newSpecs;
    });
  };

  if (!hasPermission("admin")) {
    return (
      <div className="flex items-center justify-center min-h-[400px] text-muted-foreground">
        <p>You do not have permission to access this page.</p>
      </div>
    );
  }

  const isLoading = isMetadataLoading || (isEdit && isProductLoading);

  if (isLoading) {
    return (
      <div className="max-w-6xl mx-auto space-y-8 pb-12">
        {/* Header Banner */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card/45 backdrop-blur-md p-6 rounded-2xl border border-border/80 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.06)]">
          <div className="flex items-center gap-4 w-full">
            <Skeleton className="rounded-full shrink-0 h-10 w-10" />
            <div className="space-y-2 flex-grow">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-80" />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          {/* LEFT COLUMN — Main Forms (2/3 Width) */}
          <div className="lg:col-span-2 space-y-8">
            {/* Basic Info */}
            <Card className="border border-border/80 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.06)] bg-card/50 backdrop-blur-md rounded-2xl overflow-hidden p-6 space-y-6">
              <div className="space-y-2 border-b pb-4">
                <Skeleton className="h-5 w-36" />
                <Skeleton className="h-3.5 w-64" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="md:col-span-2 space-y-2">
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-10 w-full" />
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-3 w-12" />
                  <Skeleton className="h-10 w-full" />
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-3 w-16" />
                  <Skeleton className="h-10 w-full" />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Skeleton className="h-3 w-16" />
                  <Skeleton className="h-10 w-full" />
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-3 w-28" />
                  <Skeleton className="h-10 w-full" />
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-10 w-full" />
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-10 w-full" />
                </div>
              </div>
            </Card>

            {/* Description Card */}
            <Card className="border border-border/80 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.06)] bg-card/50 backdrop-blur-md rounded-2xl overflow-hidden p-6 space-y-4">
              <div className="space-y-2 border-b pb-4">
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-3.5 w-72" />
              </div>
              <Skeleton className="h-48 w-full" />
            </Card>

            {/* Media & Gallery Uploads */}
            <Card className="border border-border/80 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.06)] bg-card/50 backdrop-blur-md rounded-2xl overflow-hidden p-6 space-y-4">
              <div className="space-y-2 border-b pb-4">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-3.5 w-56" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Skeleton className="aspect-square w-full rounded-2xl" />
                <div className="md:col-span-2 space-y-4">
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-28 w-full rounded-2xl" />
                </div>
              </div>
            </Card>
          </div>

          {/* RIGHT COLUMN */}
          <div className="space-y-8">
            <Card className="border border-border/80 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.06)] bg-card/50 backdrop-blur-md rounded-2xl overflow-hidden p-6 space-y-6">
              <div className="space-y-2 border-b pb-4">
                <Skeleton className="h-5 w-44" />
                <Skeleton className="h-3.5 w-60" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-3 w-28" />
                <Skeleton className="h-10 w-full" />
              </div>
              <div className="space-y-4 pt-4 border-t">
                <Skeleton className="h-4 w-32" />
                <div className="space-y-3">
                  <Skeleton className="h-8 w-full" />
                  <Skeleton className="h-8 w-full" />
                  <Skeleton className="h-8 w-full" />
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  // Filter which attributes are visible based on selected category attributes relation
  const visibleAttributes = attributes.filter((attr) => {
    if (attr.visibility === "filter") return false;

    const activeCatObj = categoriesList.find((c) => c.slug === selectedCategory);
    
    // DB categories attributes mapping
    if (activeCatObj?.categoryAttributes && activeCatObj.categoryAttributes.length > 0) {
      return activeCatObj.categoryAttributes.some((ca: any) => ca.attribute.slug === attr.slug);
    }

    // Local Storage / Static mockups fallback category-attributes mapping
    const fallbackCategoryMapping: Record<string, string[]> = {
      "pendant-lamps": ["color", "light-color", "material", "style", "room", "fitting", "dimmable", "dimmer-type", "length", "height", "width", "diameter"],
      "ceiling-lamps": ["color", "light-color", "material", "style", "room", "fitting", "dimmable", "dimmer-type", "length", "height", "width", "diameter"],
      "wall-lamps": ["color", "light-color", "material", "style", "room", "fitting", "dimmable", "ip-rating", "dimmer-type", "length", "height", "width", "diameter"],
      "outdoor-lamps": ["color", "light-color", "material", "style", "room", "dimmable", "ip-rating", "length", "height", "width", "diameter"],
      "floor-lamps": ["color", "light-color", "material", "style", "room", "fitting", "dimmable", "dimmer-type", "length", "height"],
      "table-lamps": ["color", "light-color", "material", "style", "room", "fitting", "dimmable", "dimmer-type", "length", "height"],
      "chandeliers": ["color", "light-color", "material", "style", "room", "fitting", "dimmable", "length", "height", "diameter"],
      "smart-bulbs": ["color", "light-color", "fitting", "dimmable", "dimmer-type"],
      "led-bulbs": ["color", "light-color", "fitting", "dimmable"],
      "string-lights": ["color", "light-color", "room", "dimmable", "ip-rating", "length"],
    };

    const mapping = fallbackCategoryMapping[selectedCategory];
    if (mapping) {
      return mapping.includes(attr.slug);
    }

    return true; // Show all if category has no specific mappings defined
  });

  const handleThumbnailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setThumbnail(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleGalleryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    files.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setGalleryImages((prev) => [...prev, ev.target?.result as string]);
      };
      reader.readAsDataURL(file);
    });
    e.target.value = "";
  };

  const removeGalleryImage = (index: number) => {
    setGalleryImages((prev) => prev.filter((_, i) => i !== index));
  };

  const setAsThumbnail = (src: string) => {
    setThumbnail(src);
    toast.success("Thumbnail updated");
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!name.trim()) {
      toast.error("Product name is required");
      return;
    }
    if (!selectedCategory) {
      toast.error("Category is required");
      return;
    }
    if (!selectedBrand) {
      toast.error("Brand is required");
      return;
    }

    const serializedSpecs = serializeSpecs(specs);
    if (numberOfLights) {
      serializedSpecs.push({ key: "Number of lights", value: numberOfLights, link: "" });
    }
    if (selectedSeries && selectedSeries !== "none") {
      serializedSpecs.push({ key: "Series", value: selectedSeries, link: "" });
    }

    // Build flat parameters payload & backend relational EAV mapping
    const payload = {
      title: name,
      name: name,
      brand: selectedBrand,
      brandId: brands.find((b) => b.name === selectedBrand)?.id || null,
      category: selectedCategory,
      categoryId: categoriesList.find((c) => c.slug === selectedCategory)?.id || null,
      price: parseFloat(price) || 0,
      oldPrice: oldPrice ? parseFloat(oldPrice) : null,
      inStock,
      isNewArrival,
      isBestSelling,
      description,
      shortDescription,
      image: thumbnail || "/assets/cat-generic.jpg",
      images: galleryImages,
      attributes: selectedAttributeValues, // EAV dynamic mapping
      specs: serializedSpecs,
    };

    // 1. Try saving to backend API
    try {
      const data = isEdit
        ? await productRepository.update(id, payload)
        : await productRepository.create(payload);

      if (data.success) {
        toast.success(isEdit ? `Product "${name}" updated` : `Product "${name}" created`);
        navigate("/admin/products");
        return;
      }
    } catch (err) {
      console.warn("Backend API save failed, syncing to local storage / mock data only.");
    }

    // 2. Sync to local storage for static mockup fallback
    const savedProducts = localStorage.getItem("products_data");
    let allProducts = [];
    if (savedProducts) {
      try { allProducts = JSON.parse(savedProducts); } catch (e) {}
    } else {
      const { products: initialProducts } = await import("@/data/products");
      allProducts = initialProducts;
    }

    // Flatten values for legacy compatibility
    const flatProduct = {
      ...payload,
      id: isEdit ? id : `p-${Date.now()}`,
      color: selectedAttributeValues["color"]?.[0] || "",
      material: selectedAttributeValues["material"]?.[0] || "",
      style: selectedAttributeValues["style"]?.[0] || "",
      fitting: selectedAttributeValues["fitting"]?.[0] || "",
      dimmable: selectedAttributeValues["dimmable"]?.[0] || "",
      shortDescription,
    };

    let updatedProducts = [];
    if (isEdit) {
      updatedProducts = allProducts.map((p: any) => String(p.id) === id ? flatProduct : p);
    } else {
      updatedProducts = [...allProducts, flatProduct];
    }

    localStorage.setItem("products_data", JSON.stringify(updatedProducts));
    toast.success(isEdit ? `Product updated (Local Mode)` : `Product created (Local Mode)`);
    navigate("/admin/products");
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-12">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card/45 backdrop-blur-md p-6 rounded-2xl border border-border/80 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.06)]">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="icon"
            onClick={() => navigate("/admin/products")}
            className="rounded-full shrink-0 h-10 w-10 border-border/80 bg-background/50 hover:bg-primary hover:text-primary-foreground transition-all duration-300"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-transparent">
              {isEdit ? "Edit Product Details" : "Create New Product"}
            </h1>
            <p className="text-muted-foreground text-xs sm:text-sm mt-0.5 font-medium">
              {isEdit
                ? "Modify metadata, EAV attributes, and key-value specs."
                : "Enter basic details, select categories, and configure technical properties."}
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          
          {/* LEFT COLUMN — Main Forms (2/3 Width) */}
          <div className="lg:col-span-2 space-y-8">
            
            {/* Basic Info */}
            <Card className="border border-border/80 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.06)] bg-card/50 backdrop-blur-md rounded-2xl overflow-hidden hover:shadow-md transition-all duration-300">
              <CardHeader className="border-b pb-4 mb-4">
                <CardTitle className="text-lg font-bold flex items-center gap-2">Basic Information</CardTitle>
                <CardDescription className="text-xs">Provide essential product naming, branding, and pricing details.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="md:col-span-2 space-y-1.5">
                    <Label htmlFor="name" className="text-xs font-bold text-foreground/80">Product Name *</Label>
                    <Input
                      id="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Nordic Pendant Glass Lamp"
                      className="h-10 text-xs bg-background/50 focus-visible:ring-1 border-muted-foreground/20 rounded-lg"
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="brand" className="text-xs font-bold text-foreground/80">Brand *</Label>
                    <Select value={selectedBrand} onValueChange={setSelectedBrand}>
                      <SelectTrigger className="h-10 text-xs bg-background/50 border-muted-foreground/20 rounded-lg">
                        <SelectValue placeholder="Select Brand Partner" />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl">
                        {brands.map((b) => (
                          <SelectItem key={b.id} value={b.name} className="text-xs rounded-lg">
                            {b.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="series" className="text-xs font-bold text-foreground/80">Series / Collection</Label>
                    <Select
                      value={selectedSeries}
                      onValueChange={setSelectedSeries}
                      disabled={!selectedBrand}
                    >
                      <SelectTrigger className="h-10 text-xs bg-background/50 border-muted-foreground/20 rounded-lg">
                        <SelectValue placeholder={selectedBrand ? "Select Series" : "Select Brand First"} />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl">
                        <SelectItem value="none" className="text-xs rounded-lg italic text-muted-foreground">
                          None / General Catalog
                        </SelectItem>
                        {seriesList
                          .filter((s) => {
                            const brandId = brands.find((b) => b.name === selectedBrand)?.id;
                            return s.brandId === brandId;
                          })
                          .map((s) => (
                            <SelectItem key={s.id} value={s.name} className="text-xs rounded-lg">
                              {s.name}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="price" className="text-xs font-bold text-foreground/80">Price (€) *</Label>
                    <Input
                      id="price"
                      type="number"
                      step="0.01"
                      min="0"
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      placeholder="0.00"
                      className="h-10 text-xs bg-background/50 focus-visible:ring-1 border-muted-foreground/20 rounded-lg"
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="oldPrice" className="text-xs font-bold text-foreground/80">Compare-At Price (€)</Label>
                    <Input
                      id="oldPrice"
                      type="number"
                      step="0.01"
                      min="0"
                      value={oldPrice}
                      onChange={(e) => setOldPrice(e.target.value)}
                      placeholder="Optional markup"
                      className="h-10 text-xs bg-background/50 focus-visible:ring-1 border-muted-foreground/20 rounded-lg"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="numberOfLights" className="text-xs font-bold text-foreground/80">Number of Lights</Label>
                    <Input
                      id="numberOfLights"
                      value={numberOfLights}
                      onChange={(e) => setNumberOfLights(e.target.value)}
                      placeholder="e.g. 1, 3, 5, etc."
                      list="lights-list"
                      className="h-10 text-xs bg-background/50 focus-visible:ring-1 border-muted-foreground/20 rounded-lg"
                    />
                    <datalist id="lights-list">
                      {["1", "2", "3", "4", "5", "6", "8", "10", "12", "15", "20"].map((num) => (
                        <option key={num} value={num} />
                      ))}
                    </datalist>
                  </div>
                  <div className="space-y-1.5 flex flex-col justify-end">
                    <div className="flex items-center justify-between rounded-lg border border-muted-foreground/20 bg-background/20 px-3.5 h-10">
                      <Label htmlFor="inStock" className="text-xs font-bold text-foreground/80 cursor-pointer">In Stock Status</Label>
                      <Switch id="inStock" checked={inStock} onCheckedChange={setInStock} />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                  <div className="flex items-center justify-between rounded-lg border border-muted-foreground/20 bg-background/20 px-3.5 h-10">
                    <Label htmlFor="isNewArrival" className="text-xs font-bold text-foreground/80 cursor-pointer">New Arrival</Label>
                    <Switch id="isNewArrival" checked={isNewArrival} onCheckedChange={setIsNewArrival} />
                  </div>
                  <div className="flex items-center justify-between rounded-lg border border-muted-foreground/20 bg-background/20 px-3.5 h-10">
                    <Label htmlFor="isBestSelling" className="text-xs font-bold text-foreground/80 cursor-pointer">Best Seller / Featured</Label>
                    <Switch id="isBestSelling" checked={isBestSelling} onCheckedChange={setIsBestSelling} />
                  </div>
                </div>

                <div className="space-y-1.5 pt-2">
                  <Label htmlFor="shortDescription" className="text-xs font-bold text-foreground/80">Basic Description</Label>
                  <RichTextEditor
                    value={shortDescription}
                    onChange={setShortDescription}
                    placeholder="Provide a brief summary of this product for top sections..."
                  />
                </div>
              </CardContent>
            </Card>

            {/* Description */}
            <Card className="border border-border/80 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.06)] bg-card/50 backdrop-blur-md rounded-2xl overflow-hidden hover:shadow-md transition-all duration-300">
              <CardHeader className="border-b pb-4 mb-4">
                <CardTitle className="text-lg font-bold flex items-center gap-2">Product Description</CardTitle>
                <CardDescription className="text-xs">Describe key aspects, dimensions, styles, and details of this light fixture.</CardDescription>
              </CardHeader>
              <CardContent className="prose-sm dark:prose-invert">
                <RichTextEditor
                  value={description}
                  onChange={setDescription}
                  placeholder="Tell your buyers more about this premium lighting fixture..."
                />
              </CardContent>
            </Card>

            {/* Media & Gallery (Combined Thumbnail & Gallery Images) */}
            <Card className="border border-border/80 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.06)] bg-card/50 backdrop-blur-md rounded-2xl overflow-hidden hover:shadow-md transition-all duration-300">
              <CardHeader className="border-b pb-4 mb-4">
                <CardTitle className="text-lg font-bold flex items-center gap-2">Media & Gallery</CardTitle>
                <CardDescription className="text-xs">Manage cover photo and additional slide images side-by-side.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Thumbnail / Cover Image */}
                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-foreground/80">Cover Image</Label>
                    <div
                      className="relative aspect-square w-full overflow-hidden rounded-2xl border-2 border-dashed border-muted-foreground/30 hover:border-primary bg-muted/40 backdrop-blur-sm flex items-center justify-center cursor-pointer group transition-all duration-300 hover:bg-muted/60"
                      onClick={() => thumbnailInputRef.current?.click()}
                    >
                      {thumbnail ? (
                        <>
                          <img src={thumbnail} alt="Thumbnail" className="h-full w-full object-cover rounded-2xl" />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-2xl">
                            <Upload className="h-5 w-5 text-white animate-bounce" />
                          </div>
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); setThumbnail(null); }}
                            className="absolute right-2 top-2 rounded-full bg-background/90 p-1 hover:bg-destructive hover:text-white shadow-sm border border-border z-10 transition-colors"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </>
                      ) : (
                        <div className="text-center text-muted-foreground p-3">
                          <Upload className="h-6 w-6 mx-auto mb-1 text-primary/80 opacity-60" />
                          <p className="text-[11px] font-semibold text-foreground/80">Upload Cover</p>
                          <p className="text-[9px] text-muted-foreground mt-0.5">PNG, JPG up to 5MB</p>
                        </div>
                      )}
                    </div>
                    <input ref={thumbnailInputRef} type="file" accept="image/*" className="hidden" onChange={handleThumbnailChange} />
                  </div>

                  {/* Slider Gallery Grid */}
                  <div className="md:col-span-2 space-y-2">
                    <div className="flex justify-between items-center">
                      <Label className="text-xs font-bold text-foreground/80">Gallery Images</Label>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-6 text-[10px] font-bold text-primary gap-1 px-2 hover:bg-primary/10 transition-colors"
                        onClick={() => galleryInputRef.current?.click()}
                      >
                        <Plus className="h-3 w-3" /> Add Images
                      </Button>
                    </div>

                    <input
                      ref={galleryInputRef}
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      onChange={handleGalleryChange}
                    />

                    {galleryImages.length === 0 ? (
                      <div
                        className="flex flex-col items-center justify-center border-2 border-dashed border-muted-foreground/30 rounded-2xl h-[120px] text-muted-foreground cursor-pointer hover:border-primary hover:bg-muted/20 transition-all duration-300"
                        onClick={() => galleryInputRef.current?.click()}
                      >
                        <ImageIcon className="h-6 w-6 mb-1 text-primary/70 opacity-40 animate-pulse" />
                        <p className="text-[11px] font-semibold text-foreground/80">No images added</p>
                        <p className="text-[9px] text-muted-foreground">Click to upload gallery pictures</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-3 gap-3">
                        {galleryImages.map((src, i) => (
                          <div key={i} className="group relative aspect-square rounded-xl border overflow-hidden bg-muted/50 shadow-sm hover:shadow transition-all duration-300">
                            <img src={src} alt={`Product ${i + 1}`} className="h-full w-full object-cover" />
                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1.5 p-1 rounded-xl">
                              <button
                                type="button"
                                onClick={() => setAsThumbnail(src)}
                                className="w-full text-[8px] font-bold text-white bg-primary/90 hover:bg-primary rounded-md py-1 transition-colors"
                              >
                                Set Cover
                              </button>
                              <button
                                type="button"
                                onClick={() => removeGalleryImage(i)}
                                className="absolute top-1 right-1 rounded-full bg-background/90 p-0.5 hover:bg-destructive hover:text-white transition-colors"
                              >
                                <X className="h-2.5 w-2.5" />
                              </button>
                            </div>
                            {thumbnail === src && (
                              <div className="absolute bottom-1 left-1 rounded-md text-[8px] font-extrabold bg-primary text-primary-foreground px-1 py-0.2 shadow-sm">
                                Cover
                              </div>
                            )}
                          </div>
                        ))}
                        <div
                          className="aspect-square rounded-xl border-2 border-dashed border-muted-foreground/30 flex flex-col items-center justify-center text-muted-foreground cursor-pointer hover:border-primary hover:bg-muted/30 transition-all duration-300"
                          onClick={() => galleryInputRef.current?.click()}
                        >
                          <Plus className="h-5 w-5 mb-0.5 opacity-45" />
                          <p className="text-[9px] font-semibold">Add</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Technical Specifications (Flat Array Editor) */}
            <Card className="border border-border/80 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.06)] bg-card/50 backdrop-blur-md rounded-2xl overflow-hidden hover:shadow-md transition-all duration-300">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 border-b pb-4 mb-4">
                <div>
                  <CardTitle className="text-lg font-bold flex items-center gap-2">Technical Specifications</CardTitle>
                  <CardDescription className="text-xs">
                    Manage specification parameters. Add parameters, set values, and optional links.
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Input 
                    placeholder="New Parameter Name" 
                    value={newParamName} 
                    onChange={e => setNewParamName(e.target.value)} 
                    className="h-8 text-xs w-48 bg-background/50 focus-visible:ring-1 border-muted-foreground/20 rounded-lg"
                    onKeyDown={e => e.key === "Enter" && (e.preventDefault(), handleAddItem())}
                  />
                  <Button type="button" size="sm" onClick={handleAddItem} className="h-8 px-3 rounded-lg text-xs gap-1 font-bold">
                    <Plus className="w-3.5 h-3.5" /> Add
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-6 pt-2">
                <div className="space-y-3">
                  {specs.length === 0 ? (
                    <p className="text-[11px] text-muted-foreground/60 italic pl-2 text-center py-4">No parameters added yet. Use the input above to add one.</p>
                  ) : (
                    <div className="grid grid-cols-1 gap-2.5">
                      {specs.map((item, index) => (
                        <div key={item.id} className="flex items-center gap-2 bg-muted/30 p-2.5 rounded-xl border border-muted-foreground/10 group/item hover:border-muted-foreground/30 hover:bg-muted/50 transition-all duration-300">
                          <div className="flex flex-col gap-1 w-8 shrink-0">
                            <button type="button" onClick={() => moveSpecItem(index, 'up')} disabled={index === 0} className="h-4 flex items-center justify-center text-muted-foreground hover:text-foreground disabled:opacity-30">▲</button>
                            <button type="button" onClick={() => moveSpecItem(index, 'down')} disabled={index === specs.length - 1} className="h-4 flex items-center justify-center text-muted-foreground hover:text-foreground disabled:opacity-30">▼</button>
                          </div>
                          
                          <div className="grid grid-cols-[1fr_1.5fr_1.5fr] gap-3 flex-grow items-center">
                            <div className="space-y-1">
                              <Label className="text-[10px] text-muted-foreground uppercase px-1">Name</Label>
                              <Input
                                value={item.key}
                                onChange={(e) => handleUpdateItemKey(item.id, e.target.value)}
                                placeholder="Param Name"
                                className="h-8 text-xs bg-background focus-visible:ring-1 border-muted-foreground/20 rounded-lg font-bold"
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-[10px] text-muted-foreground uppercase px-1">Value / Text</Label>
                              <Input
                                value={item.value}
                                onChange={(e) => handleUpdateItemValue(item.id, e.target.value)}
                                placeholder="Param Value (e.g. Download PDF)"
                                className="h-8 text-xs bg-background focus-visible:ring-1 border-muted-foreground/20 rounded-lg font-medium"
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-[10px] text-muted-foreground uppercase px-1">URL Link (Optional)</Label>
                              <Input
                                value={item.link || ""}
                                onChange={(e) => handleUpdateItemLink(item.id, e.target.value)}
                                placeholder="https://..."
                                className="h-8 text-xs bg-background focus-visible:ring-1 border-muted-foreground/20 rounded-lg text-primary"
                              />
                            </div>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            className="h-10 w-10 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg shrink-0 transition-colors ml-2"
                            onClick={() => handleDeleteItem(item.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* RIGHT COLUMN — Organisation, EAV Attributes & Sticky Action Panel (1/3 Width) */}
          <div className="space-y-8 lg:sticky lg:top-8">
            
            {/* Organisation & Category attributes */}
            <Card className="border border-border/80 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.06)] bg-card/50 backdrop-blur-md rounded-2xl overflow-hidden hover:shadow-md transition-all duration-300">
              <CardHeader className="border-b pb-4 mb-4">
                <CardTitle className="text-lg font-bold flex items-center gap-2">Category & Attributes</CardTitle>
                <CardDescription className="text-xs">Select primary category to display related search filters.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-foreground/80">Category Selection *</Label>
                  <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                    <SelectTrigger className="h-10 text-xs bg-background/50 border-muted-foreground/20 rounded-lg">
                      <SelectValue placeholder="Assign a category" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      {categoriesList.map((c) => (
                        <SelectItem key={c.slug} value={c.slug} className="text-xs rounded-lg">
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="pt-4 border-t border-muted-foreground/10 space-y-4">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Filtering Attributes (EAV)</h4>
                  {visibleAttributes.length > 0 ? (
                    <div className="space-y-4">
                      {visibleAttributes.map((attr) => {
                        const currentVals = selectedAttributeValues[attr.slug] || [];

                        return (
                          <div key={attr.id} className="space-y-2 pb-4 border-b border-muted-foreground/10 last:border-b-0 last:pb-0">
                            <div className="flex items-center justify-between">
                              <Label className="font-bold text-xs text-foreground/80 capitalize">{attr.name}</Label>
                              <span className="text-[9px] text-muted-foreground font-semibold uppercase bg-muted/80 px-2 py-0.5 rounded-full">
                                {attr.type}
                              </span>
                            </div>

                            {/* Boolean Field */}
                            {attr.type === "boolean" && (
                              <div className="flex items-center gap-3 pt-1">
                                <Switch
                                  id={`switch-${attr.slug}`}
                                  checked={currentVals[0] === "Yes"}
                                  onCheckedChange={(checked) => {
                                    setSelectedAttributeValues((prev) => ({
                                      ...prev,
                                      [attr.slug]: [checked ? "Yes" : "No"],
                                    }));
                                  }}
                                />
                                <Label htmlFor={`switch-${attr.slug}`} className="text-xs font-semibold text-foreground/80 cursor-pointer">
                                  {currentVals[0] === "Yes" ? "Yes" : "No"}
                                </Label>
                              </div>
                            )}

                            {/* Color/Light Color Swatches Selection */}
                            {attr.type === "color" && (
                              <div className="flex flex-wrap gap-2 pt-1.5">
                                {attr.values.map((v) => {
                                  const isChecked = currentVals.includes(v.value);
                                  return (
                                    <button
                                      key={v.id}
                                      type="button"
                                      className={`relative h-7 w-7 rounded-full border transition-all duration-300 ${
                                        isChecked
                                          ? "ring-2 ring-primary ring-offset-2 scale-110 shadow-sm"
                                          : "border-muted-foreground/20 hover:scale-105"
                                      }`}
                                      style={{ background: v.colorCode || "#cccccc" }}
                                      title={v.value}
                                      onClick={() => {
                                        const updated = isChecked ? [] : [v.value];
                                        setSelectedAttributeValues((prev) => ({
                                          ...prev,
                                          [attr.slug]: updated,
                                        }));
                                      }}
                                    >
                                      {isChecked && (
                                        <span className="absolute inset-0 flex items-center justify-center text-white text-[9px] font-extrabold drop-shadow-[0_1px_2px_rgba(0,0,0,0.95)]">
                                          ✓
                                        </span>
                                      )}
                                    </button>
                                  );
                                })}
                              </div>
                            )}

                            {/* Select Dropdown (Single option) */}
                            {attr.type === "select" && (
                              <Select
                                value={currentVals[0] || ""}
                                onValueChange={(val) => {
                                  setSelectedAttributeValues((prev) => ({
                                    ...prev,
                                    [attr.slug]: [val],
                                  }));
                                }}
                              >
                                <SelectTrigger className="h-9 text-xs bg-background/50 border-muted-foreground/20 rounded-lg">
                                  <SelectValue placeholder={`Select ${attr.name}`} />
                                </SelectTrigger>
                                <SelectContent className="rounded-xl">
                                  {attr.values.map((v) => (
                                    <SelectItem key={v.id} value={v.value} className="text-xs rounded-lg">
                                      <div className="flex items-center gap-2">
                                        {v.colorCode && (
                                          <span
                                            className="h-3 w-3 rounded-full border border-black/10 shadow-xs"
                                            style={{ background: v.colorCode }}
                                          />
                                        )}
                                        <span>{v.value}</span>
                                      </div>
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            )}

                            {/* Dimension Range Selector */}
                            {attr.type === "dimension" && (
                              <Select
                                value={currentVals[0] || ""}
                                onValueChange={(val) => {
                                    setSelectedAttributeValues((prev) => ({
                                      ...prev,
                                      [attr.slug]: [val],
                                    }));
                                }}
                              >
                                <SelectTrigger className="h-9 text-xs bg-background/50 border-muted-foreground/20 rounded-lg">
                                  <SelectValue placeholder={`Select ${attr.name}`} />
                                </SelectTrigger>
                                <SelectContent className="rounded-xl">
                                  {attr.values.map((v) => (
                                    <SelectItem key={v.id} value={v.value} className="text-xs rounded-lg">
                                      {v.value}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            )}

                            {/* Multi Select Checkbox Buttons */}
                            {attr.type === "multi_select" && (
                              <div className="flex flex-wrap gap-1.5 pt-1.5">
                                {attr.values.map((v) => {
                                  const isChecked = currentVals.includes(v.value);
                                  return (
                                    <Button
                                      key={v.id}
                                      type="button"
                                      variant={isChecked ? "default" : "outline"}
                                      size="sm"
                                      className="h-7 px-2.5 rounded-full text-[11px] gap-1.5 font-medium border-muted-foreground/25 hover:border-primary transition-colors"
                                      onClick={() => {
                                        const updated = isChecked
                                          ? currentVals.filter((cv) => cv !== v.value)
                                          : [...currentVals, v.value];
                                        setSelectedAttributeValues((prev) => ({
                                          ...prev,
                                          [attr.slug]: updated,
                                        }));
                                      }}
                                    >
                                      {v.colorCode && (
                                        <span
                                          className="h-1.5 w-1.5 rounded-full border border-black/10"
                                          style={{ background: v.colorCode }}
                                        />
                                      )}
                                      <span>{v.value}</span>
                                    </Button>
                                  );
                                })}
                              </div>
                            )}

                            {/* Range Slider / Text Input */}
                            {attr.type === "range" && (
                              <Input
                                value={currentVals[0] || ""}
                                onChange={(e) => {
                                  setSelectedAttributeValues((prev) => ({
                                    ...prev,
                                    [attr.slug]: [e.target.value],
                                  }));
                                }}
                                placeholder="e.g. 50cm, 10-100w"
                                className="h-9 text-xs bg-background/50 focus-visible:ring-1 border-muted-foreground/20 rounded-lg"
                              />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground py-2 text-center">
                      Select a category above to load filtering options.
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Actions Card */}
            <Card className="border border-border/80 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.06)] bg-card/50 backdrop-blur-md rounded-2xl p-6 space-y-3">
              <Button type="submit" className="w-full gap-2 h-10 text-xs font-bold rounded-lg shadow-sm hover:shadow transition-shadow duration-300">
                <Save className="h-4 w-4" />
                {isEdit ? "Save Changes" : "Create Product"}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="w-full h-10 text-xs font-bold rounded-lg border-muted-foreground/25 hover:bg-destructive/10 hover:text-destructive transition-all duration-300"
                onClick={() => navigate("/admin/products")}
              >
                Cancel
              </Button>
            </Card>

          </div>
        </div>
      </form>
    </div>
  );
};

export default AdminProductForm;
