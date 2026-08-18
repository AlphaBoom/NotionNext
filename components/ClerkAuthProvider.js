import { ClerkProvider, useUser } from '@clerk/nextjs'
import { zhCN } from '@clerk/localizations'
import { ClerkAuthContext } from './ClerkAuthContext'

const ClerkUserBridge = ({ children }) => {
  const auth = useUser()
  return (
    <ClerkAuthContext.Provider value={auth}>
      {children}
    </ClerkAuthContext.Provider>
  )
}

export default function ClerkAuthProvider({ children }) {
  return (
    <ClerkProvider localization={zhCN}>
      <ClerkUserBridge>{children}</ClerkUserBridge>
    </ClerkProvider>
  )
}
