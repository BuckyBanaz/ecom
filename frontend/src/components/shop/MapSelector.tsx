import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, MapPin, Search, LocateFixed } from "lucide-react";

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

interface SearchResult {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
}

export function MapSelector({ onSelect, onCancel }: MapSelectorProps) {
  const { t } = useTranslation();
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any>(null);
  const markerInstance = useRef<any>(null);
  const [loading, setLoading] = useState(false);
  const [selectedCoords, setSelectedCoords] = useState<{ lat: number; lng: number } | null>(null);

  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!mapRef.current || !window.L) return;

    const containerEl = mapRef.current;
    
    // Create a completely isolated DOM tree for Leaflet
    // This prevents React from trying to reconcile Leaflet's DOM mutations
    const leafletContainer = document.createElement("div");
    leafletContainer.style.width = "100%";
    leafletContainer.style.height = "100%";
    leafletContainer.style.position = "relative";
    containerEl.appendChild(leafletContainer);

    // Store reference so cleanup can access it
    const leafletContainerRef = leafletContainer;

    const initialLat = 28.6139;
    const initialLng = 77.2090;

    try {
      mapInstance.current = window.L.map(leafletContainer).setView([initialLat, initialLng], 13);
      
      window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
      }).addTo(mapInstance.current);

      markerInstance.current = window.L.marker([initialLat, initialLng], { draggable: true }).addTo(mapInstance.current);

      mapInstance.current.on('click', (e: any) => {
        const { lat, lng } = e.latlng;
        if (markerInstance.current) {
          markerInstance.current.setLatLng([lat, lng]);
          setSelectedCoords({ lat, lng });
        }
      });

      markerInstance.current.on('dragend', () => {
        const position = markerInstance.current.getLatLng();
        setSelectedCoords({ lat: position.lat, lng: position.lng });
      });

      // Try to get user's current location
      if ("geolocation" in navigator) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            if (!mapInstance.current || !markerInstance.current) return;
            const { latitude, longitude } = position.coords;
            mapInstance.current.setView([latitude, longitude], 15);
            markerInstance.current.setLatLng([latitude, longitude]);
            setSelectedCoords({ lat: latitude, lng: longitude });
          },
          () => {
            // geolocation failed, use default (already set)
          }
        );
      }
    } catch (e) {
      console.error("Failed to initialize Leaflet map:", e);
    }

    return () => {
      try {
        // Completely remove Leaflet instance
        if (mapInstance.current) {
          // Leaflet's remove() also removes all children, so do it first
          mapInstance.current.remove();
          mapInstance.current = null;
        }
        markerInstance.current = null;

        // Then remove the container from React's tree
        // Use a try/catch in case Leaflet already removed it
        if (leafletContainerRef && leafletContainerRef.parentNode === containerEl) {
          try {
            containerEl.removeChild(leafletContainerRef);
          } catch (e) {
            // Container may have already been removed by Leaflet
            console.debug("Leaflet container already removed:", e);
          }
        }
      } catch (e) {
        console.error("Error during MapSelector cleanup:", e);
      }
    };
  }, []);

  // Debounced search
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    const q = searchQuery.trim();
    if (q.length < 3) {
      setSearchResults([]);
      setSearchOpen(false);
      return;
    }
    setSearching(true);
    setSearchOpen(true);
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const url = `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&limit=6&q=${encodeURIComponent(q)}`;
        const res = await fetch(url, { headers: { "Accept-Language": "en" } });
        const data = await res.json();
        setSearchResults(Array.isArray(data) ? data : []);
      } catch {
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    }, 400);
    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    };
  }, [searchQuery]);

  const goToLocation = (lat: number, lng: number) => {
    if (!mapInstance.current || !markerInstance.current) return;
    mapInstance.current.setView([lat, lng], 16);
    markerInstance.current.setLatLng([lat, lng]);
    setSelectedCoords({ lat, lng });
  };

  const handlePickResult = (r: SearchResult) => {
    const lat = parseFloat(r.lat);
    const lng = parseFloat(r.lon);
    if (!isFinite(lat) || !isFinite(lng)) return;
    goToLocation(lat, lng);
    setSearchQuery(r.display_name);
    setSearchOpen(false);
  };

  const handleUseMyLocation = () => {
    if (!("geolocation" in navigator)) return;
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        goToLocation(latitude, longitude);
      },
      () => {
        /* ignore */
      }
    );
  };

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
      <div className="bg-card w-full max-w-3xl rounded-xl flex flex-col shadow-2xl animate-in zoom-in-95 duration-200">
        <div className="p-4 border-b flex items-center justify-between bg-zinc-50">
          <h3 className="font-bold flex items-center gap-2"><MapPin size={18} className="text-primary"/> {t("map_selector.title")}</h3>
          <p className="text-xs text-muted-foreground">{t("map_selector.hint")}</p>
        </div>

        {/* Search bar */}
        <div className="p-3 border-b bg-white relative">
          <div className="flex gap-2 items-center">
            <div className="relative flex-1" id="search-input-container">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => searchResults.length > 0 && setSearchOpen(true)}
                placeholder={t("map_selector.search_placeholder")}
                className="pl-9 pr-9 h-10 rounded-full"
              />
              {searching && (
                <Loader2 size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground animate-spin" />
              )}
            </div>
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={handleUseMyLocation}
              title={t("map_selector.use_my_location")}
              className="rounded-full shrink-0"
            >
              <LocateFixed size={16} />
            </Button>
          </div>

          {searchOpen && (searchResults.length > 0 || (!searching && searchQuery.trim().length >= 3)) && (
            <div className="absolute left-3 right-3 mt-1 z-[9999] bg-white border rounded-lg shadow-xl max-h-64 overflow-y-auto top-full">
              {searchResults.length > 0 ? (
                searchResults.map((r) => (
                  <button
                    type="button"
                    key={r.place_id}
                    onClick={() => handlePickResult(r)}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-muted flex items-start gap-2 border-b last:border-b-0"
                  >
                    <MapPin size={14} className="text-primary mt-0.5 shrink-0" />
                    <span className="line-clamp-2">{r.display_name}</span>
                  </button>
                ))
              ) : (
                <div className="px-3 py-3 text-sm text-muted-foreground text-center">
                  {t("map_selector.no_results")}
                </div>
              )}
            </div>
          )}
        </div>

        <div 
          ref={mapRef} 
          className="w-full h-[55vh] bg-zinc-200"
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
