import './globals.css'
import { Metadata } from 'next'
import TantoProvider from '@/providers/tanto'

export const metadata: Metadata = {
  title: 'Axie Classic Draft',
  description: 'Tournament drafting tool for Axie Classic',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang='en'>
      <body>
        <TantoProvider>{children}</TantoProvider>
      </body>
    </html>
  )
}
