import NetworkProvider from '@/providers/network'

export default function BattleLayout({ children }: { children: React.ReactNode }) {
  return <NetworkProvider mode='warrior'>{children}</NetworkProvider>
}
