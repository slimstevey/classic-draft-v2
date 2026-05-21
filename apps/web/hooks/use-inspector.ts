import { usePathname } from 'next/navigation'

export function useInspector() {
  const pathname = usePathname()

  const isInspector = pathname.includes('inspect')

  return {
    isInspector,
  }
}
