'use client'
import { createContext, useState, useEffect, useContext } from 'react'
import { ProjectRoleType, TokenContextType, TokenType } from '@/types/user'
import { TokenProps } from '@/types/user'
import { useRouter, usePathname } from '@/src/navigation'
import {
  isSignedIn as tokenIsSinedIn,
  isAdmin as tokenIsAdmin,
  isProjectOwner as tokenIsProjectOwner,
  isProjectManager as tokenIsProjectManager,
  isProjectDeveloper as tokenIsProjectDeveloper,
  isProjectReporter as tokenIsProjectReporter,
  checkSignInPage as tokenCheckSignInPage,
  fetchMyRoles,
} from './token'
import { ToastContext } from './ToastProvider'
const LOCAL_STORAGE_KEY = 'unittcms-auth-token'

function storeTokenToLocalStorage(token: TokenType) {
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(token))
}

function removeTokenFromLocalStorage() {
  localStorage.removeItem(LOCAL_STORAGE_KEY)
}

const defaultContext = {
  token: {
    access_token: '',
    user: null,
  },
  isSignedIn: () => false,
  isAdmin: () => false,
  isProjectOwner: (projectId: number) => {
    return false
  },
  isProjectManager: (projectId: number) => {
    return false
  },
  isProjectDeveloper: (projectId: number) => {
    return false
  },
  isProjectReporter: (projectId: number) => {
    return false
  },
  refreshProjectRoles: async () => {},
  setToken: (token: TokenType) => {},
  storeTokenToLocalStorage,
  removeTokenFromLocalStorage,
  projectRoles: [] as ProjectRoleType[],
}
const TokenContext = createContext<TokenContextType>(defaultContext)

const TokenProvider = ({ toastMessages, locale, children }: TokenProps) => {
  const router = useRouter()
  const pathname = usePathname()
  const toastContext = useContext(ToastContext)

  const [hasRestoreFinished, setHasRestoreFinished] = useState(false)
  const [token, setToken] = useState<TokenType>({
    access_token: '',
    expires_at: 0,
    user: null,
  })
  const [projectRoles, setProjectRoles] = useState<ProjectRoleType[]>([])

  const isSignedIn = () => {
    return tokenIsSinedIn(token)
  }

  const isAdmin = () => {
    return tokenIsAdmin(token)
  }

  const isProjectOwner = (projectId: number) => {
    return tokenIsProjectOwner(projectRoles, projectId)
  }

  const isProjectManager = (projectId: number) => {
    return tokenIsProjectManager(projectRoles, projectId)
  }

  const isProjectDeveloper = (projectId: number) => {
    return tokenIsProjectDeveloper(projectRoles, projectId)
  }

  const isProjectReporter = (projectId: number) => {
    return tokenIsProjectReporter(projectRoles, projectId)
  }

  async function refreshProjectRoles() {
    if (!hasRestoreFinished || !token || !token.access_token) {
      return
    }

    try {
      const data = await fetchMyRoles(token.access_token)
      setProjectRoles(data || [])
    } catch (error: any) {
      console.error('Error in effect:', error.message)
      setProjectRoles([])
    }
  }

  const tokenContext = {
    token,
    projectRoles,
    isSignedIn,
    isAdmin,
    isProjectOwner,
    isProjectManager,
    isProjectDeveloper,
    isProjectReporter,
    setToken,
    refreshProjectRoles,
    storeTokenToLocalStorage,
    removeTokenFromLocalStorage,
  }

  const restoreTokenFromLocalStorage = () => {
    const tokenString = localStorage.getItem(LOCAL_STORAGE_KEY)
    if (tokenString) {
      const restoredToken = JSON.parse(tokenString)
      setToken(restoredToken)
    }
    setHasRestoreFinished(true)
  }

  // Restore the token from localStorage
  useEffect(() => {
    restoreTokenFromLocalStorage()
  }, [])

  // Once token is restored, check the sign-in state and roles
  useEffect(() => {
    if (!hasRestoreFinished) {
      return
    }

    // Refresh roles after the token is restored
    if (token.access_token) {
      refreshProjectRoles()
    }

    const ret = tokenCheckSignInPage(token, pathname)
    if (!ret.ok) {
      if (ret.reason === 'notoken') {
        if (toastMessages) {
          toastContext.showToast(toastMessages.needSignedIn, 'error')
        }
      } else if (ret.reason === 'expired') {
        if (toastMessages) {
          toastContext.showToast(toastMessages.sessionExpired, 'error')
        }
      }

      router.push(ret.redirectPath, { locale: locale })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    hasRestoreFinished,
    token,
    pathname,
    toastMessages,
    locale,
    router,
    toastContext,
  ])

  return (
    <TokenContext.Provider value={tokenContext}>
      {children}
    </TokenContext.Provider>
  )
}

export { TokenContext }
export default TokenProvider
