"use client";

import { useWeather } from "@/hooks/use-weather";
import { Cloud, CloudRain, CloudSun, Loader2, Sun, Thermometer, Wind } from "lucide-react";
import { cn } from "@/lib/utils";

export function WeatherWidget() {
    const { weather, loading } = useWeather();

    if (!weather && !loading) return null;

    const getWeatherIcon = (code: number) => {
        if (code <= 1) return <Sun className="size-6 text-amber-500" />;
        if (code <= 3) return <CloudSun className="size-6 text-amber-500" />;
        if (code <= 48) return <Cloud className="size-6 text-gray-500" />;
        if (code <= 82) return <CloudRain className="size-6 text-blue-500" />;
        return <Cloud className="size-6 text-gray-500" />;
    };

    const getWeatherDescription = (code: number) => {
        if (code === 0) return "Clear sky";
        if (code === 1) return "Mainly clear";
        if (code === 2) return "Partly cloudy";
        if (code === 3) return "Overcast";
        if (code <= 48) return "Foggy";
        if (code <= 55) return "Drizzle";
        if (code <= 65) return "Rain";
        if (code <= 75) return "Snow";
        if (code <= 82) return "Rain showers";
        return "Unknown";
    };

    return (
        <div className="absolute top-4 right-4 z-10">
            <div className="flex flex-col gap-1 rounded-lg border bg-background/95 p-3 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-background/60 min-w-[140px]">
                {loading && !weather ? (
                    <div className="flex items-center justify-center py-2">
                        <Loader2 className="size-4 animate-spin text-muted-foreground" />
                    </div>
                ) : weather ? (
                    <>
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-muted-foreground">Weather</span>
                            {getWeatherIcon(weather.weatherCode)}
                        </div>
                        <div className="mt-1">
                            <div className="text-2xl font-bold tracking-tight">
                                {Math.round(weather.temperature)}°F
                            </div>
                            <div className="text-xs text-muted-foreground font-medium">
                                {getWeatherDescription(weather.weatherCode)}
                            </div>
                        </div>
                        <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground border-t pt-2">
                            <Wind className="size-3" />
                            <span>{weather.windSpeed} mph Wind</span>
                        </div>
                    </>
                ) : null}
            </div>
        </div>
    );
}
