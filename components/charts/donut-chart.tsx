"use client";

import { Cell, Pie, PieChart } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { chartPalette } from "@/lib/tones";
import { formatPercent } from "@/lib/formatters";

export interface DonutDatum {
  name: string;
  value: number;
  color?: string;
}

interface DonutChartProps {
  data: DonutDatum[];
  centerLabel?: string;
  centerValue?: string;
  valueFormatter?: (v: number) => string;
  height?: number;
}

/** Donut + ranked legend (value and share) — replaces raw number tiles for part-to-whole data. */
export function DonutChart({ data, centerLabel, centerValue, valueFormatter = (v) => String(v), height = 190 }: DonutChartProps) {
  const total = data.reduce((sum, d) => sum + d.value, 0);
  const colored = data.map((d, i) => ({ ...d, color: d.color ?? chartPalette[i % chartPalette.length] }));
  const config = Object.fromEntries(colored.map((d) => [d.name, { label: d.name, color: d.color }])) as ChartConfig;

  return (
    <div className="flex flex-col items-center gap-5 sm:flex-row">
      <div className="relative shrink-0" style={{ width: height, height }}>
        <ChartContainer config={config} className="aspect-square h-full w-full">
          <PieChart>
            <ChartTooltip
              content={
                <ChartTooltipContent
                  hideLabel
                  formatter={(value, name) => (
                    <div className="flex w-full items-center justify-between gap-6">
                      <span className="text-muted-foreground">{name}</span>
                      <span className="font-medium tabular text-foreground">{valueFormatter(Number(value))}</span>
                    </div>
                  )}
                />
              }
            />
            <Pie
              data={colored} dataKey="value" nameKey="name" innerRadius="64%" outerRadius="94%"
              paddingAngle={total > 0 && colored.length > 1 ? 2 : 0} strokeWidth={0} cornerRadius={4}
            >
              {colored.map((d) => (
                <Cell key={d.name} fill={d.color} />
              ))}
            </Pie>
          </PieChart>
        </ChartContainer>
        {(centerValue || centerLabel) && (
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
            {centerValue && <span className="text-lg font-semibold tabular text-foreground">{centerValue}</span>}
            {centerLabel && <span className="text-xs text-muted-foreground">{centerLabel}</span>}
          </div>
        )}
      </div>

      <ul className="w-full min-w-0 flex-1 space-y-2.5">
        {colored.map((d) => (
          <li key={d.name} className="flex items-center justify-between gap-3 text-sm">
            <span className="flex min-w-0 items-center gap-2">
              <span className="size-2.5 shrink-0 rounded-sm" style={{ background: d.color }} />
              <span className="truncate text-muted-foreground">{d.name}</span>
            </span>
            <span className="flex shrink-0 items-baseline gap-2 tabular">
              <span className="font-medium text-foreground">{valueFormatter(d.value)}</span>
              <span className="w-10 text-right text-xs text-muted-foreground">
                {total > 0 ? formatPercent((d.value / total) * 100) : "0%"}
              </span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
