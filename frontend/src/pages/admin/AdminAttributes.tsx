import { useState, useEffect } from "react";
import { Plus, Pencil, Trash2, Search, Sliders, ChevronDown, ChevronUp } from "lucide-react";
import { attributeRepository } from "@/client/apiClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAdmin } from "@/context/AdminContext";
import { toast } from "sonner";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import type { Attribute, AttributeType } from "@/data/attributes";
import { Skeleton } from "@/components/ui/skeleton";

const AdminAttributes = () => {
  const { hasPermission } = useAdmin();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editAttr, setEditAttr] = useState<Attribute | null>(null);
  const [attributesList, setAttributesList] = useState<Attribute[]>([]);
  const [search, setSearch] = useState("");
  const [expandedAttr, setExpandedAttr] = useState<string | null>(null);

  // Form states for creating/editing values list
  const [incomingValues, setIncomingValues] = useState<Array<{ value: string; colorCode?: string }>>([]);
  const [newValueInput, setNewValueInput] = useState("");
  const [newColorCode, setNewColorCode] = useState("#000000");
  const [selectedType, setSelectedType] = useState<AttributeType>("select");
  const [selectedVisibility, setSelectedVisibility] = useState<"admin" | "filter" | "both">("both");
  
  // Loading state
  const [isLoading, setIsLoading] = useState(true);

  // Load attributes
  useEffect(() => {
    const fetchAttributes = async () => {
      setIsLoading(true);
      try {
        const data = await attributeRepository.getAll();
        if (data.success && data.attributes) {
          // Map backend schema to frontend expectation
          const mapped = data.attributes.map((a: any) => ({
            id: a.id,
            name: a.name,
            slug: a.slug,
            type: a.type as AttributeType,
            values: a.attributeValues || [],
            visibility: a.visibility || "both",
          }));
          setAttributesList(mapped);
        } else {
          setAttributesList([]);
        }
      } catch (e) {
        console.error("Failed to fetch attributes:", e);
        toast.error("Failed to load attributes from server");
        setAttributesList([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAttributes();
  }, []);

  // Sync edit values with state
  useEffect(() => {
    if (editAttr) {
      setIncomingValues(editAttr.values.map((v) => ({ value: v.value, colorCode: v.colorCode })));
      setSelectedType(editAttr.type);
      setSelectedVisibility(editAttr.visibility || "both");
    } else {
      setIncomingValues([]);
      setSelectedType("select");
      setSelectedVisibility("both");
    }
    setNewValueInput("");
    setNewColorCode("#000000");
  }, [editAttr, dialogOpen]);

  const handleAddValueItem = () => {
    if (!newValueInput.trim()) return;
    const exists = incomingValues.some((v) => v.value.toLowerCase() === newValueInput.trim().toLowerCase());
    if (exists) {
      toast.error("Value option already exists in this list");
      return;
    }
    
    setIncomingValues([
      ...incomingValues,
      {
        value: newValueInput.trim(),
        colorCode: selectedType === "color" ? newColorCode : undefined,
      },
    ]);
    setNewValueInput("");
    setNewColorCode("#000000");
  };

  const handleRemoveValueItem = (index: number) => {
    setIncomingValues(incomingValues.filter((_, idx) => idx !== index));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget as HTMLFormElement);
    const name = formData.get("name") as string;
    const slug = formData.get("slug") as string;
    const type = selectedType;
    const visibility = selectedVisibility;

    if (!name.trim() || !slug.trim()) {
      toast.error("All fields are required");
      return;
    }

    // Set default value options for Boolean type
    const finalValues = type === "boolean" 
      ? [{ value: "Yes" }, { value: "No" }] 
      : incomingValues;

    try {
      const data = editAttr
        ? await attributeRepository.update(editAttr.id, { name, slug, type, values: finalValues, visibility })
        : await attributeRepository.create({ name, slug, type, values: finalValues, visibility });

      if (data.success && data.attribute) {
        const mappedAttr: Attribute = {
          id: data.attribute.id,
          name: data.attribute.name,
          slug: data.attribute.slug,
          type: data.attribute.type as AttributeType,
          values: data.attribute.attributeValues || [],
          visibility: data.attribute.visibility || "both",
        };

        if (editAttr) {
          setAttributesList(prev => prev.map((a) => (a.id === editAttr.id ? mappedAttr : a)));
          toast.success(`Attribute "${name}" updated`);
        } else {
          setAttributesList(prev => [...prev, mappedAttr]);
          toast.success(`Attribute "${name}" created`);
        }

        setDialogOpen(false);
        setEditAttr(null);
      } else {
        toast.error("Failed to save attribute");
      }
    } catch (err) {
      console.error("Failed to save attribute via API:", err);
      toast.error("Error communicating with server to save attribute");
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!hasPermission("admin")) {
      toast.error("Only admins can delete attributes");
      return;
    }

    if (window.confirm(`Are you sure you want to delete attribute "${name}"? All product mappings will be cleared.`)) {
      try {
        const data = await attributeRepository.delete(id);
        if (data.success) {
          toast.success(`Attribute "${name}" deleted`);
          setAttributesList(prev => prev.filter((a) => a.id !== id));
        } else {
          toast.error("Failed to delete attribute");
        }
      } catch (err) {
        console.error("Failed to delete attribute via API:", err);
        toast.error("Error communicating with server to delete attribute");
      }
    }
  };

  const filteredAttrs = attributesList.filter((a) =>
    a.name.toLowerCase().includes(search.toLowerCase()) ||
    a.slug.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Attributes (EAV)</h1>
          <p className="text-muted-foreground">Manage dynamic catalog attributes, types, and values</p>
        </div>
        {hasPermission("admin") && (
          <Dialog open={dialogOpen} onOpenChange={(v) => { setDialogOpen(v); if (!v) setEditAttr(null); }}>
            <DialogTrigger asChild>
              <Button className="rounded-full gap-2">
                <Plus className="h-4 w-4" /> Add Attribute
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>{editAttr ? "Edit Attribute" : "Add New Attribute"}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSave} className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Attribute Name</Label>
                  <Input
                    id="name"
                    name="name"
                    defaultValue={editAttr?.name}
                    placeholder="e.g. Fitting, Finish"
                    onChange={(e) => {
                      if (!editAttr) {
                        const slugEl = document.getElementById("slug") as HTMLInputElement;
                        if (slugEl) {
                          slugEl.value = e.target.value
                            .toLowerCase()
                            .replace(/[^a-z0-9]+/g, "-")
                            .replace(/(^-|-$)+/g, "");
                        }
                      }
                    }}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="slug">Slug</Label>
                  <Input id="slug" name="slug" defaultValue={editAttr?.slug} placeholder="e.g. fitting, finish" required />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="type">Validation Type</Label>
                  <select
                    id="type"
                    name="type"
                    value={selectedType}
                    onChange={(e) => setSelectedType(e.target.value as AttributeType)}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  >
                    <option value="select">Dropdown Select (Single value)</option>
                    <option value="multi_select">Multi-Select Checkboxes (Multiple values)</option>
                    <option value="boolean">Boolean Switch (Yes/No)</option>
                    <option value="range">Range slider</option>
                    <option value="color">Color Swatches Selection</option>
                    <option value="dimension">Numeric Dimensions (Length/Width/Height/Diameter)</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <Label>Visibility Target</Label>
                  <div className="flex gap-4 items-center bg-background/50 border border-muted-foreground/20 rounded-lg p-2.5">
                    <label className="flex items-center gap-1.5 text-xs font-medium cursor-pointer">
                      <input
                        type="radio"
                        name="visibility"
                        value="both"
                        checked={selectedVisibility === "both"}
                        onChange={() => setSelectedVisibility("both")}
                        className="accent-primary h-3.5 w-3.5"
                      />
                      <span>Both</span>
                    </label>
                    <label className="flex items-center gap-1.5 text-xs font-medium cursor-pointer">
                      <input
                        type="radio"
                        name="visibility"
                        value="admin"
                        checked={selectedVisibility === "admin"}
                        onChange={() => setSelectedVisibility("admin")}
                        className="accent-primary h-3.5 w-3.5"
                      />
                      <span>Admin Only</span>
                    </label>
                    <label className="flex items-center gap-1.5 text-xs font-medium cursor-pointer">
                      <input
                        type="radio"
                        name="visibility"
                        value="filter"
                        checked={selectedVisibility === "filter"}
                        onChange={() => setSelectedVisibility("filter")}
                        className="accent-primary h-3.5 w-3.5"
                      />
                      <span>Filter Only</span>
                    </label>
                  </div>
                </div>

                {/* Values Builder (Hidden for Boolean Yes/No attributes) */}
                {selectedType !== "boolean" && (
                  <div className="border rounded-lg p-3 space-y-3">
                    <Label className="font-semibold text-sm">Value Options</Label>
                    
                    {/* Option Add Form */}
                    <div className="flex flex-wrap gap-2 items-end">
                      <div className="flex-1 min-w-[150px]">
                        <Label htmlFor="optionName" className="text-xs text-muted-foreground">Option Value</Label>
                        <Input
                          id="optionName"
                          value={newValueInput}
                          onChange={(e) => setNewValueInput(e.target.value)}
                          placeholder="e.g. E27, Brass"
                          className="h-8"
                        />
                      </div>

                      {/* Color hex picker ONLY visible for color attributes */}
                      {selectedType === "color" && (
                        <div className="flex flex-col gap-1">
                          <Label htmlFor="colorHex" className="text-xs text-muted-foreground">Swatch Color</Label>
                          <div className="flex items-center gap-1.5">
                            <Input
                              id="colorHex"
                              type="color"
                              value={newColorCode}
                              onChange={(e) => setNewColorCode(e.target.value)}
                              className="h-8 w-10 p-0 border cursor-pointer"
                            />
                            <span className="text-xs font-mono">{newColorCode.toUpperCase()}</span>
                          </div>
                        </div>
                      )}

                      <Button type="button" onClick={handleAddValueItem} size="sm" className="h-8">
                        Add Option
                      </Button>
                    </div>

                    {/* Options List */}
                    <div className="max-h-36 overflow-y-auto space-y-1.5 mt-2 pr-1">
                      {incomingValues.map((v, index) => (
                        <div key={index} className="flex items-center justify-between bg-muted/50 rounded px-2.5 py-1 text-xs border">
                          <div className="flex items-center gap-2">
                            {selectedType === "color" && v.colorCode && (
                              <span
                                className="h-3 w-3 rounded-full border border-black/10"
                                style={{ backgroundColor: v.colorCode }}
                              />
                            )}
                            <span className="font-medium">{v.value}</span>
                            {selectedType === "color" && v.colorCode && <span className="text-[10px] text-muted-foreground">({v.colorCode})</span>}
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRemoveValueItem(index)}
                            className="h-5 w-5 hover:bg-destructive/10 hover:text-destructive text-muted-foreground"
                          >
                            ✕
                          </Button>
                        </div>
                      ))}
                      {incomingValues.length === 0 && (
                        <p className="text-xs text-muted-foreground text-center py-4">No value options added yet.</p>
                      )}
                    </div>
                  </div>
                )}

                <div className="flex gap-2 justify-end pt-2">
                  <Button type="button" variant="outline" onClick={() => { setDialogOpen(false); setEditAttr(null); }}>
                    Cancel
                  </Button>
                  <Button type="submit">
                    {editAttr ? "Save Changes" : "Create Attribute"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search attributes by name or slug..."
          className="pl-10 rounded-xl"
        />
      </div>

      <div className="space-y-4">
        {isLoading ? (
          Array.from({ length: 5 }).map((_, idx) => (
            <div key={idx} className="rounded-xl border bg-card shadow-sm p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Skeleton className="h-10 w-10 rounded-lg shrink-0" />
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3.5 w-16" />
                  </div>
                  <Skeleton className="h-3 w-64" />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Skeleton className="h-8 w-8 rounded-lg" />
                <Skeleton className="h-8 w-8 rounded-lg" />
                <Skeleton className="h-8 w-8 rounded-lg" />
              </div>
            </div>
          ))
        ) : (
          filteredAttrs.map((a) => {
            const isExpanded = expandedAttr === a.id;
            return (
              <div key={a.id} className="rounded-xl border bg-card shadow-sm overflow-hidden transition-all">
                <div
                  className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/10"
                  onClick={() => setExpandedAttr(isExpanded ? null : a.id)}
                >
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 flex items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Sliders className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-base">{a.name}</h3>
                        <span className="text-xs font-mono bg-muted px-2 py-0.5 rounded text-muted-foreground">{a.slug}</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Type: <span className="capitalize">{a.type.replace("_", " ")}</span> · Target: <span className="capitalize font-semibold text-primary">{a.visibility || "both"}</span> · {a.type === "boolean" ? 2 : a.values.length} option values
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => { setEditAttr(a); setDialogOpen(true); }}
                    >
                      <Pencil className="h-4 w-4 text-muted-foreground" />
                    </Button>
                    {hasPermission("admin") && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:bg-destructive/10"
                        onClick={() => handleDelete(a.id, a.name)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => setExpandedAttr(isExpanded ? null : a.id)}
                    >
                      {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>

                {isExpanded && (
                  <div className="border-t bg-muted/20 px-6 py-4">
                    <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Available Value Options</Label>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {a.type === "boolean" ? (
                        <>
                          <span className="inline-flex items-center gap-2 rounded-full border bg-background px-3 py-1 text-xs font-medium text-foreground shadow-sm">Yes</span>
                          <span className="inline-flex items-center gap-2 rounded-full border bg-background px-3 py-1 text-xs font-medium text-foreground shadow-sm">No</span>
                        </>
                      ) : (
                        a.values.map((val) => (
                          <span
                            key={val.id}
                            className="inline-flex items-center gap-2 rounded-full border bg-background px-3 py-1 text-xs font-medium text-foreground shadow-sm"
                          >
                            {a.type === "color" && val.colorCode && (
                              <span
                                className="h-3.5 w-3.5 rounded-full border border-black/10 shadow-sm"
                                style={{ backgroundColor: val.colorCode }}
                              />
                            )}
                            {val.value}
                          </span>
                        ))
                      )}
                      {a.type !== "boolean" && a.values.length === 0 && (
                        <p className="text-xs text-muted-foreground italic">No value options defined for this attribute.</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}

        {!isLoading && filteredAttrs.length === 0 && (
          <div className="py-12 text-center text-muted-foreground">
            No attributes found matching your search.
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminAttributes;
