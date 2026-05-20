import { BanningRoom } from '@/rooms/banning'
import { Command } from '@colyseus/command'

export class OnCreateCommand extends Command<BanningRoom, Record<string, never>> {
  execute() {
    console.log('[✅][OnCreate]', this.room.roomId)
  }
}
