'use client'

import { useConnect } from 'wagmi'

export default function WalletSelector() {
  const { connect, connectors } = useConnect()

  return (
    <div className='flex flex-col gap-4'>
      {connectors.map((connector) => (
        <button type='button' key={connector.id} onClick={() => connect({ connector })}>
          {connector.name}
        </button>
      ))}
    </div>
  )
}
