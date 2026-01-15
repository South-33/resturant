"use client";

import { ConvexProvider, ConvexReactClient } from "convex/react";
import { ReactNode, useMemo } from "react";

export function ConvexClientProvider({ children }: { children: ReactNode }) {
    const convex = useMemo(() => {
        const url = process.env.NEXT_PUBLIC_CONVEX_URL;
        if (!url) {
            // During static generation, return null - we'll handle this below
            return null;
        }
        return new ConvexReactClient(url);
    }, []);

    // Show a loading/error state if Convex is not configured
    if (!convex) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-stone-100">
                <div className="text-center p-8">
                    <p className="text-stone-600 mb-2">Convex not configured</p>
                    <p className="text-sm text-stone-400">Please set NEXT_PUBLIC_CONVEX_URL</p>
                </div>
            </div>
        );
    }

    return <ConvexProvider client={convex}>{children}</ConvexProvider>;
}
