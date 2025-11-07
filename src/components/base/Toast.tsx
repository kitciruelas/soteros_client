"use client"

import type React from "react"
import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react"

type ToastType = "success" | "error" | "info" | "warning"

interface ToastItem {
  id: number
  type: ToastType
  title?: string
  message: string
  durationMs: number
}

interface ToastContextValue {
  showToast: (opts: { type?: ToastType; message: string; title?: string; durationMs?: number }) => void
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined)

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error("useToast must be used within a ToastProvider")
  return ctx
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const idRef = useRef(1)

  const removeToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const showToast = useCallback(
    (opts: { type?: ToastType; message: string; title?: string; durationMs?: number }) => {
      const id = idRef.current++
      const item: ToastItem = {
        id,
        type: opts.type ?? "info",
        title: opts.title,
        message: opts.message,
        durationMs: opts.durationMs ?? 3000,
      }
      setToasts((prev) => [...prev, item])
      if (item.durationMs > 0) {
        window.setTimeout(() => removeToast(id), item.durationMs)
      }
    },
    [removeToast],
  )

  const value = useMemo<ToastContextValue>(() => ({ showToast }), [showToast])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <Toaster toasts={toasts} onClose={removeToast} />
    </ToastContext.Provider>
  )
}

function iconFor(type: ToastType) {
  switch (type) {
    case "success":
      return "ri-checkbox-circle-fill"
    case "error":
      return "ri-error-warning-fill"
    case "warning":
      return "ri-alert-fill"
    case "info":
    default:
      return "ri-information-fill"
  }
}

function colorFor(type: ToastType) {
  switch (type) {
    case "success":
      return {
        bg: "bg-gradient-to-r from-emerald-50 to-green-50",
        text: "text-emerald-700",
        icon: "text-emerald-600",
        border: "border-emerald-200",
        accent: "bg-emerald-500",
      }
    case "error":
      return {
        bg: "bg-gradient-to-r from-red-50 to-rose-50",
        text: "text-red-700",
        icon: "text-red-600",
        border: "border-red-200",
        accent: "bg-red-500",
      }
    case "warning":
      return {
        bg: "bg-gradient-to-r from-amber-50 to-yellow-50",
        text: "text-amber-700",
        icon: "text-amber-600",
        border: "border-amber-200",
        accent: "bg-amber-500",
      }
    case "info":
    default:
      return {
        bg: "bg-gradient-to-r from-blue-50 to-indigo-50",
        text: "text-blue-700",
        icon: "text-blue-600",
        border: "border-blue-200",
        accent: "bg-blue-500",
      }
  }
}

function Toaster({ toasts, onClose }: { toasts: ToastItem[]; onClose: (id: number) => void }) {
  return (
    <div className="fixed top-4 right-4 left-4 md:top-6 md:right-6 md:left-auto z-[60] space-y-3 md:space-y-4">
      {toasts.map((t, index) => {
        const c = colorFor(t.type)
        return (
          <div
            key={t.id}
            className={`
              relative flex items-start gap-3 md:gap-4 p-4 md:p-5 rounded-xl shadow-xl backdrop-blur-sm
              ${c.bg} ${c.border} border-2
              w-full md:min-w-[320px] md:max-w-md
              transform transition-all duration-300 ease-out
              animate-in slide-in-from-right-full fade-in
              hover:shadow-2xl hover:scale-[1.02]
            `}
            style={{
              animationDelay: `${index * 100}ms`,
              animationFillMode: "both",
            }}
          >
            <div className={`absolute left-0 top-0 bottom-0 w-1 rounded-l-xl ${c.accent}`} />

            <div className={`flex-shrink-0 ${c.icon} mt-0.5`}>
              <i className={`${iconFor(t.type)} text-xl md:text-2xl drop-shadow-sm`}></i>
            </div>

            <div className="flex-1 min-w-0">
              {t.title && <div className={`font-semibold text-sm md:text-base ${c.text} mb-1 leading-tight`}>{t.title}</div>}
              <div className={`text-xs md:text-sm ${c.text} opacity-90 leading-relaxed`}>{t.message}</div>
            </div>

            <button
              className={`
                flex-shrink-0 p-1 md:p-1.5 rounded-lg transition-all duration-200
                ${c.text} opacity-60 hover:opacity-100 
                hover:bg-white/20 hover:scale-110 active:scale-95
                focus:outline-none focus:ring-2 focus:ring-white/30
                touch-manipulation
              `}
              onClick={() => onClose(t.id)}
              aria-label="Close notification"
            >
              <i className="ri-close-line text-base md:text-lg"></i>
            </button>
          </div>
        )
      })}
    </div>
  )
}
