import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import createGlobe, { type Arc, type Marker } from "cobe";
import { Globe2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { COUNTRY_CENTROIDS } from "./countryCentroids";
import type { GeoRow } from "./VisitorGeoCards";

/** The shop ships from the Netherlands: visitor "signals" arc towards it */
const STORE_LOCATION: [number, number] = COUNTRY_CENTROIDS.NL;
const LIVE_COLOR: [number, number, number] = [0.13, 0.77, 0.37];
const RECENT_COLOR: [number, number, number] = [0.96, 0.62, 0.04];

/** cobe angles that put a longitude/latitude in front of the camera */
const facing = (lat: number, lng: number) => ({
  phi: Math.PI - ((lng * Math.PI) / 180 - Math.PI / 2),
  theta: (lat * Math.PI) / 360,
});

function useIsDark() {
  const [dark, setDark] = useState(() => document.documentElement.classList.contains("dark"));
  useEffect(() => {
    const obs = new MutationObserver(() => setDark(document.documentElement.classList.contains("dark")));
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => obs.disconnect();
  }, []);
  return dark;
}

const located = (rows: GeoRow[]) =>
  rows
    .map((r) => ({ ...r, at: COUNTRY_CENTROIDS[r.countryCode?.toUpperCase()] }))
    .filter((r): r is GeoRow & { at: [number, number] } => Boolean(r.at) && r.users > 0);

/**
 * Rotating globe: green points = visitors right now, amber = last 30 days; arcs run from the
 * countries visitors come from to the shop (live countries, or the top recent ones when nobody is online).
 */
export function VisitorGlobeCard({ live, recent }: { live: GeoRow[]; recent: GeoRow[] }) {
  const { t } = useTranslation();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDark = useIsDark();
  const [ready, setReady] = useState(false);
  const [unsupported, setUnsupported] = useState(false);
  const start = facing(STORE_LOCATION[0], STORE_LOCATION[1]);
  const phiRef = useRef(start.phi);
  const drag = useRef<{ x: number; phi: number } | null>(null);

  const liveRows = useMemo(() => located(live), [live]);
  const recentRows = useMemo(() => located(recent), [recent]);

  const { markers, arcs } = useMemo(() => {
    const max = Math.max(1, ...liveRows.map((r) => r.users), ...recentRows.map((r) => r.users));
    const size = (users: number) => 0.025 + 0.06 * Math.sqrt(users / max);
    const liveCodes = new Set(liveRows.map((r) => r.countryCode));
    const markers: Marker[] = [
      ...recentRows.filter((r) => !liveCodes.has(r.countryCode)).map((r) => ({ location: r.at, size: size(r.users), color: RECENT_COLOR })),
      ...liveRows.map((r) => ({ location: r.at, size: size(r.users) + 0.015, color: LIVE_COLOR })),
    ];
    const arcSource = liveRows.length ? liveRows : recentRows.slice(0, 6);
    const arcs: Arc[] = arcSource
      .filter((r) => r.countryCode !== "NL")
      .map((r) => ({ from: r.at, to: STORE_LOCATION, color: liveRows.length ? LIVE_COLOR : RECENT_COLOR }));
    return { markers, arcs };
  }, [liveRows, recentRows]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    let width = canvas.offsetWidth;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // cobe silently renders nothing without WebGL; probe on a throwaway canvas so the note can be shown
    const probe = document.createElement("canvas");
    if (!(probe.getContext("webgl2") || probe.getContext("webgl"))) {
      setUnsupported(true);
      return;
    }

    let globe: ReturnType<typeof createGlobe>;
    try {
      globe = createGlobe(canvas, {
      devicePixelRatio: dpr,
      width: width * dpr,
      height: width * dpr,
      phi: phiRef.current,
      theta: start.theta,
      dark: isDark ? 1 : 0,
      diffuse: 1.2,
      mapSamples: 16000,
      mapBrightness: isDark ? 4 : 6,
      baseColor: isDark ? [0.3, 0.3, 0.35] : [1, 1, 1],
      markerColor: RECENT_COLOR,
      glowColor: isDark ? [0.12, 0.12, 0.16] : [0.92, 0.92, 0.95],
      markers,
      arcs,
      arcColor: RECENT_COLOR,
      arcWidth: 0.6,
      arcHeight: 0.25,
      markerElevation: 0.01,
      });
    } catch (err) {
      // No WebGL (disabled GPU, old browser): keep the page working, show a note instead
      console.warn("Visitor globe unavailable:", err);
      setUnsupported(true);
      return;
    }

    let raf = 0;
    const tick = () => {
      if (!drag.current && !reduceMotion) phiRef.current += 0.0025;
      globe.update({ phi: phiRef.current });
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    const fadeIn = setTimeout(() => setReady(true), 50);

    const resize =
      typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(() => {
            width = canvas.offsetWidth;
            globe.update({ width: width * dpr, height: width * dpr });
          })
        : null;
    resize?.observe(canvas);

    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(fadeIn);
      resize?.disconnect();
      globe.destroy();
    };
  }, [markers, arcs, isDark]);

  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    drag.current = { x: e.clientX, phi: phiRef.current };
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (drag.current) phiRef.current = drag.current.phi + (e.clientX - drag.current.x) / 150;
  };
  const endDrag = () => {
    drag.current = null;
  };

  const liveTotal = live.reduce((s, r) => s + r.users, 0);
  const recentCountries = recent.filter((r) => r.countryCode && r.countryCode !== "(not set)").length;

  return (
    <Card className="overflow-hidden">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Globe2 className="h-5 w-5 text-emerald-500" />
          <CardTitle>{t("admin_analytics.geo.globe_title")}</CardTitle>
        </div>
        <CardDescription>{t("admin_analytics.geo.globe_desc")}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="relative mx-auto aspect-square w-full max-w-[460px]">
          {unsupported && (
            <p className="absolute inset-0 flex items-center justify-center text-center text-sm text-muted-foreground">
              {t("admin_analytics.geo.globe_unsupported")}
            </p>
          )}
          <canvas
            ref={canvasRef}
            className="h-full w-full cursor-grab touch-none transition-opacity duration-700 active:cursor-grabbing"
            style={{ opacity: ready ? 1 : 0, contain: "layout paint size" }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
            aria-label={t("admin_analytics.geo.globe_title")}
            role="img"
          />
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-center gap-x-5 gap-y-1 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
            {t("admin_analytics.geo.legend_live", { count: liveTotal })}
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
            {t("admin_analytics.geo.legend_recent", { count: recentCountries })}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
