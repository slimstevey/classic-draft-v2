import { getAxieColorPartShift, getVariantAttachmentPath } from '../builder'
import type { MixedSkeletonData } from '../core/common/samples/sample-skeleton-data'

interface Mixer {
  spine: MixedSkeletonData
  variant: string
}

export function getResources(mixer: Mixer) {
  const cache = new Map<string, string>()
  const skinAttachments = mixer.spine.skins[0].attachments
  const imagesToLoad: { key: string; imagePath: string }[] = []

  const partColorShift = getAxieColorPartShift(mixer.variant)
  for (const slotName in skinAttachments) {
    const skinSlotAttachments = skinAttachments[slotName]
    for (const attachmentName in skinSlotAttachments) {
      const path = skinSlotAttachments[attachmentName].path

      if (cache.has(path)) {
        imagesToLoad.push({ key: path, imagePath: cache.get(path)! })
        continue
      }

      const imagePath = 'https://axiecdn.axieinfinity.com/mixer-stuffs/v4/' + getVariantAttachmentPath(slotName, path, mixer.variant, partColorShift)
      imagesToLoad.push({ key: path, imagePath })
    }
  }
  return imagesToLoad
}
