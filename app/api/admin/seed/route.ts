export const dynamic = 'force-dynamic'

import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export async function GET() {
    try {
        const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
        if (!serviceRoleKey) return NextResponse.json({ error: "No service key" }, { status: 500 })

        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            serviceRoleKey
        )

        // Get a user
        const { data: { users }, error: uError } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1 })
        if (uError || !users || users.length === 0) {
            return NextResponse.json({ error: "No users found to seed" }, { status: 400 })
        }

        const userId = users[0].id

        // Locations to seed
        const locations = [
            { city: 'Bogotá', country: 'Colombia', lat: 4.7110, lng: -74.0721, ip: '190.1.2.3' },
            { city: 'Medellín', country: 'Colombia', lat: 6.2442, lng: -75.5812, ip: '191.4.5.6' },
            { city: 'Cali', country: 'Colombia', lat: 3.4516, lng: -76.5320, ip: '186.7.8.9' },
            { city: 'Bucaramanga', country: 'Colombia', lat: 7.1254, lng: -73.1198, ip: '181.10.11.12' }
        ]

        const inserts = locations.map(loc => ({
            user_id: userId,
            ip_address: loc.ip,
            country: loc.country,
            city: loc.city,
            latitude: loc.lat,
            longitude: loc.lng,
            created_at: new Date().toISOString()
        }))

        const { error } = await supabase.from('user_locations').insert(inserts)

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        return NextResponse.json({ success: true, count: inserts.length })
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 })
    }
}
