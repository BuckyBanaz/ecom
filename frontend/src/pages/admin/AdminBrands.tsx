import { useState, useEffect } from "react";
import { Plus, Pencil, Trash2, Search, Building2, LayoutGrid } from "lucide-react";
import { brandRepository, seriesRepository } from "@/client/apiClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAdmin } from "@/context/AdminContext";
import { toast } from "sonner";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Brand, Series } from "@/data/brands";
import { Skeleton } from "@/components/ui/skeleton";
import { MediaLibraryDialog } from "@/components/admin/media/MediaLibraryDialog";
import { resolveImgUrl } from "@/utils/image";

const AdminBrands = () => {
  const { hasPermission } = useAdmin();
  
  // Brand states
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editBrand, setEditBrand] = useState<Brand | null>(null);
  const [brandsList, setBrandsList] = useState<Brand[]>([]);
  const [search, setSearch] = useState("");
  const [logoPreview, setLogoPreview] = useState<string>("");

  // Series states
  const [seriesDialogOpen, setSeriesDialogOpen] = useState(false);
  const [editSeries, setEditSeries] = useState<Series | null>(null);
  const [seriesList, setSeriesList] = useState<Series[]>([]);
  const [seriesSearch, setSeriesSearch] = useState("");
  const [seriesLogoPreview, setSeriesLogoPreview] = useState<string>("");
  const [selectedSeriesBrand, setSelectedSeriesBrand] = useState<string>("");
  const [isBrandMediaLibraryOpen, setIsBrandMediaLibraryOpen] = useState(false);
  const [isSeriesMediaLibraryOpen, setIsSeriesMediaLibraryOpen] = useState(false);
  
  // Loading state
  const [isLoading, setIsLoading] = useState(true);

  // Load brands and series
  useEffect(() => {
    const fetchBrandsAndSeries = async () => {
      setIsLoading(true);
      try {
        const brandData = await brandRepository.getAll();
        if (brandData.success && brandData.brands) {
          setBrandsList(brandData.brands);
        } else {
          setBrandsList([]);
        }
        
        const seriesData = await seriesRepository.getAll();
        if (seriesData.success && seriesData.series) {
          setSeriesList(seriesData.series);
        } else {
          setSeriesList([]);
        }
      } catch (err) {
        console.error("Failed to fetch brands and series:", err);
        toast.error("Failed to load data from server");
        setBrandsList([]);
        setSeriesList([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchBrandsAndSeries();
  }, []);

  // Sync logo preview for Brands
  useEffect(() => {
    if (editBrand) {
      setLogoPreview(editBrand.logo || "");
    } else {
      setLogoPreview("");
    }
  }, [editBrand, dialogOpen]);

  // Sync state for Series
  useEffect(() => {
    if (editSeries) {
      setSeriesLogoPreview(editSeries.logo || "");
      setSelectedSeriesBrand(editSeries.brandId);
    } else {
      setSeriesLogoPreview("");
      setSelectedSeriesBrand("");
    }
  }, [editSeries, seriesDialogOpen]);

  // Save Brand Handler
  const handleSaveBrand = async (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget as HTMLFormElement);
    const name = formData.get("name") as string;
    const logo = logoPreview || "/assets/brand-generic.png";

    if (!name.trim()) {
      toast.error("Brand name is required");
      return;
    }

    try {
      const data = editBrand 
        ? await brandRepository.update(editBrand.id, { name, logo })
        : await brandRepository.create({ name, logo });

      if (data.success && data.brand) {
        if (editBrand) {
          setBrandsList(prev => prev.map((b) => (b.id === editBrand.id ? data.brand : b)));
          toast.success(`Brand "${name}" updated successfully`);
        } else {
          setBrandsList(prev => [...prev, data.brand]);
          toast.success(`Brand "${name}" added successfully`);
        }
        setDialogOpen(false);
        setEditBrand(null);
      } else {
        toast.error("Failed to save brand");
      }
    } catch (err) {
      console.error("Failed to save brand via API:", err);
      toast.error("Error communicating with server to save brand");
    }
  };

  // Delete Brand Handler
  const handleDeleteBrand = async (id: string, name: string) => {
    if (!hasPermission("admin")) {
      toast.error("Only admins can delete brands");
      return;
    }

    if (window.confirm(`Are you sure you want to delete brand "${name}"?`)) {
      try {
        const data = await brandRepository.delete(id);
        if (data.success) {
          toast.success(`Brand "${name}" deleted`);
          setBrandsList(prev => prev.filter((b) => b.id !== id));
        } else {
          toast.error("Failed to delete brand");
        }
      } catch (err) {
        console.error("Failed to delete brand via API:", err);
        toast.error("Error communicating with server to delete brand");
      }
    }
  };

  // Save Series Handler
  const handleSaveSeries = async (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget as HTMLFormElement);
    const name = formData.get("seriesName") as string;
    const logo = seriesLogoPreview || "";
    const brandId = selectedSeriesBrand;

    if (!name.trim()) {
      toast.error("Series name is required");
      return;
    }
    if (!brandId) {
      toast.error("Please associate this series with a brand");
      return;
    }

    try {
      const data = editSeries
        ? await seriesRepository.update(editSeries.id, { name, brandId, logo })
        : await seriesRepository.create({ name, brandId, logo });

      if (data.success && data.series) {
        if (editSeries) {
          setSeriesList(prev => prev.map((s) => (s.id === editSeries.id ? data.series : s)));
          toast.success(`Series "${name}" updated successfully`);
        } else {
          setSeriesList(prev => [...prev, data.series]);
          toast.success(`Series "${name}" added successfully`);
        }
        setSeriesDialogOpen(false);
        setEditSeries(null);
      } else {
        toast.error("Failed to save series");
      }
    } catch (err) {
      console.error("Failed to save series via API:", err);
      toast.error("Error communicating with server to save series");
    }
  };

  // Delete Series Handler
  const handleDeleteSeries = async (id: string, name: string) => {
    if (!hasPermission("admin")) {
      toast.error("Only admins can delete series");
      return;
    }

    if (window.confirm(`Are you sure you want to delete series "${name}"?`)) {
      try {
        const data = await seriesRepository.delete(id);
        if (data.success) {
          toast.success(`Series "${name}" deleted`);
          setSeriesList(prev => prev.filter((s) => s.id !== id));
        } else {
          toast.error("Failed to delete series");
        }
      } catch (err) {
        console.error("Failed to delete series via API:", err);
        toast.error("Error communicating with server to delete series");
      }
    }
  };

  const filteredBrands = brandsList.filter((b) =>
    b.name.toLowerCase().includes(search.toLowerCase())
  );

  const filteredSeries = seriesList.filter((s) => {
    const brandName = brandsList.find((b) => b.id === s.brandId)?.name || "";
    return (
      s.name.toLowerCase().includes(seriesSearch.toLowerCase()) ||
      brandName.toLowerCase().includes(seriesSearch.toLowerCase())
    );
  });

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-card/40 backdrop-blur-md p-6 rounded-2xl border border-border/80 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.06)]">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">Brands & Series</h1>
          <p className="text-muted-foreground text-xs sm:text-sm font-medium mt-0.5">
            Manage catalog manufacturers, logos, and series collections
          </p>
        </div>
      </div>

      <Tabs defaultValue="brands" className="w-full">
        <TabsList className="bg-muted/60 p-1 rounded-xl mb-6 grid w-full max-w-[400px] grid-cols-2">
          <TabsTrigger value="brands" className="rounded-lg text-xs font-bold py-2">
            Brands ({brandsList.length})
          </TabsTrigger>
          <TabsTrigger value="series" className="rounded-lg text-xs font-bold py-2">
            Series & Collections ({seriesList.length})
          </TabsTrigger>
        </TabsList>

        {/* BRANDS TAB PANEL */}
        <TabsContent value="brands" className="space-y-6 focus-visible:outline-none">
          <div className="flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search brands by name..."
                className="pl-10 rounded-xl bg-background/50 h-10 text-xs focus-visible:ring-1 border-muted-foreground/20"
              />
            </div>
            {hasPermission("admin") && (
              <Dialog open={dialogOpen} onOpenChange={(v) => { setDialogOpen(v); if (!v) setEditBrand(null); }}>
                <DialogTrigger asChild>
                  <Button className="rounded-full gap-2 text-xs font-bold h-10 px-5 shadow-sm hover:shadow transition-shadow">
                    <Plus className="h-4 w-4" /> Add Brand
                  </Button>
                </DialogTrigger>
                <DialogContent className="rounded-2xl max-w-md">
                  <DialogHeader>
                    <DialogTitle className="text-lg font-bold">
                      {editBrand ? "Edit Brand Details" : "Add New Brand"}
                    </DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleSaveBrand} className="space-y-5 mt-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="name" className="text-xs font-bold text-foreground/80">Brand Name</Label>
                      <Input
                        id="name"
                        name="name"
                        defaultValue={editBrand?.name}
                        placeholder="e.g. Philips, Eglo"
                        className="h-10 text-xs bg-background/50 focus-visible:ring-1 border-muted-foreground/20 rounded-lg"
                        required
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold text-foreground/80">Brand Logo</Label>
                      <div className="flex items-center gap-4 mt-1 bg-muted/20 p-3 rounded-xl border border-muted-foreground/10">
                        {logoPreview ? (
                          <div className="flex h-16 w-16 items-center justify-center rounded-xl border bg-card p-1">
                            <img
                              src={resolveImgUrl(logoPreview)}
                              alt="Logo Preview"
                              className="max-h-full max-w-full object-contain"
                              onError={(e) => {
                                (e.target as HTMLElement).style.display = "none";
                              }}
                            />
                          </div>
                        ) : (
                          <div className="flex h-16 w-16 items-center justify-center rounded-xl border bg-muted">
                            <Building2 className="h-7 w-7 text-muted-foreground/60" />
                          </div>
                        )}
                        <div className="flex-1 space-y-1">
                          <Button type="button" variant="outline" className="w-full text-left justify-start" onClick={() => setIsBrandMediaLibraryOpen(true)}>
                            {logoPreview ? "Change Logo" : "Browse Media Storage"}
                          </Button>
                          <p className="text-[9px] text-muted-foreground">
                            Upload a png or jpg file.
                          </p>
                        </div>
                      </div>
                      <MediaLibraryDialog
                        open={isBrandMediaLibraryOpen}
                        onOpenChange={setIsBrandMediaLibraryOpen}
                        onSelect={(url) => {
                          setLogoPreview(url.startsWith("http") ? url : `http://localhost:5000${url}`);
                          setIsBrandMediaLibraryOpen(false);
                        }}
                      />
                    </div>

                    <div className="flex gap-2 justify-end pt-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => { setDialogOpen(false); setEditBrand(null); }}
                        className="h-9 text-xs rounded-lg font-bold"
                      >
                        Cancel
                      </Button>
                      <Button type="submit" className="h-9 text-xs rounded-lg font-bold">
                        {editBrand ? "Save Changes" : "Create Brand"}
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {isLoading ? (
              Array.from({ length: 8 }).map((_, idx) => (
                <div key={idx} className="group relative overflow-hidden rounded-2xl border bg-card/65 backdrop-blur-md p-5 transition-all duration-300">
                  <div className="flex flex-col items-center text-center space-y-4">
                    <Skeleton className="h-20 w-20 rounded-2xl shrink-0" />
                    <div className="space-y-1.5 flex flex-col items-center">
                      <Skeleton className="h-4 w-28" />
                      <Skeleton className="h-4.5 w-24 rounded-full" />
                    </div>
                  </div>
                </div>
              ))
            ) : (
              filteredBrands.map((b) => (
                <div key={b.id} className="group relative overflow-hidden rounded-2xl border bg-card/65 backdrop-blur-md p-5 transition-all duration-300 hover:shadow-md hover:border-muted-foreground/25">
                  <div className="flex flex-col items-center text-center space-y-4">
                    <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-muted/40 p-2 border border-border/80 group-hover:scale-105 transition-transform duration-300">
                      {b.logo ? (
                        <img src={resolveImgUrl(b.logo)} alt={b.name} className="max-h-full max-w-full object-contain" />
                      ) : (
                        <Building2 className="h-9 w-9 text-muted-foreground" />
                      )}
                    </div>
                    <div>
                      <h3 className="font-bold text-sm tracking-tight text-foreground/90">{b.name}</h3>
                      <p className="text-[10px] text-muted-foreground font-semibold mt-0.5 uppercase bg-muted/60 px-2 py-0.5 rounded-full">Catalog Brand</p>
                    </div>
                  </div>

                  <div className="absolute right-3 top-3 flex gap-1.5 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity duration-300">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 rounded-full bg-background/90 shadow-sm border border-border hover:bg-primary hover:text-primary-foreground transition-all"
                      onClick={() => { setEditBrand(b); setDialogOpen(true); }}
                      title="Edit Brand"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    {hasPermission("admin") && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 rounded-full bg-background/90 shadow-sm border border-border text-destructive hover:bg-destructive hover:text-white transition-all"
                        onClick={() => handleDeleteBrand(b.id, b.name)}
                        title="Delete Brand"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
              ))
            )}

            {!isLoading && filteredBrands.length === 0 && (
              <div className="col-span-full py-12 text-center text-muted-foreground text-xs font-semibold bg-muted/10 border rounded-2xl">
                No brands found matching your search.
              </div>
            )}
          </div>
        </TabsContent>

        {/* SERIES TAB PANEL */}
        <TabsContent value="series" className="space-y-6 focus-visible:outline-none">
          <div className="flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={seriesSearch}
                onChange={(e) => setSeriesSearch(e.target.value)}
                placeholder="Search series by name or brand..."
                className="pl-10 rounded-xl bg-background/50 h-10 text-xs focus-visible:ring-1 border-muted-foreground/20"
              />
            </div>
            {hasPermission("admin") && (
              <Dialog open={seriesDialogOpen} onOpenChange={(v) => { setSeriesDialogOpen(v); if (!v) setEditSeries(null); }}>
                <DialogTrigger asChild>
                  <Button className="rounded-full gap-2 text-xs font-bold h-10 px-5 shadow-sm hover:shadow transition-shadow">
                    <Plus className="h-4 w-4" /> Add Series
                  </Button>
                </DialogTrigger>
                <DialogContent className="rounded-2xl max-w-md">
                  <DialogHeader>
                    <DialogTitle className="text-lg font-bold">
                      {editSeries ? "Edit Series Details" : "Add New Series"}
                    </DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleSaveSeries} className="space-y-5 mt-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="seriesName" className="text-xs font-bold text-foreground/80">Series / Collection Name</Label>
                      <Input
                        id="seriesName"
                        name="seriesName"
                        defaultValue={editSeries?.name}
                        placeholder="e.g. Hue White and Color, Townshend"
                        className="h-10 text-xs bg-background/50 focus-visible:ring-1 border-muted-foreground/20 rounded-lg"
                        required
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold text-foreground/80">Associated Brand *</Label>
                      <Select value={selectedSeriesBrand} onValueChange={setSelectedSeriesBrand}>
                        <SelectTrigger className="h-10 text-xs bg-background/50 border-muted-foreground/20 rounded-lg">
                          <SelectValue placeholder="Associate with a brand" />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl">
                          {brandsList.map((b) => (
                            <SelectItem key={b.id} value={b.id} className="text-xs rounded-lg">
                              {b.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold text-foreground/80">Series Banner / Logo (Optional)</Label>
                      <div className="flex items-center gap-4 mt-1 bg-muted/20 p-3 rounded-xl border border-muted-foreground/10">
                        {seriesLogoPreview ? (
                          <div className="flex h-16 w-16 items-center justify-center rounded-xl border bg-card p-1">
                            <img
                              src={resolveImgUrl(seriesLogoPreview)}
                              alt="Series Logo Preview"
                              className="max-h-full max-w-full object-contain"
                            />
                          </div>
                        ) : (
                          <div className="flex h-16 w-16 items-center justify-center rounded-xl border bg-muted">
                            <LayoutGrid className="h-7 w-7 text-muted-foreground/60" />
                          </div>
                        )}
                        <div className="flex-1 space-y-1">
                          <Button type="button" variant="outline" className="w-full text-left justify-start" onClick={() => setIsSeriesMediaLibraryOpen(true)}>
                            {seriesLogoPreview ? "Change Logo" : "Browse Media Storage"}
                          </Button>
                        </div>
                      </div>
                      <MediaLibraryDialog
                        open={isSeriesMediaLibraryOpen}
                        onOpenChange={setIsSeriesMediaLibraryOpen}
                        onSelect={(url) => {
                          setSeriesLogoPreview(url.startsWith("http") ? url : `http://localhost:5000${url}`);
                          setIsSeriesMediaLibraryOpen(false);
                        }}
                      />
                    </div>

                    <div className="flex gap-2 justify-end pt-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => { setSeriesDialogOpen(false); setEditSeries(null); }}
                        className="h-9 text-xs rounded-lg font-bold"
                      >
                        Cancel
                      </Button>
                      <Button type="submit" className="h-9 text-xs rounded-lg font-bold">
                        {editSeries ? "Save Changes" : "Create Series"}
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {isLoading ? (
              Array.from({ length: 8 }).map((_, idx) => (
                <div key={idx} className="group relative overflow-hidden rounded-2xl border bg-card/65 backdrop-blur-md p-5 transition-all duration-300">
                  <div className="flex flex-col items-center text-center space-y-4">
                    <Skeleton className="h-20 w-20 rounded-2xl shrink-0" />
                    <div className="space-y-1.5 flex flex-col items-center">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-4.5 w-24 rounded-full" />
                    </div>
                  </div>
                </div>
              ))
            ) : (
              filteredSeries.map((s) => {
                const brandObj = brandsList.find((b) => b.id === s.brandId);
                return (
                  <div key={s.id} className="group relative overflow-hidden rounded-2xl border bg-card/65 backdrop-blur-md p-5 transition-all duration-300 hover:shadow-md hover:border-muted-foreground/25">
                    <div className="flex flex-col items-center text-center space-y-4">
                      <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-muted/40 p-2 border border-border/80 group-hover:scale-105 transition-transform duration-300">
                        {s.logo ? (
                          <img src={resolveImgUrl(s.logo)} alt={s.name} className="max-h-full max-w-full object-contain" />
                        ) : brandObj?.logo ? (
                          <img src={resolveImgUrl(brandObj.logo)} alt={brandObj.name} className="max-h-full max-w-full object-contain opacity-50 filter grayscale" />
                        ) : (
                          <LayoutGrid className="h-8 w-8 text-muted-foreground" />
                        )}
                      </div>
                      <div className="space-y-1.5">
                        <h3 className="font-bold text-sm tracking-tight text-foreground/90">{s.name}</h3>
                        <div className="flex flex-col items-center gap-1.5">
                          <span className="text-[9px] text-primary font-extrabold uppercase tracking-wider bg-primary/10 border border-primary/20 px-2.5 py-0.5 rounded-full">
                            {brandObj ? brandObj.name : "Unknown Brand"}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="absolute right-3 top-3 flex gap-1.5 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity duration-300">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 rounded-full bg-background/90 shadow-sm border border-border hover:bg-primary hover:text-primary-foreground transition-all"
                        onClick={() => { setEditSeries(s); setSeriesDialogOpen(true); }}
                        title="Edit Series"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      {hasPermission("admin") && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 rounded-full bg-background/90 shadow-sm border border-border text-destructive hover:bg-destructive hover:text-white transition-all"
                          onClick={() => handleDeleteSeries(s.id, s.name)}
                          title="Delete Series"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })
            )}

            {!isLoading && filteredSeries.length === 0 && (
              <div className="col-span-full py-12 text-center text-muted-foreground text-xs font-semibold bg-muted/10 border rounded-2xl">
                No series collections found. Click "Add Series" to create one.
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminBrands;
