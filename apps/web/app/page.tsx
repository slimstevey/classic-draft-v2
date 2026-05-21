import Link from 'next/link'

export default function HomePage() {
  return (
    <main className='flex min-h-screen w-full items-center justify-center gap-6 p-8'>
      <div className='flex flex-col items-center gap-4 max-w-md'>
        <h1 className='text-3xl font-bold'>Axie Classic Draft</h1>
        <p className='text-center text-sm opacity-70'>Tournament HUD & drafting tool</p>
        <div className='flex flex-col gap-2 w-full mt-6'>
          <Link href='/warrior' className='border rounded px-4 py-2 text-center hover:bg-white/5'>
            Warrior (Discord)
          </Link>
          <p className='text-xs opacity-50 text-center mt-2'>
            Spectator: open <code>/spectator/&lt;room-id&gt;</code>
          </p>
        </div>
      </div>
    </main>
  )
}
