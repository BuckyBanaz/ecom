import { useState, useEffect } from "react";
import { Plus, Pencil, Trash2, Search, Percent, Gift, Calendar, Check, X, RefreshCw } from "lucide-react";
import { couponRepository } from "@/client/apiClient";
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

interface Coupon {
  id: string;
  code: string;
  discountType: string; // "percentage" | "flat"
  value: number;
  minOrderValue: number;
  isActive: boolean;
  expiresAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export default function AdminOffers() {
  const { hasPermission } = useAdmin();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editCoupon, setEditCoupon] = useState<Coupon | null>(null);
  const [couponsList, setCouponsList] = useState<Coupon[]>([]);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  // Form states
  const [code, setCode] = useState("");
  const [discountType, setDiscountType] = useState("percentage");
  const [value, setValue] = useState(10);
  const [minOrderValue, setMinOrderValue] = useState(0);
  const [isActive, setIsActive] = useState(true);
  const [expiresAt, setExpiresAt] = useState("");

  const fetchCoupons = async () => {
    setIsLoading(true);
    try {
      const res = await couponRepository.getAll();
      if (res.success && res.data) {
        setCouponsList(res.data);
      } else {
        setCouponsList([]);
      }
    } catch (err) {
      console.error("Failed to fetch coupons:", err);
      toast.error("Failed to load coupons from server");
      setCouponsList([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCoupons();
  }, []);

  useEffect(() => {
    if (editCoupon) {
      setCode(editCoupon.code);
      setDiscountType(editCoupon.discountType);
      setValue(editCoupon.value);
      setMinOrderValue(editCoupon.minOrderValue);
      setIsActive(editCoupon.isActive);
      setExpiresAt(
        editCoupon.expiresAt
          ? new Date(editCoupon.expiresAt).toISOString().split("T")[0]
          : ""
      );
    } else {
      setCode("");
      setDiscountType("percentage");
      setValue(10);
      setMinOrderValue(0);
      setIsActive(true);
      setExpiresAt("");
    }
  }, [editCoupon, dialogOpen]);

  const handleGenerateCode = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let randomCode = "";
    for (let i = 0; i < 8; i++) {
      randomCode += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setCode(randomCode);
  };

  const handleSaveCoupon = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!code.trim()) {
      toast.error("Coupon code is required");
      return;
    }

    if (value <= 0) {
      toast.error("Discount value must be greater than 0");
      return;
    }

    const payload = {
      code: code.toUpperCase().trim(),
      discountType,
      value: Number(value),
      minOrderValue: Number(minOrderValue),
      isActive,
      expiresAt: expiresAt ? new Date(expiresAt).toISOString() : null,
    };

    try {
      const res = editCoupon
        ? await couponRepository.update(editCoupon.id, payload)
        : await couponRepository.create(payload);

      if (res.success && res.data) {
        if (editCoupon) {
          setCouponsList((prev) =>
            prev.map((c) => (c.id === editCoupon.id ? res.data : c))
          );
          toast.success(`Coupon "${payload.code}" updated successfully`);
        } else {
          setCouponsList((prev) => [...prev, res.data]);
          toast.success(`Coupon "${payload.code}" created successfully`);
        }
        setDialogOpen(false);
        setEditCoupon(null);
      } else {
        toast.error(res.message || "Failed to save coupon");
      }
    } catch (err: any) {
      console.error("Failed to save coupon:", err);
      toast.error(err.message || "Error communicating with server to save coupon");
    }
  };

  const handleDeleteCoupon = async (id: string, codeStr: string) => {
    if (!hasPermission("admin")) {
      toast.error("Only admins can delete coupons");
      return;
    }

    if (window.confirm(`Are you sure you want to delete coupon code "${codeStr}"?`)) {
      try {
        const res = await couponRepository.delete(id);
        if (res.success) {
          toast.success(`Coupon "${codeStr}" deleted`);
          setCouponsList((prev) => prev.filter((c) => c.id !== id));
        } else {
          toast.error("Failed to delete coupon");
        }
      } catch (err: any) {
        console.error("Failed to delete coupon:", err);
        toast.error(err.message || "Error communicating with server");
      }
    }
  };

