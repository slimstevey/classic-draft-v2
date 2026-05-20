'use client'

import { WAGMI_CONFIG } from '@/configs/tanto'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useMemo } from 'react'
import { WagmiProvider } from 'wagmi'

export default function TantoProvider({ children }: { children: React.ReactNode }) {
  const client = useMemo(() => new QueryClient(), [])
  return (
    <WagmiProvider config={WAGMI_CONFIG}>
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    </WagmiProvider>
  )
}
