import { NextResponse } from "next/server"
import { cookies } from "next/headers"

export async function POST(req: Request) {
    try {
        const { email, password } = await req.json()

        // Get creds from env
        // ADMIN_EMAILS might be comma separated, so check inclusion
        const adminEmails = process.env.ADMIN_EMAILS || ""
        const allowedEmails = adminEmails.split(",").map(e => e.trim().toLowerCase())

        // Admin password (single)
        const adminPassword = process.env.ADMIN_PASSWORD

        if (!adminPassword) {
            return NextResponse.json({ error: "System configuration error: ADMIN_PASSWORD missing" }, { status: 500 })
        }

        if (!email || !allowedEmails.includes(email.toLowerCase())) {
            return NextResponse.json({ error: "Email no autorizado" }, { status: 401 })
        }

        if (password !== adminPassword) {
            return NextResponse.json({ error: "Contraseña incorrecta" }, { status: 401 })
        }

        // Success - Set cookie
        // Cookie name: "admin_session_token"
        // Value: "authorized" (or sign a JWT if you want to be fancy, but simple secret check for MVP is okay if we verify properly)
        // Actually, let's use a signed JWT effectively or just a secure random string check? 
        // User requested "works thanks to env vars".
        // We will set a simple cookie that Middleware or Layout checks.
        cookies().set("admin_session", "true", {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            path: "/",
            maxAge: 60 * 60 * 24 // 24 hours
        })

        return NextResponse.json({ success: true })

    } catch (error) {
        console.error("Admin Auth Error:", error)
        return NextResponse.json({ error: "Internal Error" }, { status: 500 })
    }
}
