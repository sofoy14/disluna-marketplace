import { createClient } from "@/lib/supabase/server"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"

export async function POST(req: Request) {
    try {
        const cookieStore = cookies()
        const supabase = createClient(cookieStore)

        const { data: { session } } = await supabase.auth.getSession()

        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const body = await req.json().catch(() => ({}))

        // Try to get IP from headers (standard for Vercel/proxies)
        let ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
            req.headers.get("x-real-ip")

        // Fallback if testing locally or direct
        if (!ip || ip === "::1" || ip === "127.0.0.1") {
            // You might want to mock an IP locally if needed, e.g. "8.8.8.8"
            // ip = "8.8.8.8"
            console.log("Local IP detected or no IP found")
        }

        if (!ip) {
            return NextResponse.json({ error: "No IP detected" }, { status: 400 })
        }

        // Fetch location data
        // Using ipapi.co (Free tier: 1000 requests/day, no API key needed for basic)
        // Alternative: ip-api.com (Free, no SSL for free plan effectively, so fetch might fail if mixed content? but server usage is fine)
        // ipapi.co is HTTPS.
        const geoRes = await fetch(`https://ipapi.co/${ip}/json/`)

        if (!geoRes.ok) {
            console.error("Geo API error", geoRes.statusText)
            return NextResponse.json({ error: "Geo lookup failed" }, { status: 500 })
        }

        const geoData = await geoRes.json()

        if (geoData.error) {
            return NextResponse.json({ error: geoData.reason || "Geo error" }, { status: 400 })
        }

        // Insert into DB
        const { error } = await supabase.from("user_locations" as any).insert({
            user_id: session.user.id,
            ip_address: ip,
            country: geoData.country_name,
            city: geoData.city,
            region: geoData.region,
            latitude: geoData.latitude,
            longitude: geoData.longitude,
            user_agent: req.headers.get("user-agent")
        })

        if (error) {
            console.error("DB Insert Error", error)
            return NextResponse.json({ error: "Database error" }, { status: 500 })
        }

        return NextResponse.json({ success: true, country: geoData.country_name })

    } catch (error) {
        console.error("Error logging location:", error)
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
    }
}
