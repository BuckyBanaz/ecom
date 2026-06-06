import { useState, useEffect } from "react";
import { Plus, Pencil, Trash2, ShieldAlert, Percent, Coins, Check, X } from "lucide-react";
import { chargeRepository } from "@/client/apiClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAdmin } from "@/context/AdminContext";
import { toast } from "sonner";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

interface StoreCharge {
  id: string;
  name: string;
  type: string; // "percentage" | "flat"
  value: number;
  isActive: boolean;
  minFreeLimit: number;
  createdAt: string;
  updatedAt: string;
}

export default function AdminCharges() {
  const { hasPermission } = useAdmin();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editCharge, setEditCharge] = useState<StoreCharge | null>(null);
  const [chargesList, setChargesList] = useState<StoreCharge[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Form states
  const [name, setName] = useState("");
  const [type, setType] = useState("percentage");
  const [value, setValue] = useState(0);
  const [isActive, setIsActive] = useState(true);
  const [minFreeLimit, setMinFreeLimit] = useState(0);

  const fetchCharges = async () => {
    setIsLoading(true);
    try {
      const res = await chargeRepository.getAll();
      if (res.success && res.data) {
        setChargesList(res.data);
      } else {
        setChargesList([]);
      }
    } catch (err) {
      console.error("Failed to fetch charges:", err);
      toast.error("Failed to load store charges");
      setChargesList([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCharges();
  }, []);

  useEffect(() => {
    if (editCharge) {
      setName(editCharge.name);
      setType(editCharge.type);
      setValue(editCharge.value);
      setIsActive(editCharge.isActive);
      setMinFreeLimit(editCharge.minFreeLimit);
    } else {
      setName("");
      setType("percentage");
      setValue(0);
      setIsActive(true);
      setMinFreeLimit(0);
    }
  }, [editCharge, dialogOpen]);

  const handleSaveCharge = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast.error("Charge name is required (e.g. GST, Shipping)");
      return;
    }

    if (value < 0) {
      toast.error("Charge value cannot be negative");
      return;
    }

    const payload = {
      name: name.trim(),
      type,
      value: Number(value),
      isActive,
      minFreeLimit: Number(minFreeLimit),
    };

    try {
      const res = await chargeRepository.save(payload);
      if (res.success && res.data) {
        toast.success(`Charge "${payload.name}" saved successfully`);
        if (chargesList.some((c) => c.name.toLowerCase() === payload.name.toLowerCase())) {
          setChargesList((prev) =>
            prev.map((c) => (c.name.toLowerCase() === payload.name.toLowerCase() ? res.data : c))
          );
        } else {
          setChargesList((prev) => [...prev, res.data]);
        }
        setDialogOpen(false);
        setEditCharge(null);
      } else {
        toast.error(res.message || "Failed to save charge");
      }
    } catch (err: any) {
      console.error("Failed to save charge:", err);
      toast.error(err.message || "Error communicating with server to save charge");
    }
  };

  const handleDeleteCharge = async (id: string, chargeName: string) => {
    if (!hasPermission("charges")) {
      toast.error("Only admins can delete charges");
      return;
    }

    if (window.confirm(`Are you sure you want to delete charge "${chargeName}"?`)) {
      try {
        const res = await chargeRepository.delete(id);
        if (res.success) {
          toast.success(`Charge "${chargeName}" deleted successfully`);
          setChargesList((prev) => prev.filter((c) => c.id !== id));
        } else {
          toast.error("Failed to delete charge");
        }
      } catch (err: any) {
        console.error("Failed to delete charge:", err);
        toast.error(err.message || "Error communicating with server");
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <span />
        {hasPermission("charges") && (
          <Dialog open={dialogOpen} onOpenChange={(v) => { setDialogOpen(v); if (!v) setEditCharge(null); }}>
            <DialogTrigger asChild>
              <Button className="rounded-full gap-2 text-xs font-bold h-10 px-5 shadow-sm hover:shadow transition-shadow">
                <Plus className="h-4 w-4" /> Add Charge
              </Button>
            </DialogTrigger>
            <DialogContent className="rounded-2xl max-w-md">
              <DialogHeader>
                <DialogTitle className="text-lg font-bold">
                  {editCharge ? "Edit Charge Configuration" : "Add Store Charge"}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSaveCharge} className="space-y-4 mt-4">
                <div className="space-y-1.5">
                  <Label htmlFor="chargeName" className="text-xs font-bold text-foreground/80">Charge Name</Label>
                  <Input
                    id="chargeName"
                    placeholder="e.g. GST, Shipping Fee, Convenience Fee"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    disabled={!!editCharge}
                    className="h-10 text-xs bg-background/50 focus-visible:ring-1 border-muted-foreground/20 rounded-lg text-foreground"
                    required
                  />
                  {editCharge && (
                    <p className="text-[10px] text-muted-foreground font-semibold mt-0.5">
                      Name cannot be edited as it uniquely identifies the charge type.
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="chargeType" className="text-xs font-bold text-foreground/80">Charge Type</Label>
                    <Select value={type} onValueChange={setType}>
                      <SelectTrigger id="chargeType" className="h-10 text-xs bg-background/50 border-muted-foreground/20 rounded-lg">
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="percentage" className="text-xs">Percentage (%)</SelectItem>
                        <SelectItem value="flat" className="text-xs">Flat Value (€)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="chargeValue" className="text-xs font-bold text-foreground/80">Value</Label>
                    <Input
                      id="chargeValue"
                      type="number"
                      min="0"
                      step="any"
                      value={value}
                      onChange={(e) => setValue(Number(e.target.value))}
                      className="h-10 text-xs bg-background/50 focus-visible:ring-1 border-muted-foreground/20 rounded-lg"
                      required
                    />
                  </div>
                </div>

                {type === "flat" && (
                  <div className="space-y-1.5">
                    <Label htmlFor="minFreeLimit" className="text-xs font-bold text-foreground/80">Free Above Order Value (€)</Label>
                    <Input
                      id="minFreeLimit"
                      type="number"
                      min="0"
                      step="any"
                      value={minFreeLimit}
                      onChange={(e) => setMinFreeLimit(Number(e.target.value))}
                      placeholder="e.g. 1000 for free shipping"
                      className="h-10 text-xs bg-background/50 focus-visible:ring-1 border-muted-foreground/20 rounded-lg"
                    />
                    <p className="text-[10px] text-muted-foreground">
                      Set to 0 to always apply this charge regardless of order amount.
                    </p>
                  </div>
                )}

                <div className="flex items-center space-x-2 pt-2">
                  <input
                    type="checkbox"
                    id="chargeActive"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary accent-primary"
                  />
                  <Label htmlFor="chargeActive" className="text-xs cursor-pointer select-none font-bold text-foreground/80">
                    Apply this charge automatically during checkout
                  </Label>
                </div>

                <DialogFooter className="pt-2 gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setDialogOpen(false)}
                    className="h-9 text-xs rounded-lg font-bold"
                  >
                    Cancel
                  </Button>
                  <Button type="submit" className="h-9 text-xs rounded-lg font-bold">
                    {editCharge ? "Save Changes" : "Create Charge"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, idx) => (
            <div key={idx} className="bg-card/65 backdrop-blur-md p-5 border rounded-2xl shadow-sm space-y-4">
              <Skeleton className="h-6 w-24 rounded-md" />
              <Skeleton className="h-10 w-1/3" />
              <div className="flex justify-end gap-2 border-t pt-3">
                <Skeleton className="h-8 w-16 rounded-full" />
                <Skeleton className="h-8 w-16 rounded-full" />
              </div>
            </div>
          ))}
        </div>
      ) : chargesList.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 text-center bg-card/65 backdrop-blur-md border rounded-2xl shadow-sm">
          <div className="p-4 bg-primary/10 rounded-full text-primary mb-3">
            <Coins className="h-8 w-8" />
          </div>
          <h3 className="text-base font-bold text-foreground">No charges defined</h3>
          <p className="text-muted-foreground text-xs max-w-sm mt-1">
            Setup tax percentages (GST) or flat shipping rates to apply them during customer checkout.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {chargesList.map((charge) => (
            <div key={charge.id} className="group relative overflow-hidden rounded-2xl border bg-card/65 backdrop-blur-md p-5 transition-all duration-300 hover:shadow-md hover:border-muted-foreground/25 flex flex-col justify-between min-h-[180px]">
              <div className="space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-sm tracking-tight text-foreground/90 capitalize">
                      {charge.name}
                    </h3>
                    <p className="text-[10px] text-muted-foreground font-semibold mt-0.5 uppercase bg-muted/60 px-2 py-0.5 rounded-full inline-block">
                      {charge.type === "percentage" ? "Percentage" : "Flat Value"}
                    </p>
                  </div>
                  {charge.isActive ? (
                    <Badge className="bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full hover:bg-emerald-500/15">
                      Active
                    </Badge>
                  ) : (
                    <Badge className="bg-muted text-muted-foreground border text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full">
                      Inactive
                    </Badge>
                  )}
                </div>

                <div className="space-y-1">
                  <p className="text-2xl font-black text-foreground">
                    {charge.type === "percentage" ? `${charge.value}%` : `€${charge.value}`}
                  </p>
                  {charge.type === "flat" && charge.minFreeLimit > 0 && (
                    <p className="text-[11px] text-muted-foreground font-medium">
                      Free for orders above <strong className="text-foreground">€{charge.minFreeLimit}</strong>
                    </p>
                  )}
                </div>
              </div>

              <div className="absolute right-3 top-3 flex gap-1.5 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity duration-300">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 rounded-full bg-background/90 shadow-sm border border-border hover:bg-primary hover:text-primary-foreground transition-all"
                  onClick={() => {
                    setEditCharge(charge);
                    setDialogOpen(true);
                  }}
                  title="Edit Charge"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                {hasPermission("charges") && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 rounded-full bg-background/90 shadow-sm border border-border text-destructive hover:bg-destructive hover:text-white transition-all"
                    onClick={() => handleDeleteCharge(charge.id, charge.name)}
                    title="Delete Charge"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
