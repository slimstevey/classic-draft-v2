import NetworkProvider from '@/providers/network'

export default function SpectatorLayout({ children }: { children: React.ReactNode }) {
  return <NetworkProvider mode='spectator'>{children}</NetworkProvider>
}
