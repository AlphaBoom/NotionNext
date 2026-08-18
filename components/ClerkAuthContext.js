import { createContext, useContext } from 'react'

const DEFAULT_AUTH = {
  isLoaded: true,
  isSignedIn: false,
  user: false
}

export const ClerkAuthContext = createContext(DEFAULT_AUTH)

export const useClerkAuth = () => useContext(ClerkAuthContext)
