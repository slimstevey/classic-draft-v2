import NetworkProvider from '@/providers/network'

export default function AdminRoomLayout({ children }: { children: React.ReactNode }) {
  return <NetworkProvider mode='admin'>{children}</NetworkProvider>
}
