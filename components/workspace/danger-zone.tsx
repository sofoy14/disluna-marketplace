"use client"

import { FC, ReactNode } from "react"
import { IconAlertTriangle } from "@tabler/icons-react"

interface DangerZoneProps {
    title?: string
    description?: string
    children: ReactNode
}

export const DangerZone: FC<DangerZoneProps> = ({
    title = "Zona de Peligro",
    description = "Las acciones en esta sección son irreversibles. Procede con precaución.",
    children
}) => {
    return (
        <div className="mt-8 pt-6 border-t border-destructive/20">
            <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-5 space-y-4">
                <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full bg-destructive/10">
                        <IconAlertTriangle className="text-destructive" size={20} />
                    </div>
                    <div>
                        <h3 className="font-semibold text-destructive">{title}</h3>
                        <p className="text-sm text-muted-foreground">{description}</p>
                    </div>
                </div>

                <div className="pt-2">
                    {children}
                </div>
            </div>
        </div>
    )
}
