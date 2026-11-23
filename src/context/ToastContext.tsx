import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react'

const ToastContext = createContext<(message: string) => void>(() => {})

export function ToastProvider({ children }: { children: ReactNode }) {
  const [message, setMessage] = useState<string | null>(null)
  const timer = useRef(0)
  const push = useCallback((text: string) => {
    setMessage(text)
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => setMessage(null), 2800)
  }, [])

  return (
    <ToastContext.Provider value={push}>
      {children}
      {message ? (
        <div className="toast" role="status">
          {message}
        </div>
      ) : null}
    </ToastContext.Provider>
  )
}

export function useToast() {
  return useContext(ToastContext)
}
