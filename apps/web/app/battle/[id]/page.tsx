'use client'

import forest from '@/assets/backgrounds/forest.png'
import Axies from '@/components/axies'
import BanningPool from '@/components/banning-pool'
import PlayerIndicator from '@/components/player-indicator'
import ReadyButton from '@/components/ready-button'
import Scoreboard from '@/components/scoreboard'
import { useBanningStore } from '@/stores/banning'
import Image from 'next/image'

export default function PageClient() {
  const { axies } = useBanningStore()

  return (
    <section className='w-screen h-screen'>
      <section id='background' className='w-full h-full absolute top-0 left-0 z-0'>
        <Image src={forest} alt='forest' className='w-full h-full object-cover' />
      </section>
      <section id='content' className='w-full h-full relative z-10 top-0 '>
        <Axies />
        <Scoreboard />
        <BanningPool axies={axies} />
        <ReadyButton />
        <PlayerIndicator />
      </section>
    </section>
  )
}
