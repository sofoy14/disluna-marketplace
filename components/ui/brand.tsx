"use client"

import Link from "next/link"
import { FC } from "react"

interface BrandProps {
  theme?: "dark" | "light"
  size?: "sm" | "md" | "lg"
}

export const Brand: FC<BrandProps> = ({ theme = "dark", size = "md" }) => {
  const titleClass =
    size === "lg"
      ? "text-8xl"
      : size === "sm"
        ? "text-2xl"
        : "text-4xl"
  const subtitleClass =
    size === "lg"
      ? "text-2xl"
      : size === "sm"
        ? "text-sm"
        : "text-lg"
  return (
    <Link
      className="flex cursor-pointer flex-col items-center hover:opacity-50"
      href="#"
      onClick={(e) => e.preventDefault()}
    >
      <div className="text-center">
        <div className={`${titleClass} font-bold tracking-wide`}>
          <span className="bg-gradient-to-r from-purple-600 to-purple-400 bg-clip-text text-transparent">
            ALI
          </span>
        </div>
        <div className={`${subtitleClass} font-medium mt-1 text-gray-600 dark:text-gray-300`}>
          Asistente Legal Inteligente
        </div>
      </div>
    </Link>
  )
}
