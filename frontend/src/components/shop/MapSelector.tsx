import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, MapPin, Search, LocateFixed } from "lucide-react";

declare global {
  interface Window {
    google: any;
  }
}

const GOOGLE_MAPS_API_KEY = "AIzaSyAoVauo0szWOaKCsNW6lqklZCXmZED-7ZU";

let googleMapsLoadPromise: Promise<void> | null = null;

const loadGoogleMaps = (): Promise<void> => {
  if (window.google && window.google.maps) return Promise.resolve();
  if (googleMapsLoadPromise) return googleMapsLoadPromise;

  googleMapsLoadPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=places`;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Google Maps library"));
    document.head.appendChild(script);
  });

  return googleMapsLoadPromise;
};

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
    if (!mapRef.current) return;

    let cancelled = false;
    const containerEl = mapRef.current;
    let mapDiv: HTMLDivElement | null = null;

    const initMap = async () => {
      try {
        await loadGoogleMaps();
      } catch (e) {
        console.error("Failed to load Google Maps script:", e);
        return;
      }
      if (cancelled || !mapRef.current || !window.google) return;

      const innerDiv = document.createElement("div");
      innerDiv.style.width = "100%";
      innerDiv.style.height = "100%";
      containerEl.appendChild(innerDiv);
      mapDiv = innerDiv;

      const initialLat = 28.6139;
      const initialLng = 77.2090;

      try {
        mapInstance.current = new window.google.maps.Map(innerDiv, {
          center: { lat: initialLat, lng: initialLng },
          zoom: 13,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
        });

        markerInstance.current = new window.google.maps.Marker({
          position: { lat: initialLat, lng: initialLng },
          map: mapInstance.current,
          draggable: true,
        });

        mapInstance.current.addListener("click", (e: any) => {
          const latLng = e.latLng;
          if (markerInstance.current) {
            markerInstance.current.setPosition(latLng);
            setSelectedCoords({ lat: latLng.lat(), lng: latLng.lng() });
          }
        });

        markerInstance.current.addListener("dragend", () => {
          const position = markerInstance.current.getPosition();
          setSelectedCoords({ lat: position.lat(), lng: position.lng() });
        });

        // Set to current location if allowed
        if ("geolocation" in navigator) {
          navigator.geolocation.getCurrentPosition(
            (position) => {
              if (!mapInstance.current || !markerInstance.current || cancelled) return;
              const { latitude, longitude } = position.coords;
              const pos = { lat: latitude, lng: longitude };
              mapInstance.current.setCenter(pos);
              mapInstance.current.setZoom(15);
              markerInstance.current.setPosition(pos);
              setSelectedCoords(pos);
            },
            () => {
              setSelectedCoords({ lat: initialLat, lng: initialLng });
            }
          );
        } else {
          setSelectedCoords({ lat: initialLat, lng: initialLng });
        }
      } catch (e) {
        console.error("Failed to initialize Google Map:", e);
      }
    };

    initMap();

    return () => {
      cancelled = true;
      try {
        if (markerInstance.current) {
          markerInstance.current.setMap(null);
          markerInstance.current = null;
        }
        mapInstance.current = null;

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
        if (!window.google || !window.google.maps) {
          setSearchResults([]);
          setSearching(false);
          return;
        }
        const geocoder = new window.google.maps.Geocoder();
        geocoder.geocode({ address: q }, (results: any, status: any) => {
          if (status === "OK" && results) {
            setSearchResults(
              results.map((r: any) => ({
                place_id: r.place_id,
                display_name: r.formatted_address,
                lat: r.geometry.location.lat().toString(),
                lon: r.geometry.location.lng().toString(),
              }))
            );
          } else {
            setSearchResults([]);
          }
          setSearching(false);
        });
      } catch {
        setSearchResults([]);
        setSearching(false);
      }
    }, 400);
    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    };
  }, [searchQuery]);

  const goToLocation = (lat: number, lng: number) => {
    if (!mapInstance.current || !markerInstance.current) return;
    const pos = { lat, lng };
    mapInstance.current.setCenter(pos);
    mapInstance.current.setZoom(16);
    markerInstance.current.setPosition(pos);
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
      if (!window.google || !window.google.maps) {
        throw new Error("Google Maps not loaded");
      }
      const geocoder = new window.google.maps.Geocoder();
      
      geocoder.geocode(
        { location: { lat: selectedCoords.lat, lng: selectedCoords.lng } },
        (results: any, status: any) => {
          if (status === "OK" && results && results[0]) {
            const result = results[0];
            let street = "";
            let city = "";
            let state = "";
            let pincode = "";
            let country = "";

            // Parse address components
            for (const component of result.address_components) {
              const types = component.types;
              if (types.includes("route")) {
                street = component.long_name;
              } else if (types.includes("locality") || types.includes("postal_town")) {
                city = component.long_name;
              } else if (types.includes("administrative_area_level_1")) {
                state = component.long_name;
              } else if (types.includes("postal_code")) {
                pincode = component.long_name;
              } else if (types.includes("country")) {
                country = component.long_name;
              }
            }

            // Fallback for street if route is missing
            if (!street) {
              street = result.address_components.find((c: any) => c.types.includes("sublocality"))?.long_name || "";
            }
            // Fallback for city if locality is missing
            if (!city) {
              city = result.address_components.find((c: any) => c.types.includes("administrative_area_level_2"))?.long_name || "";
            }

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
            throw new Error(`Google reverse geocoding failed: ${status}`);
          }
          setLoading(false);
        }
      );
    } catch (error) {
      console.error("Geocoding error", error);
      // Fallback
      onSelect({
        lat: selectedCoords.lat.toFixed(6),
        lng: selectedCoords.lng.toFixed(6),
        street: "",
        city: "",
        state: "",
        pincode: "",
        country: "",
      });
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
