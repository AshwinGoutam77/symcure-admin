"use client";

import {
  CheckCircle2,
  X,
  XCircle,
} from "lucide-react";

import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "@/components/ui/toast";

import { useToast } from "@/components/ui/use-toast";

export function Toaster() {
  const { toasts } = useToast();

  return (
    <ToastProvider>
      {toasts.map(({ id, title, description, variant, ...props }) => {
        const isError = variant === "destructive";

        return (
          <Toast
            key={id}
            {...props}
            className={`
              !grid
              !grid-cols-1
              !items-stretch
              !gap-0
              !w-full
              !max-w-[380px]
              !rounded-xl
              !border-0
              !p-0
              !shadow-2xl
              ${
                isError
                  ? "!bg-red-600 !text-white"
                  : "!bg-emerald-600 !text-white"
              }
            `}
          >
            <div className="relative flex w-full items-start gap-3 px-4 py-3.5">
              {/* Icon */}
              <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/15">
                {isError ? (
                  <XCircle className="h-[18px] w-[18px] text-white" />
                ) : (
                  <CheckCircle2 className="h-[18px] w-[18px] text-white" />
                )}
              </div>

              {/* Content */}
              <div className="min-w-0 flex-1 pr-6">
                {title ? (
                  <ToastTitle className="!m-0 text-[13px] font-semibold leading-5 text-white">
                    {title}
                  </ToastTitle>
                ) : null}

                {description ? (
                  <ToastDescription className="!m-0 mt-1 text-[12px] leading-[18px] text-white/90">
                    {description}
                  </ToastDescription>
                ) : null}
              </div>

              {/* Close */}
              <ToastClose
                className="
                  !absolute
                  right-3
                  top-3
                  !m-0
                  rounded-md
                  border-0
                  bg-transparent
                  p-1
                  text-white/70
                  opacity-100
                  shadow-none
                  hover:bg-white/10
                  hover:text-white
                "
              >
                <X className="h-3.5 w-3.5" />
              </ToastClose>
            </div>

            {/* Bottom progress line */}
            {/* <div
              className={`h-1 w-full ${
                isError
                  ? "bg-red-800/40"
                  : "bg-emerald-800/40"
              }`}
            /> */}
          </Toast>
        );
      })}

      {/* TOP RIGHT */}
<ToastViewport
  className="
    !fixed
    !top-4
    !bottom-auto
    !right-4
    !left-auto
    !z-[9999]
    !flex
    !w-[380px]
    !max-w-[calc(100vw-32px)]
    !translate-x-0
    !flex-col
    !gap-3
    !p-0
  "
/>
    </ToastProvider>
  );
}