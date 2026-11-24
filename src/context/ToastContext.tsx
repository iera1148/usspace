import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react'

const ToastContext = createContext<(message: string) => void>(() => {})

export function ToastProvider({ children }: { children: ReactNode }) {
  const [message, setMessage] = useState<string | null>(null)
  const queue = useRef<string[]>([])
  const timer = useRef(0)
  const push = useCallback((text: string) => {
    queue.current.push(text)
    if (queue.current.length > 1) return
    const show = () => {
      const next = queue.current[0]
      if (!next) {
        setMessage(null)
        return
      }
      setMessage(next)
      timer.current = window.setTimeout(() => {
        queue.current.shift()
        show()
      }, 2800)
    }
    show()
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
