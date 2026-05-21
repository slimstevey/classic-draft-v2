import { cn } from '@/libs/utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useConnect } from 'wagmi'
import Image from 'next/image'

const ALLOWED_CONNECTORS = ['RONIN_WALLET', 'WAYPOINT']

export function LoginForm({ className, ...props }: React.ComponentProps<'div'>) {
  const { connect, connectors } = useConnect()

  return (
    <div className={cn('flex flex-col gap-6', className)} {...props}>
      <Card>
        <CardHeader className='text-center'>
          <CardTitle className='text-xl'>Welcome Warrior</CardTitle>
          <CardDescription>Connect your wallet to continue</CardDescription>
        </CardHeader>
        <CardContent className='w-[400px]'>
          <div className='grid gap-6'>
            <div className='flex flex-col gap-4'>
              {connectors
                .filter((connector) => ALLOWED_CONNECTORS.includes(connector.id))
                .map((connector) => (
                  <Button variant='outline' className='w-full justify-start' key={connector.id} onClick={() => connect({ connector })}>
                    <figure className='aspect-square w-5 overflow-hidden rounded-sm'>
                      <Image src={connector.icon ?? ''} alt={connector.name} width={20} height={20} className='w-full h-full object-cover' />
                    </figure>
                    {connector.name}
                  </Button>
                ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
