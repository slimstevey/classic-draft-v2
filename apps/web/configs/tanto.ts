import { roninWallet, waypoint } from '@sky-mavis/tanto-wagmi'
import { http } from 'viem'
import { ronin } from 'viem/chains'
import { createConfig } from 'wagmi'

export const ALLOWED_WALLETS = ['RONIN_WALLET', 'WAYPOINT'] as const

export const WAGMI_CONFIG = createConfig({
  chains: [ronin],
  transports: { [ronin.id]: http() },
  connectors: [
    roninWallet(),
    waypoint({
      // TODO: replace with your own Waypoint client ID if/when you set up SkyMavis dev portal app.
      clientId: '06e9a99f-2d0f-48b5-a6e8-c24ce2bc58d2',
      chainId: 2021,
    }),
  ],
})
