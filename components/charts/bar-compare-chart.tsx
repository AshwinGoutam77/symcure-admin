"use client";

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
  ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent, type ChartConfig,
} from "@/components/ui/chart";
import { chartPalette } from "@/lib/tones";
import { formatCompact } from "@/lib/formatters";
import type { ChartSeries } from "./trend-area-chart";

interface BarCompareChartProps {
  data: Record<string, any>[];
  xKey: string;
  series: ChartSeries[];
  height?: number;
  stacked?: boolean;
  /** horizontal bars — best for ranked lists with long labels (e.g. top doctors) */
  horizontal?: boolean;
  valueFormatter?: (v: number) => string;
  xFormatter?: (v: any) => string;
}

export function BarCompareChart({
  data, xKey, series, height = 260, stacked, horizontal, valueFormatter = (v) => String(v), xFormatter,
}: BarCompareChartProps) {
  const config = Object.fromEntries(
    series.map((s, i) => [s.key, { label: s.label, color: s.color ?? chartPalette[i % chartPalette.length] }]),
  ) as ChartConfig;

  const axisTick = { fill: "var(--chart-axis)", fontSize: 12 };

  return (
    <ChartContainer config={config} className="aspect-auto w-full" style={{ height }}>
      <BarChart
        data={data}
        layout={horizontal ? "vertical" : "horizontal"}
        margin={{ top: 8, right: 8, left: horizontal ? 0 : -8, bottom: 0 }}
        barCategoryGap={horizontal ? "28%" : "22%"}
      >
        <CartesianGrid vertical={horizontal} horizontal={!horizontal} stroke="var(--chart-grid)" strokeDasharray="3 3" />
        {horizontal ? (
          <>
            <XAxis type="number" tickLine={false} axisLine={false} tick={axisTick} tickFormatter={(v) => formatCompact(v)} />
            <YAxis type="category" dataKey={xKey} tickLine={false} axisLine={false} width={116} tick={axisTick} tickFormatter={xFormatter} />
          </>
        ) : (
          <>
            <XAxis dataKey={xKey} tickLine={false} axisLine={false} tickMargin={8} tick={axisTick} tickFormatter={xFormatter} />
            <YAxis tickLine={false} axisLine={false} width={48} tick={axisTick} tickFormatter={(v) => formatCompact(v)} />
          </>
        )}
        <ChartTooltip
          cursor={{ fill: "var(--muted)", opacity: 0.5 }}
          content={
            <ChartTooltipContent
              indicator="dot"
              formatter={(value, name, item) => (
                <div className="flex w-full items-center justify-between gap-6">
                  <span className="flex items-center gap-2 text-muted-foreground">
                    <span className="size-2 rounded-full" style={{ background: item.color }} />
                    {config[String(name)]?.label ?? name}
                  </span>
                  <span className="font-medium tabular text-foreground">{valueFormatter(Number(value))}</span>
                </div>
              )}
            />
          }
        />
        {series.length > 1 && <ChartLegend content={<ChartLegendContent />} />}
        {series.map((s, i) => (
          <Bar
            key={s.key} dataKey={s.key} fill={`var(--color-${s.key})`}
            stackId={stacked ? "a" : undefined}
            radius={stacked ? (i === series.length - 1 ? [4, 4, 0, 0] : 0) : horizontal ? [0, 4, 4, 0] : [4, 4, 0, 0]}
            maxBarSize={horizontal ? 22 : 40}
          />
        ))}
      </BarChart>
    </ChartContainer>
  );
}
