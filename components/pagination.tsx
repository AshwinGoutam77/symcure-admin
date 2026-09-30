"use client";

import {
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

import { Button } from "@/components/ui/button";

type PaginationProps = {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;

  /**
   * Optional:
   * Number of records shown on the current page.
   */
  disabled?: boolean;
};

function getPageNumbers(
  currentPage: number,
  totalPages: number,
): (number | "ellipsis")[] {
  if (totalPages <= 1) {
    return [1];
  }

  /*
   * Show all pages when there are only a few.
   *
   * 1 2 3 4 5
   */
  if (totalPages <= 7) {
    return Array.from(
      { length: totalPages },
      (_, index) => index + 1,
    );
  }

  /*
   * Near the beginning:
   *
   * 1 2 3 4 5 ... 10
   */
  if (currentPage <= 4) {
    return [
      1,
      2,
      3,
      4,
      5,
      "ellipsis",
      totalPages,
    ];
  }

  /*
   * Near the end:
   *
   * 1 ... 6 7 8 9 10
   */
  if (currentPage >= totalPages - 3) {
    return [
      1,
      "ellipsis",
      totalPages - 4,
      totalPages - 3,
      totalPages - 2,
      totalPages - 1,
      totalPages,
    ];
  }

  /*
   * Middle:
   *
   * 1 ... 4 5 6 ... 10
   */
  return [
    1,
    "ellipsis",
    currentPage - 1,
    currentPage,
    currentPage + 1,
    "ellipsis",
    totalPages,
  ];
}

export function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  disabled = false,
}: PaginationProps) {
  const safeCurrentPage = Math.max(
    1,
    Math.min(currentPage, totalPages || 1),
  );

  const pages = getPageNumbers(
    safeCurrentPage,
    totalPages,
  );

  if (totalPages <= 1) {
    return null;
  }

  const goToPage = (page: number) => {
    if (
      disabled ||
      page < 1 ||
      page > totalPages ||
      page === safeCurrentPage
    ) {
      return;
    }

    onPageChange(page);
  };

  return (
    <div className="flex items-center gap-1">
      {/* PREVIOUS */}
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-8 gap-1 px-2.5 text-xs"
        disabled={
          disabled ||
          safeCurrentPage === 1
        }
        onClick={() =>
          goToPage(
            safeCurrentPage - 1,
          )
        }
      >
        <ChevronLeft className="size-3.5" />

        <span className="hidden sm:inline">
          Previous
        </span>
      </Button>

      {/* PAGE NUMBERS */}
      <div className="flex items-center gap-1">
        {pages.map((page, index) => {
          if (page === "ellipsis") {
            return (
              <span
                key={`ellipsis-${index}`}
                className="flex h-8 min-w-8 items-center justify-center px-1 text-xs text-muted-foreground"
              >
                ...
              </span>
            );
          }

          const active =
            page === safeCurrentPage;

          return (
            <Button
              key={page}
              type="button"
              variant={
                active
                  ? "default"
                  : "outline"
              }
              size="sm"
              className={`h-8 min-w-8 px-2 text-xs ${
                active
                  ? "pointer-events-none"
                  : ""
              }`}
              disabled={disabled}
              onClick={() =>
                goToPage(page)
              }
              aria-current={
                active
                  ? "page"
                  : undefined
              }
            >
              {page}
            </Button>
          );
        })}
      </div>

      {/* NEXT */}
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-8 gap-1 px-2.5 text-xs"
        disabled={
          disabled ||
          safeCurrentPage ===
            totalPages
        }
        onClick={() =>
          goToPage(
            safeCurrentPage + 1,
          )
        }
      >
        <span className="hidden sm:inline">
          Next
        </span>

        <ChevronRight className="size-3.5" />
      </Button>
    </div>
  );
}