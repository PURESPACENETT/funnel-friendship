import { useEffect, useMemo, useRef, useState } from "react";

export interface MapPin {
  id: string;
  name: string;
  city: string | null;
  postalCode: string | null;
  latitude: number;
  longitude: number;
  contacted: boolean;
  selected: boolean;
}

interface Props {
  pins: MapPin[];
  center: { latitude: number; longitude: number } | null;
  radiusKm: number;
  onSelect: (id: string) => void;
}

const BROWSER_KEY = import.meta.env["VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_BROWSER_KEY"] as
  | string
  | undefined;
const CHANNEL = import.meta.env["VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_TRACKING_ID"] as
  | string
  | undefined;

const CALLBACK = "__pureSpaceMapsReady";

let loader: Promise<void> | null = null;

function loadMaps(): Promise<void> {
  if (typeof window === "undefined") return Promise.reject(new Error("no window"));
  const w = window as unknown as Record<string, unknown> & { google?: { maps?: unknown } };
  if (w.google?.maps) return Promise.resolve();
  if (loader) return loader;
  loader = new Promise<void>((resolve, reject) => {
    if (!BROWSER_KEY) {
      reject(new Error("missing key"));
      return;
    }
    w[CALLBACK] = () => resolve();
    const url = new URL("https://maps.googleapis.com/maps/api/js");
    url.searchParams.set("key", BROWSER_KEY);
    url.searchParams.set("loading", "async");
    url.searchParams.set("callback", CALLBACK);
    url.searchParams.set("language", "fr");
    url.searchParams.set("region", "FR");
    if (CHANNEL) url.searchParams.set("channel", CHANNEL);
    const script = document.createElement("script");
    script.src = url.toString();
    script.async = true;
    script.onerror = () => reject(new Error("script error"));
    document.head.appendChild(script);
  });
  return loader;
}


function cssColor(name: string, fallback: string): string {
  if (typeof window === "undefined") return fallback;
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return value || fallback;
}

/** Interactive map of the prospects found, centred on the searched town. */
export default function ProspectMap({ pins, center, radiusKm, onSelect }: Props) {
  const nodeRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const circleRef = useRef<any>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");

  const fallbackCenter = useMemo(() => {
    if (center) return center;
    if (pins.length > 0) {
      return { latitude: pins[0]!.latitude, longitude: pins[0]!.longitude };
    }
    return { latitude: 48.8869, longitude: 2.4064 };
  }, [center, pins]);

  useEffect(() => {
    let cancelled = false;
    loadMaps()
      .then(() => {
        if (cancelled || !nodeRef.current) return;
        const maps = (window as any).google.maps;
        mapRef.current = new maps.Map(nodeRef.current, {
          center: { lat: fallbackCenter.latitude, lng: fallbackCenter.longitude },
          zoom: 12,
          mapTypeControl: false,
          clickableIcons: false,

          streetViewControl: false,
          fullscreenControl: false,
        });
        setStatus("ready");
      })
      .catch(() => {
        if (!cancelled) setStatus("error");
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (status !== "ready" || !mapRef.current) return;
    try {
      const maps = (window as any).google.maps;
      const map = mapRef.current;

      for (const marker of markersRef.current) marker.setMap(null);
      markersRef.current = [];

      const primary = cssColor("--primary", "#0f766e");
      const accent = cssColor("--muted-foreground", "#64748b");

      const bounds = new maps.LatLngBounds();

      for (const pin of pins) {
        const marker = new maps.Marker({
          map,
          position: { lat: pin.latitude, lng: pin.longitude },
          title: `${pin.name}${pin.city ? ` — ${pin.city}` : ""}`,
          icon: {
            path: maps.SymbolPath.CIRCLE,
            scale: pin.selected ? 10 : 7,
            fillColor: pin.contacted ? accent : primary,
            fillOpacity: 1,
            strokeColor: "#ffffff",
            strokeWeight: 2,
          },
        });
        marker.addListener("click", () => onSelect(pin.id));
        markersRef.current.push(marker);
        bounds.extend(marker.getPosition());
      }

      circleRef.current?.setMap(null);
      const centerPoint = {
        lat: fallbackCenter.latitude,
        lng: fallbackCenter.longitude,
      };
      circleRef.current = new maps.Circle({
        map,
        center: centerPoint,
        radius: radiusKm * 1000,
        strokeColor: primary,
        strokeOpacity: 0.35,
        strokeWeight: 1,
        fillColor: primary,
        fillOpacity: 0.06,
      });

      // Bounds of the search circle, computed from the radius (no map idle needed).
      const latSpan = radiusKm / 111;
      const lngSpan = radiusKm / (111 * Math.max(0.2, Math.cos((centerPoint.lat * Math.PI) / 180)));
      bounds.extend({ lat: centerPoint.lat + latSpan, lng: centerPoint.lng + lngSpan });
      bounds.extend({ lat: centerPoint.lat - latSpan, lng: centerPoint.lng - lngSpan });

      map.fitBounds(bounds, 32);
    } catch (error) {
      console.error("map render failed", error);
      setStatus("error");
    }
  }, [pins, status, radiusKm, fallbackCenter, onSelect]);


  if (status === "error") {
    return (
      <div className="flex h-72 items-center justify-center rounded-lg border border-border bg-muted/40 p-6 text-center text-sm text-muted-foreground">
        La carte n'a pas pu s'afficher. Les entreprises restent listées ci-dessous.
      </div>
    );
  }

  return (
    <div className="relative h-72 overflow-hidden rounded-lg border border-border">
      <div ref={nodeRef} className="size-full" />
      {status === "loading" ? (
        <div className="absolute inset-0 flex items-center justify-center bg-muted/40 text-sm text-muted-foreground">
          Chargement de la carte…
        </div>
      ) : null}
    </div>
  );
}
