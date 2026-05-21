import './globals.css'
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Axie Classic Draft',
  description: 'Tournament drafting tool for Axie Classic',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang='en'>
      <body>{children}</body>
    </html>
  )
}
