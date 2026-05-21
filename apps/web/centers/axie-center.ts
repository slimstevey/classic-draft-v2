import { AtlasAttachmentLoader, SkeletonData, SkeletonJson, Spine, TextureAtlas } from '@pixi-spine/all-3.8'
import { AxieBuilderResult, getAxieSpineFromGenes, getResources, initAxieMixer } from '@repo/axie-mixer'
import pako from 'pako'
import { Texture } from 'pixi.js'
import { Axie as AxieType } from '@repo/shared/types'

export class Axie extends Spine {
  id: string | null = null
  gene: string | null = null
  meta = new Map<string, string>()

  constructor(gene: string, spineData: SkeletonData) {
    super(spineData)
    this.gene = gene

    // Set up animation transitions but don't start any animation automatically
    this.state.data.setMix('action/idle/normal', 'action/run', 0.2)
    this.state.data.setMix('action/run', 'action/idle/normal', 0.2)
  }

  // Helper method to start idle animation with optional delay
  startIdleAnimation(delay: number = 0) {
    this.state.setAnimation(0, 'action/idle/normal', true)
    if (delay > 0) {
      this.state.tracks[0].trackTime = delay
    }
  }
}

export class AxieCenter {
  genesData: string
  samplesData: string
  variantsData: string
  animationsData: string

  axies = new Map<string, Axie>()

  constructor() {
    this.genesData = ''
    this.samplesData = ''
    this.variantsData = ''
    this.animationsData = ''
  }

  async init() {
    const [animations, genes, samples, variants] = await Promise.all([
      fetch('../data-compressed/axie-2d-v3-stuff-animations.ttt').then((response) => response.arrayBuffer()),
      fetch('../data-compressed/axie-2d-v3-stuff-genes.ttt').then((response) => response.arrayBuffer()),
      fetch('../data-compressed/axie-2d-v3-stuff-samples.ttt').then((response) => response.arrayBuffer()),
      fetch('../data-compressed/axie-2d-v3-stuff-variant.ttt').then((response) => response.arrayBuffer()),
    ])

    this.genesData = JSON.parse(pako.inflate(genes, { to: 'string' }))
    this.samplesData = JSON.parse(pako.inflate(samples, { to: 'string' }))
    this.variantsData = JSON.parse(pako.inflate(variants, { to: 'string' }))
    this.animationsData = JSON.parse(pako.inflate(animations, { to: 'string' }))

    initAxieMixer(this.genesData, this.samplesData, this.variantsData, this.animationsData)
  }

  async createBatch(axies: AxieType[]) {
    // Create Axies sequentially to avoid conflicts with shared Assets system
    for (const axie of axies) {
      await this.create(axie.id, axie.genes)
    }
  }

  async create(id: string, gene: string, cache = true) {
    if (cache && this.axies.has(id)) {
      return this.axies.get(id)!
    }

    const meta = new Map()

    const { skeletonDataAsset, variant }: AxieBuilderResult = getAxieSpineFromGenes(gene, meta, false)

    const resources = getResources({
      spine: skeletonDataAsset,
      variant,
    })

    // Load textures directly without using global Assets system
    const texturePromises = resources.map(async (resource) => {
      const texture = await Texture.fromURL(resource.imagePath)
      return { key: resource.key, texture }
    })

    const loadedTextures = await Promise.all(texturePromises)

    // Create texture hash for this specific Axie
    const textureHash: Record<string, Texture> = {}
    loadedTextures.forEach(({ key, texture }) => {
      textureHash[key] = texture
    })

    // Create individual TextureAtlas for each Axie to avoid conflicts
    const spineAtlas = new TextureAtlas()
    spineAtlas.addTextureHash(textureHash, false)

    const spineAtlasLoader = new AtlasAttachmentLoader(spineAtlas)
    const spineJsonParser = new SkeletonJson(spineAtlasLoader)
    const spineData = spineJsonParser.readSkeletonData(skeletonDataAsset)

    const spine = new Axie(gene, spineData)

    this.axies.set(id, spine)

    return spine
  }

  clear() {
    this.axies.clear()
  }
}
