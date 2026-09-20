import type { BathroomRoom } from "../constraints";

export function isRoomUsable(room: BathroomRoom): boolean {
  return [room.widthM, room.depthM, room.heightM].every((value) => Number.isFinite(value) && value > 0);
}

export function roomCenter(room: BathroomRoom): { x: number; y: number } {
  void room;
  return { x: 0, y: 0 };
}