  const filteredCoupons = couponsList.filter((c) =>
    c.code.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <span />
        {hasPermission("moderator") && (
          <Dialog open={dialogOpen} onOpenChange={(v) => { setDialogOpen(v); if (!v) setEditCoupon(null); }}>
            <DialogTrigger asChild>
              <Button className="rounded-full gap-2 text-xs font-bold h-10 px-5 shadow-sm hover:shadow transition-shadow">
                <Plus className="h-4 w-4" /> Add Coupon
              </Button>
            </DialogTrigger>
            <DialogContent className="rounded-2xl max-w-md">
              <DialogHeader>
                <DialogTitle className="text-lg font-bold">
                  {editCoupon ? "Edit Coupon Details" : "Create New Coupon"}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSaveCoupon} className="space-y-4 mt-4">
                <div className="space-y-1.5">
                  <Label htmlFor="code" className="text-xs font-bold text-foreground/80">Coupon Code</Label>
                  <div className="flex gap-2">
                    <Input
                      id="code"
                      placeholder="e.g. EXTRA20, WELCOME10"
                      value={code}
                      onChange={(e) => setCode(e.target.value.toUpperCase())}
                      className="h-10 text-xs font-mono uppercase tracking-widest bg-background/50 focus-visible:ring-1 border-muted-foreground/20 rounded-lg flex-1"
                      required
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleGenerateCode}
                      className="h-10 text-xs px-3 border-dashed gap-1 font-bold"
                    >
                      <RefreshCw className="h-3.5 w-3.5" /> Generate
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="discountType" className="text-xs font-bold text-foreground/80">Type</Label>
                    <Select value={discountType} onValueChange={setDiscountType}>
                      <SelectTrigger id="discountType" className="h-10 text-xs bg-background/50 border-muted-foreground/20 rounded-lg">
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="percentage" className="text-xs">Percentage (%)</SelectItem>
                        <SelectItem value="flat" className="text-xs">Flat Rate (€)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="value" className="text-xs font-bold text-foreground/80">Discount Value</Label>
                    <Input
                      id="value"
                      type="number"
                      min="0.01"
                      step="any"
                      value={value}
                      onChange={(e) => setValue(Number(e.target.value))}
                      placeholder="e.g. 10"
                      className="h-10 text-xs bg-background/50 focus-visible:ring-1 border-muted-foreground/20 rounded-lg"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="minOrderValue" className="text-xs font-bold text-foreground/80">Min. Order Value (€)</Label>
                    <Input
                      id="minOrderValue"
                      type="number"
                      min="0"
                      step="any"
                      value={minOrderValue}
                      onChange={(e) => setMinOrderValue(Number(e.target.value))}
                      placeholder="e.g. 499"
                      className="h-10 text-xs bg-background/50 focus-visible:ring-1 border-muted-foreground/20 rounded-lg"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="expiresAt" className="text-xs font-bold text-foreground/80">Expiry Date</Label>
                    <Input
                      id="expiresAt"
                      type="date"
                      value={expiresAt}
                      onChange={(e) => setExpiresAt(e.target.value)}
                      className="h-10 text-xs bg-background/50 focus-visible:ring-1 border-muted-foreground/20 rounded-lg"
                    />
                  </div>
                </div>

                <div className="flex items-center space-x-2 pt-2">
                  <input
                    type="checkbox"
                    id="isActive"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary accent-primary"
                  />
                  <Label htmlFor="isActive" className="text-xs cursor-pointer select-none font-bold text-foreground/80">
                    Make this coupon active immediately
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
                    {editCoupon ? "Save Changes" : "Create Coupon"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search coupon codes..."
            className="pl-10 rounded-xl bg-background/50 h-10 text-xs focus-visible:ring-1 border-muted-foreground/20"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, idx) => (
            <div key={idx} className="bg-card/65 backdrop-blur-md p-5 border rounded-2xl shadow-sm space-y-4">
              <div className="flex justify-between items-center">
                <Skeleton className="h-6 w-24 rounded-md" />
                <Skeleton className="h-5 w-16 rounded-full" />
              </div>
              <Skeleton className="h-8 w-1/2" />
              <div className="flex justify-end gap-2 border-t pt-3">
                <Skeleton className="h-8 w-16 rounded-full" />
                <Skeleton className="h-8 w-16 rounded-full" />
              </div>
            </div>
          ))}
        </div>
      ) : filteredCoupons.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 text-center bg-card/65 backdrop-blur-md border rounded-2xl shadow-sm">
          <div className="p-4 bg-primary/10 rounded-full text-primary mb-3">
            <Gift className="h-8 w-8" />
          </div>
          <h3 className="text-base font-bold text-foreground">No coupons found</h3>
          <p className="text-muted-foreground text-xs max-w-sm mt-1">
            Create discount coupon codes to reward users and drive sales.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredCoupons.map((coupon) => {
            const isExpired = coupon.expiresAt && new Date(coupon.expiresAt) < new Date();
            return (
              <div key={coupon.id} className="group relative overflow-hidden rounded-2xl border bg-card/65 backdrop-blur-md p-5 transition-all duration-300 hover:shadow-md hover:border-muted-foreground/25 flex flex-col justify-between min-h-[180px]">
                <div className="space-y-3">
                  <div className="flex justify-between items-start">
                    <h3 className="font-mono font-extrabold text-base tracking-wider uppercase text-primary">
                      {coupon.code}
                    </h3>
                    {coupon.isActive && !isExpired ? (
                      <Badge className="bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full hover:bg-emerald-500/15">
                        Active
                      </Badge>
                    ) : (
                      <Badge className="bg-red-500/10 text-red-600 border border-red-500/20 text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full hover:bg-red-500/15">
                        {isExpired ? "Expired" : "Inactive"}
                      </Badge>
                    )}
                  </div>

                  <div className="space-y-1">
                    <p className="text-2xl font-black text-foreground">
                      {coupon.discountType === "percentage" ? (
                        <span className="flex items-center gap-1">
                          {coupon.value}% <span className="text-xs text-muted-foreground font-semibold">Off</span>
                        </span>
                      ) : (
                        <span>€{coupon.value} <span className="text-xs text-muted-foreground font-semibold">Flat</span></span>
                      )}
                    </p>
                    <div className="flex flex-col text-[11px] text-muted-foreground font-medium gap-0.5">
                      <span>Min. Order Value: <strong className="text-foreground">€{coupon.minOrderValue}</strong></span>
                      {coupon.expiresAt ? (
                        <span className={isExpired ? "text-red-500 font-bold" : ""}>
                          Expires: <strong>{new Date(coupon.expiresAt).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })}</strong>
                        </span>
                      ) : (
                        <span>Expires: <strong>Never</strong></span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="absolute right-3 top-3 flex gap-1.5 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity duration-300">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 rounded-full bg-background/90 shadow-sm border border-border hover:bg-primary hover:text-primary-foreground transition-all"
                    onClick={() => {
                      setEditCoupon(coupon);
                      setDialogOpen(true);
                    }}
                    title="Edit Coupon"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  {hasPermission("admin") && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 rounded-full bg-background/90 shadow-sm border border-border text-destructive hover:bg-destructive hover:text-white transition-all"
                      onClick={() => handleDeleteCoupon(coupon.id, coupon.code)}
                      title="Delete Coupon"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
