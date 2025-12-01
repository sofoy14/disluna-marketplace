import { redirect } from "next/navigation"

export default function HomePage() {
  // Redirigir inmediatamente a la landing page sin mostrar mensaje
  redirect("/landing")
}
