import { useState, useEffect } from "react";
import { useMap } from "@/components/ui/map";

export type WeatherData = {
    temperature: number;
    weatherCode: number;
    windSpeed: number;
    isDay: boolean;
};

export function useWeather() {
    const { map, isLoaded } = useMap();
    const [weather, setWeather] = useState<WeatherData | null>(null);
    const [loading, setLoading] = useState(false);

    const fetchWeather = async (lat: number, lng: number) => {
        setLoading(true);
        try {
            const response = await fetch(
                `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,weather_code,wind_speed_10m,is_day&temperature_unit=fahrenheit&wind_speed_unit=mph`
            );
            const data = await response.json();

            if (data.current) {
                setWeather({
                    temperature: data.current.temperature_2m,
                    weatherCode: data.current.weather_code,
                    windSpeed: data.current.wind_speed_10m,
                    isDay: data.current.is_day === 1,
                });
            }
        } catch (error) {
            console.error("Failed to fetch weather:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!map || !isLoaded) return;

        const updateWeather = () => {
            const center = map.getCenter();
            fetchWeather(center.lat, center.lng);
        };

        // Initial fetch
        updateWeather();

        const handleMoveEnd = () => {
            const center = map.getCenter();
            fetchWeather(center.lat, center.lng);
        };

        map.on("moveend", handleMoveEnd);

        return () => {
            map.off("moveend", handleMoveEnd);
        };
    }, [map, isLoaded]);

    return { weather, loading };
}
