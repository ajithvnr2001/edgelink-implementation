'use client'

import { useState, useEffect } from 'react'
import { XMarkIcon } from '@heroicons/react/24/outline'

export interface ToastMessage {
  id: string
  message: string
  type: 'success' | 'error' | 'info' | 'warning'
  duration?: number
  action?: {
    label: string
    onClick: () => void
  }
}

interface ToastProps {
  toasts: ToastMessage[]
  onDismiss: (id: string) => void
}

// Haptic feedback utility
const triggerHaptic = (type: 'light' | 'medium' | 'heavy' = 'light') => {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    const patterns = {
      light: [10],
      medium: [20],
      heavy: [30],
    }
    navigator.vibrate(patterns[type])
  }
}

export function Toast({ toasts, onDismiss }: ToastProps) {
  return (
    <div className="fixed bottom-20 md:bottom-6 left-4 right-4 md:left-auto md:right-6 z-50 flex flex-col gap-2 md:w-96">
      {toasts.map((toast) => (
        <ToastItem
          key={toast.id}
          toast={toast}
          onDismiss={() => onDismiss(toast.id)}
        />
      ))}
    </div>
  )
}

interface ToastItemProps {
  toast: ToastMessage
  onDismiss: () => void
}

function ToastItem({ toast, onDismiss }: ToastItemProps) {
  useEffect(() => {
    if (toast.duration !== 0) {
      const timer = setTimeout(() => {
        onDismiss()
      }, toast.duration || 5000)

      return () => clearTimeout(timer)
    }
  }, [toast.duration, onDismiss])

  const typeStyles = {
    success: 'bg-green-600 border-green-500',
    error: 'bg-red-600 border-red-500',
    info: 'bg-blue-600 border-blue-500',
    warning: 'bg-yellow-600 border-yellow-500',
  }

  return (
    <div
      className={`${typeStyles[toast.type]} border rounded-lg shadow-lg p-4 flex items-center justify-between gap-3 animate-slide-in`}
    >
      <p className="text-white text-sm flex-1">{toast.message}</p>
      <div className="flex items-center gap-2">
        {toast.action && (
          <button
            onClick={() => {
              triggerHaptic('light')
              toast.action?.onClick()
              onDismiss()
            }}
            className="text-white font-medium text-sm hover:underline px-2 py-1 min-h-[44px] min-w-[44px] flex items-center justify-center"
          >
            {toast.action.label}
          </button>
        )}
        <button
          onClick={onDismiss}
          className="text-white/80 hover:text-white p-1 min-h-[44px] min-w-[44px] flex items-center justify-center -m-1"
        >
          <XMarkIcon className="h-5 w-5" />
        </button>
      </div>
      <style jsx>{`
        @keyframes slide-in {
          from {
            transform: translateY(100%);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
        .animate-slide-in {
          animation: slide-in 0.3s ease-out;
        }
      `}</style>
    </div>
  )
}

// Custom hook for managing toasts
export function useToast() {
  const [toasts, setToasts] = useState<ToastMessage[]>([])

  const addToast = (toast: Omit<ToastMessage, 'id'>) => {
    const id = Math.random().toString(36).substr(2, 9)
    setToasts((prev) => [...prev, { ...toast, id }])
    return id
  }

  const dismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }

  const showSuccess = (message: string, action?: ToastMessage['action']) => {
    return addToast({ message, type: 'success', action })
  }

  const showError = (message: string, action?: ToastMessage['action']) => {
    return addToast({ message, type: 'error', action })
  }

  const showInfo = (message: string, action?: ToastMessage['action']) => {
    return addToast({ message, type: 'info', action })
  }

  const showWarning = (message: string, action?: ToastMessage['action']) => {
    return addToast({ message, type: 'warning', action })
  }

  return {
    toasts,
    addToast,
    dismissToast,
    showSuccess,
    showError,
    showInfo,
    showWarning,
  }
}

export default Toast
