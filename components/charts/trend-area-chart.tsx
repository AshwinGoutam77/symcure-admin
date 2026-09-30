"use client";

import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
  ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent, type ChartConfig,
} from "@/components/ui/chart";
import { chartPalette } from "@/lib/tones";
import { formatCompact } from "@/lib/formatters";

export interface ChartSeries {
  /** data key — letters/numbers/underscore only */
  key: string;
  label: string;
  color?: string;
}

interface TrendAreaChartProps {
  data: Record<string, any>[];
  xKey: string;
  series: ChartSeries[];
  height?: number;
  stacked?: boolean;
  valueFormatter?: (v: number) => string;
  xFormatter?: (v: any) => string;
}

export function TrendAreaChart({
  data, xKey, series, height = 260, stacked, valueFormatter = (v) => String(v), xFormatter,
}: TrendAreaChartProps) {
  const config = Object.fromEntries(
    series.map((s, i) => [s.key, { label: s.label, color: s.color ?? chartPalette[i % chartPalette.length] }]),
  ) as ChartConfig;

  return (
    <ChartContainer config={config} className="aspect-auto w-full" style={{ height }}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
        <defs>
          {series.map((s) => (
            <linearGradient key={s.key} id={`fill-${s.key}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={`var(--color-${s.key})`} stopOpacity={0.35} />
              <stop offset="95%" stopColor={`var(--color-${s.key})`} stopOpacity={0.02} />
            </linearGradient>
          ))}
        </defs>
        <CartesianGrid vertical={false} stroke="var(--chart-grid)" strokeDasharray="3 3" />
        <XAxis
          dataKey={xKey} tickLine={false} axisLine={false} tickMargin={8} minTickGap={24}
          tick={{ fill: "var(--chart-axis)", fontSize: 12 }} tickFormatter={xFormatter}
        />
        <YAxis
          tickLine={false} axisLine={false} width={48}
          tick={{ fill: "var(--chart-axis)", fontSize: 12 }} tickFormatter={(v) => formatCompact(v)}
        />
        <ChartTooltip
          cursor={{ stroke: "var(--chart-axis)", strokeDasharray: "3 3" }}
          content={
            <ChartTooltipContent
              indicator="dot"
              labelFormatter={xFormatter ? (v) => xFormatter(v) : undefined}
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
        {series.map((s) => (
          <Area
            key={s.key} dataKey={s.key} type="monotone" stackId={stacked ? "a" : undefined}
            stroke={`var(--color-${s.key})`} strokeWidth={2} fill={`url(#fill-${s.key})`}
            dot={false} activeDot={{ r: 4 }}
          />
        ))}
      </AreaChart>
    </ChartContainer>
  );
}
