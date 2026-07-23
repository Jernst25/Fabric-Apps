import { useState, useEffect, useCallback } from "react";
import { type CachedQueryResult } from "@microsoft/fabric-app-data";
import { getFabricClient } from "@/lib/fabric-client";

interface QuerySpec {
    connection: string;
    query: string;
}

interface UseSequentialQueriesResult {
    results: (CachedQueryResult | undefined)[];
    isLoading: boolean;
    error: Error | undefined;
    refetch: () => Promise<void>;
}

/**
 * Executes multiple DAX queries one at a time (not in parallel) against the
 * Fabric SDK. The CMS semantic model times out under concurrent query load,
 * so callers that need several queries per page must serialize them.
 */
export function useSequentialQueries(specs: QuerySpec[]): UseSequentialQueriesResult {
    const [results, setResults] = useState<(CachedQueryResult | undefined)[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<Error | undefined>();

    const key = JSON.stringify(specs.map((s) => [s.connection, s.query]));

    const execute = useCallback(async () => {
        setIsLoading(true);
        setError(undefined);
        const out: (CachedQueryResult | undefined)[] = [];
        try {
            for (const spec of specs) {
                const result = await getFabricClient().semanticModel(spec.connection).query(spec.query, {});
                out.push(result);
                setResults([...out]);
                if (result.status === "error") {
                    setError(new Error(result.error.message));
                }
            }
        } catch (err) {
            setError(err instanceof Error ? err : new Error(String(err)));
        } finally {
            setIsLoading(false);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [key]);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional fetch-on-mount/deps-change
        execute();
    }, [execute]);

    return { results, isLoading, error, refetch: execute };
}
