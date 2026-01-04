import { cn } from "@/lib/utils"
import { FC } from "react"

interface StaticShaderAvatarProps {
    size?: number
    className?: string
}

export const StaticShaderAvatar: FC<StaticShaderAvatarProps> = ({
    size = 36,
    className
}) => {
    return (
        <div
            className={cn(
                "rounded-full bg-gradient-to-br from-violet-500 via-primary to-purple-400",
                "flex items-center justify-center shadow-lg shadow-primary/20",
                "relative overflow-hidden",
                className
            )}
            style={{ width: size, height: size }}
        >
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(255,255,255,0.4),transparent)]" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_70%,rgba(0,0,0,0.1),transparent)]" />
        </div>
    )
}
