/**
 * Socket.IO event contract (requirements.md §14). Used as generics on both ends:
 * server: `new Server<ClientToServerEvents, ServerToClientEvents, Record<string, never>, SocketData>`
 * client: `Socket<ServerToClientEvents, ClientToServerEvents>`
 */
import type { SeatId } from './schemas/common.js';
import type {
  JoinedRoom,
  PlayerReadyPayload,
  ProgressBroadcast,
  ProgressPayload,
  RoomCreatePayload,
  RoomJoinPayload,
  RoomSnapshot,
} from './schemas/socket.js';
import type { ErrorCode } from './types/errors.js';
import type { Result } from './types/result.js';

export type Ack<T> = (result: Result<T>) => void;

export interface ClientToServerEvents {
  'room:create': (p: RoomCreatePayload, ack: Ack<JoinedRoom>) => void;
  'room:join': (p: RoomJoinPayload, ack: Ack<JoinedRoom>) => void;
  'room:leave': () => void;
  'player:ready': (p: PlayerReadyPayload) => void;
  'race:progress': (p: ProgressPayload) => void;
  'race:rematch': () => void;
}

export interface ServerToClientEvents {
  /** Full snapshot on every phase/seat/ready/connection change. */
  'room:state': (s: RoomSnapshot) => void;
  /** Hot path, during racing only. */
  'race:progress': (p: ProgressBroadcast) => void;
  'server:error': (e: { code: ErrorCode; message: string }) => void;
}

export type SocketData = {
  userId: string | null;
  username: string | null;
  roomCode: string | null;
  seatId: SeatId | null;
};
