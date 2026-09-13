import { createContext } from 'react'
import { ToastContextType, ToastProps } from '@/types/toast'

// TODO Temporary use until NextUI's Toast is released.
import { ToastContainer, toast } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'

const defaultContext = {
  showToast: (
    text: string,
    mode: 'error' | 'dark' | 'success' | 'warning',
    timeShow?: number,
  ) => {},
}
const ToastContext = createContext<ToastContextType>(defaultContext)

const ToastProvider = ({ children }: ToastProps) => {
  const showToast = (
    text: string,
    mode: 'error' | 'dark' | 'success' | 'warning',
    timeShow?: number,
  ) => {
    const options = {
      theme: 'dark',
      style: { whiteSpace: 'pre-line' as const },
      autoClose: timeShow || (mode === 'error' ? 4000 : 2000),
      closeOnClick: true,
      pauseOnHover: true,
      draggable: true,
    }

    switch (mode) {
      case 'error':
        toast.error(text, options)
        break
      case 'success':
        toast.success(text, options)
        break
      case 'warning':
        toast.warning(text, options)
        break
      case 'dark':
      default:
        toast.info(text, options)
        break
    }
  }

  const toastContext = {
    showToast,
  }

  return (
    <ToastContext.Provider value={toastContext}>
      <ToastContainer
        position="bottom-right"
        hideProgressBar={false}
        newestOnTop={true}
        limit={5} // Limit the number of toasts shown at once
      />
      {children}
    </ToastContext.Provider>
  )
}

export { ToastContext }
export default ToastProvider
