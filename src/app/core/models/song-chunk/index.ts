import { Song } from '../song';

export interface SongChunk {
  id: number;
  url: string;
  duration: number;
  createdAt: Date;
  song: Song;
}
