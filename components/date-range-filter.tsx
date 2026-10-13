// src/components/date-range-filter.tsx

"use client";

import { RotateCcw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export type DateSort = "asc" | "desc";

export function getDefaultDateRange() {
  const dateTo = new Date();
  const dateFrom = new Date(dateTo);

  dateFrom.setFullYear(dateFrom.getFullYear() - 1);

  const formatDate = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
  };

  return {
    date_from: formatDate(dateFrom),
    date_to: formatDate(dateTo),
  };
}

type DateRangeFilterProps = {
  dateFrom: string;
  dateTo: string;
  sort: DateSort;
  onDateFromChange: (value: string) => void;
  onDateToChange: (value: string) => void;
  onSortChange: (value: DateSort) => void;
  onReset?: () => void;
};

export function DateRangeFilter({
  dateFrom,
  dateTo,
  sort,
  onDateFromChange,
  onDateToChange,
  onSortChange,
  onReset,
}: DateRangeFilterProps) {
  const hasDateError =
    Boolean(dateFrom && dateTo && dateFrom > dateTo);

  return (
    <div>
      <div className="flex flex-wrap items-end gap-2">
        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.04em] text-muted-foreground">
            From
          </label>

          <Input
            type="date"
            value={dateFrom}
            max={dateTo || undefined}
            onChange={(event) =>
              onDateFromChange(event.target.value)
            }
            className="h-9 w-[145px] border-border bg-muted/50 text-xs focus:bg-card"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.04em] text-muted-foreground">
            To
          </label>

          <Input
            type="date"
            value={dateTo}
            min={dateFrom || undefined}
            onChange={(event) =>
              onDateToChange(event.target.value)
            }
            className="h-9 w-[145px] border-border bg-muted/50 text-xs focus:bg-card"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.04em] text-muted-foreground">
            Sort
          </label>

          <select
            value={sort}
            onChange={(event) =>
              onSortChange(
                event.target.value as DateSort,
              )
            }
            className="h-9 min-w-[135px] rounded-md border border-border bg-muted/50 px-3 text-xs text-muted-foreground outline-none transition focus:border-input focus:bg-card focus:ring-2 focus:ring-border/60"
          >
            <option value="desc">
              Newest first
            </option>

            <option value="asc">
              Oldest first
            </option>
          </select>
        </div>

        {onReset && (
          <Button
            type="button"
            variant="outline"
            onClick={onReset}
            className="h-9 border-border px-3 text-xs text-muted-foreground"
          >
            <RotateCcw className="mr-1.5 size-3.5" />
            Reset
          </Button>
        )}
      </div>

      {hasDateError && (
        <p className="mt-1.5 text-xs text-destructive">
          From date cannot be after To date.
        </p>
      )}
    </div>
  );
}