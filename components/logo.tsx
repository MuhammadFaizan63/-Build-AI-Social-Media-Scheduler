"use client"

import { LeafIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Span } from "next/dist/trace";

interface LogoProps {
    name?: string;
    className?: string;
    hideName?: boolean
}

const Logo = ({ name = "Lemon.ai", className, hideName = false }: LogoProps) => {
    return (
        <div className={cn("flex items-center gap-2,className")}>
            <div className="flex  h-6 items-center justify-center rounded-lg bg-primary text-primary text-primary-foreground">
                <LeafIcon className="h-4 w-4"/>
            </div>
            {!hideName && <span className="text-lg font-bold">{name}</span>}
        </div>
    )
}

export default Logo;