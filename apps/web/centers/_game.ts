import { Application, Sprite } from 'pixi.js'
import { Axie, AxieCenter } from './axie-center'
import type { Axie as AxieType } from '@repo/shared/types'

export class Game {
  app: Application<HTMLCanvasElement>

  axieCenter: AxieCenter
  axie: Axie | null = null
  container: HTMLElement
  flag: Sprite | null = null

  isMobile = false

  axieLeft: Axie | null = null
  axieRight: Axie | null = null

  initialized = false

  constructor(container: HTMLElement, isMobile = false) {
    this.container = container
    this.isMobile = isMobile

    this.app = new Application<HTMLCanvasElement>({
      resolution: 1,
      antialias: true,
      eventMode: 'none',
      backgroundAlpha: 0,
      width: 500,
      height: 400,
      resizeTo: this.container,
    })
    this.axieCenter = new AxieCenter()

    this.resize()
  }

  async preload() {}

  async initAxie(axies: AxieType[]) {
    await this.axieCenter.init()

    this.container.appendChild(this.app.view)

    await this.axieCenter.createBatch(axies)

    this.initialized = true
  }

  switchAxie(side: 'left' | 'right', axieId: string) {
    if (!this.initialized) return

    if (side === 'left') {
      if (this.axieLeft) {
        this.app.stage.removeChild(this.axieLeft)
      }

      const newAxie = this.axieCenter.axies.get(axieId)!

      // Check if animation is already running
      const wasAnimating = newAxie.state.getCurrent(0)

      // Set up the axie positioning
      newAxie.scale.set(0.7)
      newAxie.scale.x = -0.7
      newAxie.position.set(this.app.screen.width / 2 - 500, this.app.screen.height / 2 + this.container.clientHeight / 4)

      // Start animation only if not already running
      if (!wasAnimating) {
        const randomDelay = Math.random() * 2.0
        newAxie.startIdleAnimation(randomDelay)
      }

      this.axieLeft = newAxie
      this.app.stage.addChild(this.axieLeft)
    } else {
      if (this.axieRight) {
        this.app.stage.removeChild(this.axieRight)
      }

      const newAxie = this.axieCenter.axies.get(axieId)!

      // Check if animation is already running
      const wasAnimating = newAxie.state.getCurrent(0)

      // Set up the axie positioning
      newAxie.scale.set(0.7)
      newAxie.position.set(this.app.screen.width / 2 + 500, this.app.screen.height / 2 + this.container.clientHeight / 4)

      // Start animation only if not already running
      if (!wasAnimating) {
        const randomDelay = Math.random() * 2.0
        newAxie.startIdleAnimation(randomDelay)
      }

      this.axieRight = newAxie
      this.app.stage.addChild(this.axieRight)
    }
  }

  resize() {
    window.addEventListener('resize', () => {
      const { width, height } = this.container.getBoundingClientRect()
      this.app.renderer.resize(width, height)
    })
  }

  hideAxies() {
    if (this.axieLeft) {
      this.app.stage.removeChild(this.axieLeft)
    }
    if (this.axieRight) {
      this.app.stage.removeChild(this.axieRight)
    }
  }

  clear() {
    try {
      // Only remove the canvas if it's actually a child of the container
      if (this.container && this.container.contains(this.app.view as Node)) {
        this.container.removeChild(this.app.view as Node)
      }
      this.app.destroy()
    } catch (error) {
      console.error('Error clearing game', error)
    }
  }
}
