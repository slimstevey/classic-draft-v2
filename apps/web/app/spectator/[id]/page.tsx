'use client'

import Image from 'next/image'
import forest from '@/assets/backgrounds/forest.png'
import BanningPool from '@/components/banning-pool'
import Scoreboard from '@/components/scoreboard'
import Axies from '@/components/axies'
import { useBanningStore } from '@/stores/banning'

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
      </section>
    </section>
  )
}
