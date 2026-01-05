"use client";

import { useEffect, useState, useCallback } from "react";
import { useMap, MapRoute } from "@/components/ui/map";
import { AnimatedBus } from "@/components/animated-bus";

interface BusRoute {
    id: string;
    coordinates: [number, number][];
    start: { name: string; lng: number; lat: number };
    end: { name: string; lng: number; lat: number };
    color: string;
}

const BUS_COLORS = [
    "#f97316", // orange
    "#3b82f6", // blue
    "#10b981", // green
    "#8b5cf6", // purple
    "#ef4444", // red
    "#06b6d4", // cyan
    "#f59e0b", // amber
    "#ec4899", // pink
    "#14b8a6", // teal
    "#6366f1", // indigo
];

async function fetchPlacesInBounds(bounds: {
    minLng: number;
    maxLng: number;
    minLat: number;
    maxLat: number;
}): Promise<{ lng: number; lat: number; name: string }[]> {
    try {
        const query = `
            [out:json][timeout:25];
            (
              node["place"~"city|town|village|suburb"](${bounds.minLat},${bounds.minLng},${bounds.maxLat},${bounds.maxLng});
            );
            out body;
        `;

        const response = await fetch("https://overpass-api.de/api/interpreter", {
            method: "POST",
            body: "data=" + encodeURIComponent(query),
        });

        const data = await response.json();

        if (data.elements && data.elements.length > 0) {
            return data.elements.map((el: any) => ({
                lng: el.lon,
                lat: el.lat,
                name: el.tags.name || "Unknown Place",
            }));
        }
        return [];
    } catch (error) {
        console.error("Error fetching places from Overpass:", error);
        return [];
    }
}

async function fetchRoute(
    start: { lng: number; lat: number },
    end: { lng: number; lat: number }
): Promise<[number, number][] | null> {
    try {
        const response = await fetch(
            `https://router.project-osrm.org/route/v1/driving/${start.lng},${start.lat};${end.lng},${end.lat}?overview=full&geometries=geojson`
        );

        if (!response.ok) {
            console.error(`OSRM API error: ${response.status} ${response.statusText}`);
            return null;
        }

        const contentType = response.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) {
            const text = await response.text();
            console.error("OSRM API returned non-JSON response:", text.slice(0, 200));
            return null;
        }

        const data = await response.json();

        if (data.routes && data.routes.length > 0) {
            // Return the fastest route (first one)
            return data.routes[0].geometry.coordinates;
        }
        return null;
    } catch (error) {
        console.error("Error fetching route:", error);
        return null;
    }
}

export function BusRouteManager() {
    const { map, isLoaded } = useMap();
    const [routes, setRoutes] = useState<BusRoute[]>([]);
    const [isGenerating, setIsGenerating] = useState(false);

    const generateRoutes = useCallback(async () => {
        if (!map || isGenerating) return;

        setIsGenerating(true);

        try {
            const bounds = map.getBounds();
            const mapBounds = {
                minLng: bounds.getWest(),
                maxLng: bounds.getEast(),
                minLat: bounds.getSouth(),
                maxLat: bounds.getNorth(),
            };

            // Fetch valid places in the current viewport
            const places = await fetchPlacesInBounds(mapBounds);
            const newRoutes: BusRoute[] = [];

            // Helper to get a random location (either from places or random coords)
            const getRandomLoc = () => {
                if (places.length > 0) {
                    const place = places[Math.floor(Math.random() * places.length)];
                    return { lng: place.lng, lat: place.lat, name: place.name };
                }
                // Fallback to random point in bounds
                const lng = mapBounds.minLng + Math.random() * (mapBounds.maxLng - mapBounds.minLng);
                const lat = mapBounds.minLat + Math.random() * (mapBounds.maxLat - mapBounds.minLat);
                return { lng, lat, name: "Location" };
            };

            // Generate 100 bus routes
            const BATCH_SIZE = 5;
            for (let i = 0; i < 100; i += BATCH_SIZE) {
                const batchPromises = Array.from({ length: BATCH_SIZE }).map(async (_, batchIdx) => {
                    const idx = i + batchIdx;
                    const startLoc = getRandomLoc();
                    const endLoc = getRandomLoc();

                    // Ensure start and end are different
                    if (
                        Math.abs(startLoc.lng - endLoc.lng) < 0.005 &&
                        Math.abs(startLoc.lat - endLoc.lat) < 0.005
                    ) {
                        return null;
                    }

                    const routeCoords = await fetchRoute(startLoc, endLoc);

                    if (routeCoords && routeCoords.length > 0) {
                        return {
                            id: `bus-${idx}-${Date.now()}`,
                            coordinates: routeCoords,
                            start: startLoc,
                            end: endLoc,
                            color: BUS_COLORS[idx % BUS_COLORS.length],
                        };
                    }
                    return null;
                });

                const batchResults = await Promise.all(batchPromises);
                batchResults.forEach(route => {
                    if (route) newRoutes.push(route);
                });

                // Small delay between batches to avoid rate limiting
                await new Promise((resolve) => setTimeout(resolve, 200));
            }

            setRoutes(newRoutes);
        } catch (error) {
            console.error("Error generating routes:", error);
        } finally {
            setIsGenerating(false);
        }
    }, [map, isGenerating]);

    // Generate routes on initial load
    useEffect(() => {
        if (isLoaded && routes.length === 0) {
            // Wait a bit for the map to settle
            const timer = setTimeout(() => {
                generateRoutes();
            }, 1000);
            return () => clearTimeout(timer);
        }
    }, [isLoaded, generateRoutes, routes.length]);

    // Regenerate routes when the map viewport changes significantly
    useEffect(() => {
        if (!map || !isLoaded) return;

        let lastBounds = map.getBounds();
        let lastZoom = map.getZoom();

        const handleMoveEnd = () => {
            const currentBounds = map.getBounds();
            const currentZoom = map.getZoom();

            // Check if we've moved significantly
            const boundsChanged =
                Math.abs(currentBounds.getCenter().lng - lastBounds.getCenter().lng) > 0.5 ||
                Math.abs(currentBounds.getCenter().lat - lastBounds.getCenter().lat) > 0.5;
            const zoomChanged = Math.abs(currentZoom - lastZoom) > 1.5;

            if (boundsChanged || zoomChanged) {
                lastBounds = currentBounds;
                lastZoom = currentZoom;
                generateRoutes();
            }
        };

        map.on("moveend", handleMoveEnd);

        return () => {
            map.off("moveend", handleMoveEnd);
        };
    }, [map, isLoaded, generateRoutes]);

    return (
        <>
            {routes.map((route) => (
                <div key={route.id}>
                    <MapRoute
                        coordinates={route.coordinates}
                        color={route.color}
                        width={2}
                        opacity={0.15}
                    />
                    <AnimatedBus
                        id={route.id}
                        route={route.coordinates}
                        startName={route.start.name}
                        endName={route.end.name}
                        color={route.color}
                        speed={60 + Math.random() * 40}
                    />
                </div>
            ))}
        </>
    );
}
