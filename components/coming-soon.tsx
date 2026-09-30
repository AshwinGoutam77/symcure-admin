"use client";

import { Clock3, ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

interface ComingSoonProps {
  title: string;
  description?: string;
  backLabel?: string;
}

export function ComingSoon({
  title,
  description = "We're working on this feature and it will be available soon.",
  backLabel = "Back",
}: ComingSoonProps) {
  const router = useRouter();

  return (
    <div className="flex min-h-[calc(100vh-140px)] items-center justify-center px-4">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 text-center shadow-sm">
        <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Clock3 className="size-6" />
        </div>

        <h1 className="text-2xl font-semibold text-foreground">
          {title}
        </h1>

        <p className="mx-auto mt-2 max-w-sm text-sm leading-5 text-muted-foreground">
          {description}
        </p>

        <div className="mt-6 flex justify-center">
          <Button
            variant="secondary"
            onClick={() => router.back()}
            className="gap-2"
          >
            <ArrowLeft className="size-4" />
            {backLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}