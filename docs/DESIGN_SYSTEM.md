# Symcure Admin — Design System

One source of truth per concern. If you are about to write a hex colour, a `slate-*` class, a
`text-[13px]`, or a local `formatDate()` — stop and use the shared piece below.
`npm run lint:tokens` fails on the first three.

## Tokens — `app/globals.css`
| Need | Use |
|---|---|
| Page / card / popover surface | `bg-background` · `bg-card` · `bg-popover` |
| Text | `text-foreground` · `text-muted-foreground` |
| Lines | `border` (default) · `border-input` |
| Brand | `bg-primary` `text-primary` · accent green `bg-brand-green` |
| Status colour | `success` · `warning` · `destructive` · `info` — each has `-soft` for backgrounds (`bg-success-soft text-success border-success/25`) |
| Charts | `--chart-1…5` (blue, green, amber, violet, rose) + `--chart-grid` / `--chart-axis` |
| Sidebar | `bg-sidebar` `text-sidebar-foreground` `text-sidebar-muted` `bg-sidebar-accent` |
| Depth | `shadow-card` · `shadow-pop` |

Light and dark are both defined; dark mode toggles from the account menu (`next-themes`).

**Type scale:** `text-xs` (12) captions/table heads · `text-sm` (14) body · `text-base`/`text-lg` section titles ·
`text-2xl` page titles. Use `.tabular` on any number that lines up in a column.
**Icons:** lucide only, stroke 1.75 (global CSS). Sizes `size-4` inline, `size-5` nav/cards, `size-6` hero.
Concept → icon mapping lives in `lib/icons.ts` (Finance uses `IndianRupee`).

## Shared building blocks — `components/`
| Component | Purpose |
|---|---|
| `PageHeader` | breadcrumbs → title → description, actions on the right |
| `StatCard` (alias `MetricCard`) | KPI tile: icon tone, value, trend chip, sparkline, link, loading skeleton |
| `AttentionCard` | actionable "needs attention" row (tone = severity) |
| `SectionCard` | the one card surface: header (title/desc/action) + body, `flush` for tables |
| `DataTable` | sortable headers, loading skeleton, empty state, sticky header, row click, numbered pagination |
| `StatusBadge` | any backend status string → correct tone automatically (`lib/tones.ts`) |
| `EmptyState`, `AlertBox`, `FilterBar` | empty / inline message / filters |
| `charts/*` | `ChartCard`, `TrendAreaChart`, `BarCompareChart` (vertical + horizontal), `DonutChart`, `Sparkline` |

Semantic tones (`lib/tones.ts`) are the only place status → colour is decided, so "Pending" is amber
in the table, the badge, the alert and the chart.

## Formatting — `lib/formatters.ts`
`formatDate/Time/DateTime/ShortDate`, `formatNumber`, `formatCompact`, `formatMoney` (INR), `formatCompactMoney`,
`formatPercent`, `formatLabel`, `getInitials`, `pctChange`, `toNumber`. Date-only strings (`2025-03-05`) are parsed as
local dates so they never shift a day.

## Charts: rules of thumb
* Only chart numbers the API really returns. If a chart is built from a paginated page of rows, say so in `footer`.
* Part-to-whole → `DonutChart`; change over time → `TrendAreaChart`; ranking/comparison → `BarCompareChart`.
* Always wrap in `ChartCard` (gives loading + empty states for free).

## Adding a page
```tsx
<PageHeader breadcrumbs={[{label:"Care network"},{label:"Patients"}]} title="Patients" actions={…} />
<div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><StatCard … /></div>
<SectionCard title="All patients" flush><DataTable … /></SectionCard>
```
The app shell owns page padding and max-width — pages must not add their own outer `p-*` / `max-w-*`.
