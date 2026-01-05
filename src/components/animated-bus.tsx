"use client";

import { useEffect, useState, useRef } from "react";
import { MapMarker, MarkerContent, MarkerTooltip } from "@/components/ui/map";

interface AnimatedBusProps {
    route: [number, number][];
    startName: string;
    endName: string;
    color?: string;
    speed?: number; // km/h
    id: string;
}

function BusIcon({ color = "#f97316" }: { color?: string }) {
    return (
        <svg
            width="40"
            height="40"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="drop-shadow-xl"
        >
            {/* Bus body */}
            <rect x="4" y="6" width="16" height="12" rx="2" fill={color} />
            <rect x="4" y="6" width="16" height="12" rx="2" stroke="white" strokeWidth="1" />

            {/* Windows */}
            <rect x="6" y="8" width="5" height="4" rx="0.5" fill="white" opacity="0.9" />
            <rect x="13" y="8" width="5" height="4" rx="0.5" fill="white" opacity="0.9" />

            {/* Wheels */}
            <circle cx="8" cy="18" r="2" fill="#111827" />
            <circle cx="16" cy="18" r="2" fill="#111827" />

            {/* Front/headlights */}
            <circle cx="6" cy="15" r="0.8" fill="#fef3c7" />
            <circle cx="18" cy="15" r="0.8" fill="#fef3c7" />
        </svg>
    );
}

export function AnimatedBus({ route, startName, endName, color, speed = 60, id }: AnimatedBusProps) {
    const [position, setPosition] = useState<{ lng: number; lat: number }>({
        lng: route[0][0],
        lat: route[0][1],
    });
    const [rotation, setRotation] = useState(0);
    const progressRef = useRef(0);
    const lastTimeRef = useRef<number>(Date.now());
    const animationFrameRef = useRef<number>();

    useEffect(() => {
        if (route.length < 2) return;

        // Calculate total distance in degrees (approximate)
        const totalDistance = route.reduce((acc, coord, i) => {
            if (i === 0) return 0;
            const prev = route[i - 1];
            const dx = coord[0] - prev[0];
            const dy = coord[1] - prev[1];
            return acc + Math.sqrt(dx * dx + dy * dy);
        }, 0);

        // Convert speed from km/h to degrees per second (very rough approximation)
        const degreesPerSecond = speed / 111 / 3600;

        const animate = () => {
            const now = Date.now();
            const deltaTime = (now - lastTimeRef.current) / 1000; // seconds
            lastTimeRef.current = now;

            // Update progress
            progressRef.current += (degreesPerSecond * deltaTime) / totalDistance;

            // Loop the animation
            if (progressRef.current >= 1) {
                progressRef.current = 0;
            }

            // Find current segment
            let accumulatedDistance = 0;
            let currentSegmentIndex = 0;
            let segmentProgress = 0;

            for (let i = 1; i < route.length; i++) {
                const prev = route[i - 1];
                const curr = route[i];
                const dx = curr[0] - prev[0];
                const dy = curr[1] - prev[1];
                const segmentDist = Math.sqrt(dx * dx + dy * dy);
                const nextAccumulated = accumulatedDistance + segmentDist / totalDistance;

                if (progressRef.current <= nextAccumulated) {
                    currentSegmentIndex = i - 1;
                    const segmentStart = accumulatedDistance;
                    const segmentLength = segmentDist / totalDistance;
                    segmentProgress = (progressRef.current - segmentStart) / segmentLength;
                    break;
                }

                accumulatedDistance = nextAccumulated;
            }

            // Interpolate position
            const start = route[currentSegmentIndex];
            const end = route[currentSegmentIndex + 1] || route[currentSegmentIndex];

            const lng = start[0] + (end[0] - start[0]) * segmentProgress;
            const lat = start[1] + (end[1] - start[1]) * segmentProgress;

            // Calculate rotation (bearing)
            const dx = end[0] - start[0];
            const dy = end[1] - start[1];
            const bearing = (Math.atan2(dx, dy) * 180) / Math.PI;

            setPosition({ lng, lat });
            setRotation(bearing);

            animationFrameRef.current = requestAnimationFrame(animate);
        };

        animationFrameRef.current = requestAnimationFrame(animate);

        return () => {
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
            }
        };
    }, [route, speed]);

    return (
        <MapMarker
            longitude={position.lng}
            latitude={position.lat}
            rotation={rotation}
            pitchAlignment="map"
            rotationAlignment="map"
        >
            <MarkerContent>
                <BusIcon color={color} />
            </MarkerContent>
            <MarkerTooltip className="flex flex-col gap-0.5 min-w-[120px]">
                <div className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Bus Service</div>
                <div className="font-semibold text-sm">{startName} → {endName}</div>
            </MarkerTooltip>
        </MapMarker>
    );
}
