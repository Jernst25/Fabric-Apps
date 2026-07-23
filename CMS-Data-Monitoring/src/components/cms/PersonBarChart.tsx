import { VegaVisual, useCssTheme } from "@microsoft/fabric-visuals";
import type { VisualizationSpec } from "@microsoft/fabric-visuals";

export function PersonBarChart({
    title,
    data,
}: {
    title: string;
    data: { person: string; count: number }[];
}) {
    const theme = useCssTheme();

    const spec: VisualizationSpec = {
        $schema: "https://vega.github.io/schema/vega-lite/v6.json",
        title,
        data: { values: data },
        mark: { type: "bar", cornerRadiusEnd: 3 },
        encoding: {
            y: { field: "person", type: "nominal", sort: "-x", title: null },
            x: {
                field: "count",
                type: "quantitative",
                title: "Deals",
                axis: { tickMinStep: 1, format: "d" },
            },
        },
    };

    return <VegaVisual spec={spec} theme={theme} style={{ height: Math.max(160, data.length * 32 + 40) }} />;
}
