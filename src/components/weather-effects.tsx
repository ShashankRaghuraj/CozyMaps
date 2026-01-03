"use client";

import { useEffect, useRef } from "react";
import { useWeather } from "@/hooks/use-weather";

export function WeatherEffects() {
    const { weather } = useWeather();
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const requestRef = useRef<number>();

    useEffect(() => {
        if (!weather || !canvasRef.current) return;

        const canvas = canvasRef.current;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        // Resize canvas to full screen
        const resize = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        };
        window.addEventListener("resize", resize);
        resize();

        // Determine effect type
        const isRain =
            (weather.weatherCode >= 51 && weather.weatherCode <= 67) ||
            (weather.weatherCode >= 80 && weather.weatherCode <= 82);
        const isSnow =
            (weather.weatherCode >= 71 && weather.weatherCode <= 77) ||
            (weather.weatherCode >= 85 && weather.weatherCode <= 86);

        if (!isRain && !isSnow) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            return;
        }

        // Particles
        const particles: {
            x: number;
            y: number;
            speed: number;
            length: number;
            opacity: number;
        }[] = [];

        const particleCount = isRain ? 500 : 200;

        for (let i = 0; i < particleCount; i++) {
            particles.push({
                x: Math.random() * canvas.width,
                y: Math.random() * canvas.height,
                speed: isRain ? Math.random() * 15 + 10 : Math.random() * 2 + 1,
                length: isRain ? Math.random() * 20 + 10 : Math.random() * 3 + 2,
                opacity: Math.random() * 0.5 + 0.1,
            });
        }

        const animate = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            ctx.fillStyle = isRain ? "#a0c4ff" : "#ffffff";
            ctx.strokeStyle = isRain ? "#a0c4ff" : "#ffffff";
            ctx.lineWidth = isRain ? 1 : 2;

            particles.forEach((p) => {
                ctx.beginPath();
                if (isRain) {
                    ctx.moveTo(p.x, p.y);
                    ctx.lineTo(p.x, p.y + p.length);
                    ctx.stroke();
                } else {
                    ctx.arc(p.x, p.y, p.length, 0, Math.PI * 2);
                    ctx.fill();
                }

                p.y += p.speed;
                if (p.y > canvas.height) {
                    p.y = -p.length;
                    p.x = Math.random() * canvas.width;
                }
            });

            requestRef.current = requestAnimationFrame(animate);
        };

        animate();

        return () => {
            window.removeEventListener("resize", resize);
            if (requestRef.current) {
                cancelAnimationFrame(requestRef.current);
            }
        };
    }, [weather]);

    return (
        <canvas
            ref={canvasRef}
            className="pointer-events-none absolute inset-0 z-20"
        />
    );
}
