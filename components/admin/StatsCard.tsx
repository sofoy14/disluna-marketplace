"use client"

import { LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

interface StatsCardProps {
  title: string
  value: string | number
  icon: LucideIcon
  description?: string
  trend?: {
    value: number
    isPositive: boolean
  }
  className?: string
}

export function StatsCard({
  title,
  value,
  icon: Icon,
  description,
  trend,
  className
}: StatsCardProps) {
  return (
    <div className={cn(
      "relative group overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-white/5 to-white/0 backdrop-blur-xl p-6 transition-all duration-300 hover:border-white/20 hover:shadow-2xl hover:shadow-purple-500/10",
      className
    )}>
      <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

      <div className="relative z-10 flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-400">
            {title}
          </p>
          <p className="mt-2 text-3xl font-bold text-white tracking-tight">
            {value}
          </p>
          {description && (
            <p className="mt-1 text-sm text-gray-500">
              {description}
            </p>
          )}
          {trend && (
            <div className="mt-3 flex items-center gap-2">
              <span className={cn(
                "flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
                trend.isPositive
                  ? "bg-green-500/10 text-green-400 border border-green-500/20"
                  : "bg-red-500/10 text-red-400 border border-red-500/20"
              )}>
                {trend.isPositive ? "↑" : "↓"} {Math.abs(trend.value)}%
              </span>
              <span className="text-xs text-gray-500">
                vs mes anterior
              </span>
            </div>
          )}
        </div>
        <div className={cn(
          "flex h-12 w-12 items-center justify-center rounded-xl border border-white/10 bg-white/5 shadow-inner transition-transform duration-300 group-hover:scale-110",
          "group-hover:border-purple-500/30 group-hover:bg-purple-500/10"
        )}>
          <Icon className="h-6 w-6 text-gray-400 transition-colors duration-300 group-hover:text-purple-400" />
        </div>
      </div>
    </div>
  )
}

