import { useState, useEffect } from "react";
import { Package, Truck, Search, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { Order } from "./AdminOrders";

import { ordersRepository } from "@/client/apiClient";

export default function AdminReadyToShip() {
  const [search, setSearch] = useState("");
  const [ordersList, setOrdersList] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // Shipment Dialog states
  const [selectedOrderForShipment, setSelectedOrderForShipment] = useState<Order | null>(null);
  const [weight, setWeight] = useState<string>("1.5");
  const [length, setLength] = useState<string>("10");
  const [width, setWidth] = useState<string>("10");
  const [height, setHeight] = useState<string>("10");
  const [carrier, setCarrier] = useState<string>("");
  const [creatingShipment, setCreatingShipment] = useState(false);
  const [shippingMethods, setShippingMethods] = useState<any[]>([]);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const res = await ordersRepository.getAll();
      setOrdersList(res.data || []);
    } catch (err) {
      console.error("Failed to load orders", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const handleOpenShipmentModal = async (order: Order) => {
    setSelectedOrderForShipment(order);
    const estWeight = (order.items.reduce((sum, i) => sum + i.quantity, 0) * 1.5).toFixed(1);
    setWeight(estWeight);
    setLength("10");
    setWidth("10");
    setHeight("10");
    setCarrier("");
    // Fetch live Sendcloud shipping methods
    try {
      const res = await ordersRepository.getShippingMethods();
      if (res.success && res.data && res.data.shipping_methods) {
        setShippingMethods(res.data.shipping_methods);
        if (res.data.shipping_methods.length > 0) {
          setCarrier(res.data.shipping_methods[0].id.toString());
        }
      }
    } catch (err) {
      console.error("Failed to fetch Sendcloud shipping methods", err);
      toast.error("Failed to load shipping methods from Sendcloud");
    }
  };

  const handleCreateShipment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrderForShipment) return;

    try {
      setCreatingShipment(true);
      if (!carrier || isNaN(Number(carrier))) {
        toast.error("Please select a valid shipping method");
        return;
      }
      const res = await ordersRepository.createShipment(
        selectedOrderForShipment.id,
        parseFloat(weight),
        Number(carrier)
      );
      if (res.success) {
        toast.success(`Shipment created successfully for ${selectedOrderForShipment.orderNumber}!`);
        setSelectedOrderForShipment(null);
        await fetchOrders();
      } else {
        toast.error(res.message || "Failed to create shipment");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to create shipment");
    } finally {
      setCreatingShipment(false);
    }
  };

  // Filter ONLY orders with status "paid", "processing", or "ready_to_ship"
  const readyOrders = ordersList.filter((o) => ["paid", "processing", "ready_to_ship"].includes(o.status));

  const filtered = readyOrders.filter((o) =>
    o.orderNumber.toLowerCase().includes(search.toLowerCase()) ||
    o.customerName.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1">
        <h2 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
          <Package className="h-6 w-6 text-primary" />
          Ready To Ship Queue
        </h2>
        <p className="text-sm text-muted-foreground">
          Orders packed and waiting for Sendcloud shipment creation.
        </p>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by order or customer..."
          className="pl-10 h-10 text-xs bg-background/50 focus-visible:ring-1 border-muted-foreground/20 rounded-lg"
        />
      </div>

      <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-sm">
        <table className="w-full text-sm text-left border-collapse">
          <thead>
            <tr className="border-b bg-muted/40 text-muted-foreground font-medium text-xs">
              <th className="p-4">Order ID</th>
              <th className="p-4">Customer</th>
              <th className="p-4">Country</th>
              <th className="p-4">Weight (est.)</th>
              <th className="p-4">Total</th>
              <th className="p-4 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y text-xs">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-8 text-center text-muted-foreground">
                  No orders currently ready to ship.
                </td>
              </tr>
            ) : (
              filtered.map((o) => {
                // Determine country naively from string
                const country = o.shippingAddress.includes("Netherlands") ? "NL" : 
                                o.shippingAddress.includes("USA") ? "US" : "Other";
                
                // Estimate weight (1.5kg per item)
                const estWeight = (o.items.reduce((sum, i) => sum + i.quantity, 0) * 1.5).toFixed(1);

                return (
                  <tr key={o.id} className="hover:bg-muted/20 transition-colors">
                    <td className="p-4 font-mono font-bold text-foreground">{o.orderNumber}</td>
                    <td className="p-4 font-medium text-foreground">{o.customerName}</td>
                    <td className="p-4 text-muted-foreground">{country}</td>
                    <td className="p-4 text-muted-foreground">{estWeight} kg</td>
                    <td className="p-4 font-semibold text-foreground">€{o.total.toFixed(2)}</td>
                    <td className="p-4 text-right">
                      <Button
                        size="sm"
                        className="h-8 rounded-full shadow-sm text-xs gap-1"
                        onClick={() => handleOpenShipmentModal(o)}
                      >
                        <Truck className="h-3.5 w-3.5" />
                        Create Shipment
                      </Button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Enter Weight & Dimensions Dialog */}
      <Dialog open={!!selectedOrderForShipment} onOpenChange={(open) => !open && setSelectedOrderForShipment(null)}>
        <DialogContent className="sm:max-w-[500px] rounded-2xl p-6 bg-card border text-foreground shadow-2xl">
          <DialogHeader className="border-b pb-3">
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <Truck className="h-5 w-5 text-primary" /> Create Shipment
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Enter weight and box dimensions for order {selectedOrderForShipment?.orderNumber}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateShipment} className="space-y-4 pt-3">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="weight" className="text-xs font-semibold">Weight (kg)</Label>
                <Input
                  id="weight"
                  type="number"
                  step="0.1"
                  min="0.1"
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                  required
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="carrier" className="text-xs font-semibold">Carrier</Label>
                <Select value={carrier} onValueChange={setCarrier}>
                  <SelectTrigger className="h-9 text-xs rounded-lg">
                    <SelectValue placeholder={shippingMethods.length === 0 ? "Loading..." : "Select carrier"} />
                  </SelectTrigger>
                  <SelectContent>
                    {shippingMethods.length === 0 ? (
                      <SelectItem value="loading" disabled className="text-xs">Loading shipping methods...</SelectItem>
                    ) : (
                      shippingMethods.map(method => (
                        <SelectItem key={method.id} value={method.id.toString()} className="text-xs">
                          {method.name}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="border-t border-muted/50 pt-3">
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">Dimensions (cm)</p>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="length" className="text-[10px] text-muted-foreground">Length</Label>
                  <Input
                    id="length"
                    type="number"
                    min="1"
                    value={length}
                    onChange={(e) => setLength(e.target.value)}
                    required
                    className="h-8 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="width" className="text-[10px] text-muted-foreground">Width</Label>
                  <Input
                    id="width"
                    type="number"
                    min="1"
                    value={width}
                    onChange={(e) => setWidth(e.target.value)}
                    required
                    className="h-8 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="height" className="text-[10px] text-muted-foreground">Height</Label>
                  <Input
                    id="height"
                    type="number"
                    min="1"
                    value={height}
                    onChange={(e) => setHeight(e.target.value)}
                    required
                    className="h-8 text-xs"
                  />
                </div>
              </div>
            </div>

            <DialogFooter className="pt-4 border-t gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => setSelectedOrderForShipment(null)}
                className="rounded-full text-xs h-9"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={creatingShipment}
                className="rounded-full text-xs h-9 bg-primary text-primary-foreground hover:bg-primary/90 shadow-md gap-1.5"
              >
                {creatingShipment ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Truck className="h-3.5 w-3.5" />
                    Create Shipment
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

