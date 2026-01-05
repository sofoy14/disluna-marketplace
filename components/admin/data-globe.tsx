"use client"

import { useEffect, useState, useRef } from "react"
import dynamic from "next/dynamic"
import { createClient } from "@/lib/supabase/client"
import { motion } from "framer-motion"

const Globe = dynamic(() => import("react-globe.gl"), {
    ssr: false,
    loading: () => <div className="h-96 w-full flex items-center justify-center text-muted-foreground animate-pulse">Cargando globo...</div>
})

interface UserLocation {
    city: string
    country: string
    lat: number
    lng: number
    ip: string
    count?: number
}

export function DataGlobe() {
    const [locations, setLocations] = useState<UserLocation[]>([])
    const globeEl = useRef<any>()
    const supabase = createClient()

    useEffect(() => {
        async function fetchLocations() {
            // Fetch locations
            const { data, error } = await supabase
                .from("user_locations" as any)
                .select("latitude, longitude, city, country, ip_address")
                .not("latitude", "is", null)
                .not("longitude", "is", null)
                .order('created_at', { ascending: false })
                .limit(1000)

            if (error) {
                console.error("Error loading locations:", error)
                return
            }

            const mapped = (data || []).map((d: any) => ({
                lat: d.latitude,
                lng: d.longitude,
                city: d.city,
                country: d.country,
                ip: d.ip_address,
                size: 0.1,
                color: "#a78bfa" // Phone purple-400
            }))

            setLocations(mapped)
        }

        fetchLocations()
    }, [])

    useEffect(() => {
        if (globeEl.current) {
            globeEl.current.controls().autoRotate = true
            globeEl.current.controls().autoRotateSpeed = 0.5
            // Set initial POV Centered on Colombia
            globeEl.current.pointOfView({ lat: 5, lng: -74, altitude: 2.0 }, 0);
        }
    }, [globeEl.current])

    return (
        <div className="relative h-[600px] w-full rounded-3xl overflow-hidden border border-white/10 shadow-2xl bg-[#0B0F19]">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(124,58,237,0.1),transparent_70%)] pointer-events-none" />

            <Globe
                ref={globeEl}
                globeImageUrl="//unpkg.com/three-globe/example/img/earth-dark.jpg"
                backgroundImageUrl="//unpkg.com/three-globe/example/img/night-sky.png"
                pointsData={locations}
                pointAltitude={0.15}
                pointColor="color"
                pointRadius={0.5}
                pointsMerge={true}
                atmosphereColor="#7c3aed"
                atmosphereAltitude={0.15}
                pointLabel={(d: any) => `
          <div style="
            background: rgba(15, 23, 42, 0.9); 
            backdrop-filter: blur(8px);
            border: 1px solid rgba(255,255,255,0.1);
            color: #e2e8f0; 
            padding: 8px 12px; 
            border-radius: 8px; 
            font-family: sans-serif;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.5);
          ">
            <div style="font-weight: 600; color: white;">${d.city}, ${d.country}</div>
            <div style="font-size: 0.8em; opacity: 0.7;">IP: ${d.ip}</div>
          </div>
        `}
            />

            {/* Overlay Stats */}
            <div className="absolute top-6 left-6 z-10 glass-panel p-4 rounded-xl border border-white/10 bg-black/40 backdrop-blur-md">
                <h3 className="text-white font-bold text-sm tracking-wide uppercase mb-1">Mapa de Usuarios</h3>
                <div className="flex items-center space-x-2">
                    <span className="relative flex h-3 w-3">
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-purple-500"></span>
                    </span>
                    <span className="text-2xl font-bold text-white tracking-tight">{locations.length}</span>
                </div>
                <p className="text-xs text-gray-400 mt-1">Ubicaciones registradas</p>
            </div>
        </div>
    )
}
