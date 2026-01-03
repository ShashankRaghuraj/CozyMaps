"use client";

import { useEffect, useState, useCallback } from "react";
import { useMap } from "@/components/ui/map";
import { Button } from "@/components/ui/button";
import { RotateCcw, Mountain, CloudRain } from "lucide-react";
import { cn } from "@/lib/utils";

export function MapController() {
    const { map, isLoaded } = useMap();
    const [pitch, setPitch] = useState(0);
    const [bearing, setBearing] = useState(0);
    const [is3D, setIs3D] = useState(false);
    const [showWeather, setShowWeather] = useState(false);

    useEffect(() => {
        if (!map || !isLoaded) return;

        const handleMove = () => {
            setPitch(Math.round(map.getPitch()));
            setBearing(Math.round(map.getBearing()));
        };

        map.on("move", handleMove);
        handleMove(); // Init

        return () => {
            map.off("move", handleMove);
        };
    }, [map, isLoaded]);

    // Handle 3D Buildings Layer
    useEffect(() => {
        if (!map || !isLoaded) return;

        const add3DLayers = () => {
            const layers = map.getStyle().layers;
            const labelLayerId = layers.find(
                (layer) => layer.type === "symbol" && layer.layout?.["text-field"]
            )?.id;

            if (!map.getSource("openmaptiles")) {
                const sources = map.getStyle().sources;
                const vectorSource = Object.keys(sources).find(key => sources[key].type === 'vector');

                if (vectorSource && !map.getLayer("3d-buildings")) {
                    map.addLayer(
                        {
                            id: "3d-buildings",
                            source: vectorSource,
                            "source-layer": "building",
                            type: "fill-extrusion",
                            minzoom: 13,
                            paint: {
                                "fill-extrusion-color": "#aaa",
                                "fill-extrusion-height": [
                                    "interpolate",
                                    ["linear"],
                                    ["zoom"],
                                    13,
                                    0,
                                    13.05,
                                    ["get", "render_height"],
                                ],
                                "fill-extrusion-base": [
                                    "interpolate",
                                    ["linear"],
                                    ["zoom"],
                                    13,
                                    0,
                                    13.05,
                                    ["get", "render_min_height"],
                                ],
                                "fill-extrusion-opacity": 0.6,
                            },
                        },
                        labelLayerId
                    );
                }
            }
        };

        if (map.isStyleLoaded()) {
            add3DLayers();
        } else {
            map.on("styledata", add3DLayers);
        }

        return () => {
            map.off("styledata", add3DLayers);
            if (map.getLayer("3d-buildings")) {
                map.removeLayer("3d-buildings");
            }
        }
    }, [map, isLoaded]);

    // Handle Weather Radar Layer
    useEffect(() => {
        if (!map || !isLoaded) return;

        const WEATHER_SOURCE_ID = "weather-radar";
        const WEATHER_LAYER_ID = "weather-layer";

        const addWeatherLayer = async () => {
            try {
                const response = await fetch("https://api.rainviewer.com/public/weather-maps.json");
                const data = await response.json();

                // Get the latest past radar data
                const latest = data.radar.past[data.radar.past.length - 1];
                const host = data.host;
                const path = latest.path;

                // Construct URL: {host}{path}/256/{z}/{x}/{y}/2/1_1.png
                const tileUrl = `${host}${path}/256/{z}/{x}/{y}/2/1_1.png`;

                if (!map.getSource(WEATHER_SOURCE_ID)) {
                    map.addSource(WEATHER_SOURCE_ID, {
                        type: "raster",
                        tiles: [tileUrl],
                        tileSize: 256,
                        maxzoom: 7,
                    });
                }

                if (!map.getLayer(WEATHER_LAYER_ID)) {
                    map.addLayer({
                        id: WEATHER_LAYER_ID,
                        type: "raster",
                        source: WEATHER_SOURCE_ID,
                        paint: {
                            "raster-opacity": 0.6,
                        },
                    });
                }
            } catch (error) {
                console.error("Failed to load weather data:", error);
            }
        };

        if (showWeather) {
            addWeatherLayer();
        } else {
            if (map.getLayer(WEATHER_LAYER_ID)) {
                map.removeLayer(WEATHER_LAYER_ID);
            }
            if (map.getSource(WEATHER_SOURCE_ID)) {
                map.removeSource(WEATHER_SOURCE_ID);
            }
        }
    }, [map, isLoaded, showWeather]);

    const toggle3D = useCallback(() => {
        if (!map) return;

        if (is3D) {
            map.easeTo({
                pitch: 0,
                bearing: 0,
                duration: 1000,
            });
            setIs3D(false);
        } else {
            map.easeTo({
                pitch: 60,
                bearing: -20,
                duration: 1000,
            });
            setIs3D(true);
        }
    }, [map, is3D]);

    const toggleWeather = () => setShowWeather(!showWeather);

    if (!isLoaded) return null;

    return (
        <div className="absolute top-4 left-4 z-10 flex flex-col gap-2">
            <div className="flex flex-col gap-2 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 p-2 rounded-lg border shadow-sm">
                <Button
                    size="sm"
                    variant={is3D ? "default" : "secondary"}
                    onClick={toggle3D}
                    className="w-full justify-start"
                >
                    <Mountain className="size-4 mr-2" />
                    {is3D ? "Flat View" : "3D View"}
                </Button>
                <Button
                    size="sm"
                    variant={showWeather ? "default" : "secondary"}
                    onClick={toggleWeather}
                    className="w-full justify-start"
                >
                    <CloudRain className="size-4 mr-2" />
                    Weather Radar
                </Button>
            </div>
        </div>
    );
}
