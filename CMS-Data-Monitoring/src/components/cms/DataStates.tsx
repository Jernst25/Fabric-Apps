export function LoadingSkeleton() {
    return (
        <div className="space-y-m animate-pulse">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-m">
                {[0, 1, 2, 3].map((i) => (
                    <div key={i} className="h-[88px] rounded-sm bg-muted" />
                ))}
            </div>
            <div className="h-[320px] rounded-sm bg-muted" />
        </div>
    );
}

export function EmptyState({ message }: { message: string }) {
    return (
        <div className="flex items-center justify-center h-[200px] text-muted-foreground text-300">
            {message}
        </div>
    );
}

export function ErrorBanner({ message }: { message: string }) {
    return (
        <div className="rounded-sm border border-destructive/30 bg-destructive/10 text-destructive px-l py-m text-300">
            {message}
        </div>
    );
}
