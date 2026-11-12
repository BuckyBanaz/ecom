import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, MapPin, Search, LocateFixed } from "lucide-react";
import { toast } from "sonner";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Custom pin marker for Google Map view
const googlePinIcon = L.divIcon({
  className: "custom-google-marker",
  html: `<div style="display:flex;align-items:center;justify-content:center;width:36px;height:36px;background:#EA4335;border-radius:50% 50% 50% 0;transform:rotate(-45deg);color:white;box-shadow:0 4px 12px rgba(0,0,0,0.4);border:2px solid #FFFFFF;">
          <div style="width:12px;height:12px;background:white;border-radius:50%;transform:rotate(45deg);"></div>
         </div>`,
  iconSize: [36, 36],
  iconAnchor: [18, 36],
});

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
  place_id: string;
  display_name: string;
  lat: string;
  lon: string;
}

export function MapSelector({ onSelect, onCancel }: MapSelectorProps) {
  const { t } = useTranslation();
  const mapRef = useRef<HTMLDivElement>(null);
  
  const leafletMapInstance = useRef<L.Map | null>(null);
  const leafletMarkerInstance = useRef<L.Marker | null>(null);

  const [loading, setLoading] = useState(false);
  const [locating, setLocating] = useState(false);
  const [selectedCoords, setSelectedCoords] = useState<{ lat: number; lng: number } | null>(null);

  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const initialLat = 52.3676;
  const initialLng = 4.9041;

  useEffect(() => {
    if (!mapRef.current) return;

    let cancelled = false;
    const containerEl = mapRef.current;
    let mapDiv: HTMLDivElement | null = null;

    const initMap = () => {
      if (cancelled || !mapRef.current) return;

      const innerDiv = document.createElement("div");
      innerDiv.style.width = "100%";
      innerDiv.style.height = "100%";
      containerEl.appendChild(innerDiv);
      mapDiv = innerDiv;

      try {
        const map = L.map(innerDiv, {
          zoomControl: true,
        }).setView([initialLat, initialLng], 14);

        leafletMapInstance.current = map;

        // Render Google Maps Roadmap Tiles
        L.tileLayer("https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}", {
          attribution: "&copy; Google Maps",
          maxZoom: 20,
          subdomains: ["mt0", "mt1", "mt2", "mt3"],
        }).addTo(map);

        const marker = L.marker([initialLat, initialLng], {
          draggable: true,
          icon: googlePinIcon,
        }).addTo(map);
        leafletMarkerInstance.current = marker;

        map.on("click", (e: L.LeafletMouseEvent) => {
          marker.setLatLng(e.latlng);
          setSelectedCoords({ lat: e.latlng.lat, lng: e.latlng.lng });
        });

        marker.on("dragend", () => {
          const pos = marker.getLatLng();
          setSelectedCoords({ lat: pos.lat, lng: pos.lng });
        });

        if ("geolocation" in navigator) {
          navigator.geolocation.getCurrentPosition(
            (position) => {
              if (cancelled) return;
              const { latitude, longitude } = position.coords;
              map.setView([latitude, longitude], 16);
              marker.setLatLng([latitude, longitude]);
              setSelectedCoords({ lat: latitude, lng: longitude });
            },
            () => setSelectedCoords({ lat: initialLat, lng: initialLng }),
            { enableHighAccuracy: false, timeout: 5000, maximumAge: 60000 }
          );
        } else {
          setSelectedCoords({ lat: initialLat, lng: initialLng });
        }
      } catch (err) {
        console.error("Failed to initialize Google Map:", err);
      }
    };

    initMap();

    return () => {
      cancelled = true;
      try {
        if (leafletMapInstance.current) {
          leafletMapInstance.current.remove();
          leafletMapInstance.current = null;
          leafletMarkerInstance.current = null;
        }

        if (mapDiv && mapDiv.parentNode === containerEl) {
          try {
            containerEl.removeChild(mapDiv);
          } catch (e) {
            console.debug("Map container already removed:", e);
          }
        }
      } catch (e) {
        console.error("Error during MapSelector cleanup:", e);
      }
    };
  }, []);

  // Search logic
  useEffect(() => {
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
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
        const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&limit=5`);
        if (res.ok) {
          const data = await res.json();
          setSearchResults(
            data.map((item: any) => ({
              place_id: String(item.place_id),
              display_name: item.display_name,
              lat: item.lat,
              lon: item.lon,
            }))
          );
        } else {
          setSearchResults([]);
        }
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
    const pos = { lat, lng };
    if (leafletMapInstance.current && leafletMarkerInstance.current) {
      leafletMapInstance.current.setView([lat, lng], 16);
      leafletMarkerInstance.current.setLatLng([lat, lng]);
    }
    setSelectedCoords(pos);
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
    if (!("geolocation" in navigator)) {
      toast.error("Geolocation is not supported by your browser");
      return;
    }
    setLocating(true);
    toast.info("Fetching your location...", { duration: 2000 });

    const processLocation = async (lat: number, lng: number) => {
      goToLocation(lat, lng);
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
        if (res.ok) {
          const data = await res.json();
          if (data.display_name) setSearchQuery(data.display_name);
        }
      } catch {
        /* ignore */
      } finally {
        setLocating(false);
        toast.success("Location set to your current position");
      }
    };

    const tryLowAccuracy = () => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          processLocation(position.coords.latitude, position.coords.longitude);
        },
        (err) => {
          setLocating(false);
          if (err.code === err.PERMISSION_DENIED) {
            toast.error("Location permission denied. Please enable location access in browser settings.");
          } else {
            toast.error("Unable to get current location. Please pick location manually on map.");
          }
        },
        { enableHighAccuracy: false, timeout: 6000, maximumAge: 30000 }
      );
    };

    navigator.geolocation.getCurrentPosition(
      (position) => {
        processLocation(position.coords.latitude, position.coords.longitude);
      },
      (err) => {
        if (err.code === err.TIMEOUT) {
          tryLowAccuracy();
        } else {
          setLocating(false);
          if (err.code === err.PERMISSION_DENIED) {
            toast.error("Location permission denied. Please enable location access in browser settings.");
          } else {
            toast.error("Unable to get current location. Please pick location manually on map.");
          }
        }
      },
      { enableHighAccuracy: true, timeout: 5000, maximumAge: 30000 }
    );
  };

  const handleConfirm = async () => {
    if (!selectedCoords) return;

    setLoading(true);
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${selectedCoords.lat}&lon=${selectedCoords.lng}`);
      if (res.ok) {
        const data = await res.json();
        const addr = data.address || {};
        const street = addr.road || addr.pedestrian || addr.suburb || "";
        const city = addr.city || addr.town || addr.village || addr.county || "";
        const state = addr.state || "";
        const pincode = addr.postcode || "";
        const country = addr.country || "";

        onSelect({
          lat: selectedCoords.lat.toFixed(6),
          lng: selectedCoords.lng.toFixed(6),
          street,
          city,
          state,
          pincode,
          country,
        });
      } else {
        throw new Error("Reverse geocode failed");
      }
    } catch (error) {
      console.error("Geocoding error", error);
      onSelect({
        lat: selectedCoords.lat.toFixed(6),
        lng: selectedCoords.lng.toFixed(6),
        street: "",
        city: "",
        state: "",
        pincode: "",
        country: "",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4">
      <div className="bg-card w-full max-w-3xl rounded-xl flex flex-col shadow-2xl animate-in zoom-in-95 duration-200 overflow-hidden">
        <div className="p-4 border-b flex items-center justify-between bg-zinc-50">
          <h3 className="font-bold flex items-center gap-2 text-zinc-900"><MapPin size={18} className="text-red-500"/> {t("map_selector.title")}</h3>
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
              disabled={locating}
              title={t("map_selector.use_my_location")}
              className="rounded-full shrink-0"
            >
              {locating ? <Loader2 size={16} className="animate-spin text-primary" /> : <LocateFixed size={16} />}
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
                    <MapPin size={14} className="text-red-500 mt-0.5 shrink-0" />
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
          className="relative w-full h-[55vh] bg-zinc-200"
        />
        
        <div className="p-4 border-t flex justify-end gap-3 bg-zinc-50">
          <Button variant="outline" onClick={onCancel} className="rounded-full">{t("map_selector.cancel")}</Button>
          <Button onClick={handleConfirm} disabled={!selectedCoords || loading} className="rounded-full bg-red-600 hover:bg-red-700 text-white">
            {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : t("map_selector.confirm")}
          </Button>
        </div>
      </div>
    </div>
  );
}
