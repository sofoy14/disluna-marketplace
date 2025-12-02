import { redirect } from "next/navigation"

// This page should not be reached directly - middleware handles routing
// If it does get reached, redirect to landing for guest users or onboarding for auth users
export default async function HomePage() {
  // Simply redirect to landing - the middleware will handle authenticated users
  // This prevents redirect loops between middleware and page
  redirect("/landing")
}
