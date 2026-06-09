import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Loader2, MapPin } from "lucide-react";

// Declare L as a global variable since we loaded Leaflet via CDN
declare global {
  interface Window {
    L: any;
  }
}

interface MapSelectorProps {
  onSelect: (location: {
    lat: string;
    lng: string;
    street: string;
    city: string;
    state: string;
    pincode: string;
    country: string;
  }) => void;
  onCancel: () => void;
}

export function MapSelector({ onSelect, onCancel }: MapSelectorProps) {
  const { t } = useTranslation();
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any>(null);
  const markerInstance = useRef<any>(null);
  const [loading, setLoading] = useState(false);
  const [selectedCoords, setSelectedCoords] = useState<{lat: number, lng: number} | null>(null);

  useEffect(() => {
    if (!mapRef.current || !window.L) return;

    // Default to New Delhi if location access fails or isn't requested
    const initialLat = 28.6139;
    const initialLng = 77.2090;

    mapInstance.current = window.L.map(mapRef.current).setView([initialLat, initialLng], 13);
    
    window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(mapInstance.current);

    markerInstance.current = window.L.marker([initialLat, initialLng], { draggable: true }).addTo(mapInstance.current);

    mapInstance.current.on('click', (e: any) => {
      const { lat, lng } = e.latlng;
      markerInstance.current.setLatLng([lat, lng]);
      setSelectedCoords({ lat, lng });
    });

    markerInstance.current.on('dragend', () => {
      const position = markerInstance.current.getLatLng();
      setSelectedCoords({ lat: position.lat, lng: position.lng });
    });

    // Try to get user's current location
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition((position) => {
        const { latitude, longitude } = position.coords;
        mapInstance.current.setView([latitude, longitude], 15);
        markerInstance.current.setLatLng([latitude, longitude]);
        setSelectedCoords({ lat: latitude, lng: longitude });
      });
    }

    return () => {
      if (mapInstance.current) {
        mapInstance.current.remove();
      }
    };
  }, []);

  const handleConfirm = async () => {
    if (!selectedCoords) return;
    
    setLoading(true);
    try {
      // Reverse Geocoding via Nominatim
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${selectedCoords.lat}&lon=${selectedCoords.lng}`);
      const data = await res.json();
      
      const addr = data.address || {};
      
      onSelect({
        lat: selectedCoords.lat.toFixed(6),
        lng: selectedCoords.lng.toFixed(6),
        street: addr.road || addr.suburb || "",
        city: addr.city || addr.town || addr.village || "",
        state: addr.state || "",
        pincode: addr.postcode || "",
        country: addr.country || ""
      });
    } catch (error) {
      console.error("Geocoding error", error);
      // Fallback
      onSelect({
        lat: selectedCoords.lat.toFixed(6),
        lng: selectedCoords.lng.toFixed(6),
        street: "", city: "", state: "", pincode: "", country: ""
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4">
      <div className="bg-card w-full max-w-3xl rounded-xl overflow-hidden flex flex-col shadow-2xl animate-in zoom-in-95 duration-200">
        <div className="p-4 border-b flex items-center justify-between bg-zinc-50">
          <h3 className="font-bold flex items-center gap-2"><MapPin size={18} className="text-primary"/> {t("map_selector.title")}</h3>
          <p className="text-xs text-muted-foreground">{t("map_selector.hint")}</p>
        </div>
        
        <div 
          ref={mapRef} 
          className="w-full h-[60vh] bg-zinc-200"
        />
        
        <div className="p-4 border-t flex justify-end gap-3 bg-zinc-50">
          <Button variant="outline" onClick={onCancel} className="rounded-full">{t("map_selector.cancel")}</Button>
          <Button onClick={handleConfirm} disabled={!selectedCoords || loading} className="rounded-full">
            {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : t("map_selector.confirm")}
          </Button>
        </div>
      </div>
    </div>
  );
}
