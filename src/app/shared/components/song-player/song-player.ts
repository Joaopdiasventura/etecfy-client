import {
  AfterViewInit,
  Component,
  ElementRef,
  EventEmitter,
  inject,
  Input,
  OnChanges,
  OnDestroy,
  Output,
  PLATFORM_ID,
  signal,
  ViewChild,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Song } from '../../../core/models/song';
import { SongChunk } from '../../../core/models/song-chunk';
import { SongChunkService } from '../../../core/services/song-chunk/song-chunk.service';
import { formatDuration } from '../../utils/validators';
import { CustomButton } from '../custom-button/custom-button';
import { Slider } from '../slider/slider';
import { SongDetailSkeleton } from '../song-detail-skeleton/song-detail-skeleton';
import { Capacitor } from '@capacitor/core';
import { MediaSession as NativeMediaSession } from '@capgo/capacitor-media-session';

@Component({
  selector: 'song-player',
  imports: [CustomButton, Slider, SongDetailSkeleton],
  inputs: ['playlist', 'currentIndex'],
  templateUrl: './song-player.html',
  styleUrl: './song-player.scss',
})
export class SongPlayer implements AfterViewInit, OnChanges, OnDestroy {
  private static activeAudio: HTMLAudioElement | null = null;
  @Input() isLoading = false;
  @Input() showBack = false;
  @Input() playlist: Song[] | null = null;
  @Input() currentIndex = -1;
  @Output() back = new EventEmitter<void>();
  @Output() playIndex = new EventEmitter<number>();
  @Output() loadMore = new EventEmitter<void>();

  @ViewChild('audio', { static: false }) audioRef?: ElementRef<HTMLAudioElement>;

  public readonly isPlaying = signal(false);
  public readonly currentTime = signal(0);
  public readonly volume = signal(1);
  public readonly isMuted = signal(false);
  public readonly isRepeat = signal(false);
  public readonly isShuffle = signal(false);
  public readonly chunks = signal<SongChunk[]>([]);
  public readonly isLoadingAudio = signal(false);
  public readonly showLyrics = signal(false);
  public readonly math = Math;

  private readonly songSignal = signal<Song | null>(null);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly songChunkService = inject(SongChunkService);
  private readonly hostRef = inject(ElementRef<HTMLElement>);

  private audio?: HTMLAudioElement;
  private mediaSource?: MediaSource;
  private sourceBuffer?: SourceBuffer;
  private objectUrl: string | null = null;
  private sessionId = 0;
  private currentChunkIndex = 0;
  private nextAppendScheduled = false;
  private lastLoadedSongId: number | null = null;
  private autoPlayOnLoad = false;
  private order: number[] = [];
  private pendingAdvanceAfterLoad = false;
  private pendingAdvanceDirection: 'next' | 'prev' | null = null;
  private lastPlaylistLength = 0;
  private noMoreAfterLoad = false;
  private ignorePauseEvent = false;
  private chunkDurations: number[] = [];
  private chunkStarts: number[] = [];
  private totalDuration = 0;
  private firstAppendDone = false;
  private isSeeking = false;
  private pendingSeekTime: number | null = null;
  private activeFetchControllers = new Set<AbortController>();
  private scheduledTimeUpdateHandlers = new Set<(ev: Event) => void>();
  private mediaSessionInitialized = false;
  private nativeSessionInitialized = false;

  @Input() public set song(value: Song | null) {
    const prev = this.songSignal();
    this.songSignal.set(value);
    if (value && (!prev || prev.id !== value.id)) {
      this.pendingSeekTime = null;
      this.isSeeking = false;
      this.currentTime.set(0);
      if (this.audio) this.audio.currentTime = 0;
    }
    this.tryLoadSong();
  }

  public get song() {
    return this.songSignal();
  }

  public ngAfterViewInit(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    if (!this.audioRef?.nativeElement) return;

    this.audio = this.audioRef.nativeElement;
    this.audio.volume = this.volume();
    this.audio.muted = this.isMuted();

    this.audio.addEventListener('timeupdate', () => {
      if (!this.audio || this.isSeeking) return;
      this.currentTime.set(this.audio.currentTime);
      this.scheduleNextAppend(this.currentChunkIndex, this.sessionId);
      this.updateMediaSessionPosition();
      this.updateNativePlaybackState();
    });

    this.audio.addEventListener('play', () => this.isPlaying.set(true));
    this.audio.addEventListener('playing', () => {
      this.ignorePauseEvent = false;
      this.isPlaying.set(true);
      this.updateMediaSessionPlaybackState();
      this.updateNativePlaybackState();
    });
    this.audio.addEventListener('pause', () => {
      if (this.ignorePauseEvent) return;
      this.isPlaying.set(false);
      this.updateMediaSessionPlaybackState();
      this.updateNativePlaybackState();
    });
    this.audio.addEventListener('ended', () => {
      this.isPlaying.set(false);
      this.onNext();
    });

    if (this.songSignal()) {
      this.tryLoadSong();
    }

    this.setupMediaSession();
    this.initNativeSession();
  }

  public ngOnDestroy(): void {
    this.cancelPendingWork();
    this.teardownMediaPipeline();
    if (SongPlayer.activeAudio === this.audio) {
      SongPlayer.activeAudio = null;
    }
  }

  public togglePlay() {
    if (!this.audio || !this.isVisible()) return;
    if (this.audio.paused) {
      this.setActiveAudio();
      this.audio
        .play()
        .then(() => this.isPlaying.set(true))
        .catch(() => this.isPlaying.set(false));
    } else {
      this.audio.pause();
      this.isPlaying.set(false);
    }
  }

  public seek(value: number) {
    this.onSeek(value);
  }

  public changeVolume(value: number) {
    this.volume.set(value);
    const muted = value === 0;
    this.isMuted.set(muted);
    if (this.audio) {
      this.audio.volume = value;
      this.audio.muted = muted;
    }
  }

  public toggleMute() {
    this.isMuted.update((prev) => !prev);
    if (this.audio) {
      this.audio.muted = this.isMuted();
    }
  }

  public toggleShuffle(): void {
    this.isShuffle.update((prev) => !prev);
    this.rebuildOrder();
  }

  public toggleRepeat(): void {
    this.isRepeat.update((prev) => !prev);
  }

  public onNext(): void {
    const nextIndex = this.computeNextIndex();
    if (nextIndex == null) {
      if (!this.pendingAdvanceAfterLoad && !this.noMoreAfterLoad) {
        this.pendingAdvanceAfterLoad = true;
        this.pendingAdvanceDirection = 'next';
        this.lastPlaylistLength = this.playlist?.length ?? 0;
        this.loadMore.emit();
      }
      return;
    }
    this.playIndex.emit(nextIndex);
  }

  public onPrev(): void {
    if (!this.playlist || !this.playlist.length) return;
    if (this.audio && this.audio.currentTime > 3) {
      this.onSeek(0);
      return;
    }
    const prevIndex = this.computePrevIndex();
    if (prevIndex == null) {
      if (!this.pendingAdvanceAfterLoad && !this.noMoreAfterLoad) {
        this.pendingAdvanceAfterLoad = true;
        this.pendingAdvanceDirection = 'prev';
        this.lastPlaylistLength = this.playlist?.length ?? 0;
        this.loadMore.emit();
      }
      return;
    }
    this.playIndex.emit(prevIndex);
  }

  public toggleLyrics() {
    this.showLyrics.update((prev) => !prev);
  }

  public formatDuration = formatDuration;

  public ngOnChanges(): void {
    const len = this.playlist?.length ?? 0;
    this.rebuildOrder();
    if (this.pendingAdvanceAfterLoad) {
      if (len > this.lastPlaylistLength) {
        this.noMoreAfterLoad = false;
        const nextIndex =
          this.pendingAdvanceDirection === 'prev'
            ? this.computePrevIndex()
            : this.computeNextIndex();
        this.pendingAdvanceAfterLoad = false;
        this.pendingAdvanceDirection = null;
        if (nextIndex != null) {
          this.playIndex.emit(nextIndex);
        }
      } else {
        this.noMoreAfterLoad = true;
        this.pendingAdvanceAfterLoad = false;
        this.pendingAdvanceDirection = null;
      }
    } else if (len > this.lastPlaylistLength) {
      this.noMoreAfterLoad = false;
    }
    this.lastPlaylistLength = len;
  }

  private tryLoadSong(): void {
    const song = this.songSignal();
    if (!song || !this.audio || !this.isVisible()) return;

    if (this.lastLoadedSongId === song.id) return;
    this.lastLoadedSongId = song.id;
    this.handleSongChange();
  }

  private handleSongChange(): void {
    const song = this.songSignal();
    if (!song || !this.audio) return;
    this.ignorePauseEvent = true;
    this.isPlaying.set(false);
    this.audio.pause();
    this.sessionId++;
    this.autoPlayOnLoad = true;
    this.cancelPendingWork();
    this.teardownMediaPipeline();
    this.isLoadingAudio.set(true);
    this.showLyrics.set(false);
    this.currentTime.set(0);
    this.updateMediaSessionMetadata();
    this.updateMediaSessionPlaybackState();
    this.updateMediaSessionPosition();
    this.updateNativeMetadata();
    this.updateNativePlaybackState();
    this.loadChunks(song.id, 0, this.sessionId);
  }

  private loadChunks(songId: number, seekTo: number, session: number): void {
    this.songChunkService.findAllBySong(songId).subscribe({
      next: (chunks) => {
        if (session !== this.sessionId) return;
        this.chunks.set(chunks);
        this.chunkDurations = chunks.map((c) => c.duration || 5);
        this.chunkStarts = [];
        let acc = 0;
        for (const duration of this.chunkDurations) {
          this.chunkStarts.push(acc);
          acc += duration;
        }
        this.totalDuration = acc;
        this.currentChunkIndex = this.findChunkByTime(seekTo);
        if (this.audio) this.audio.currentTime = 0;
        this.updateMediaSessionPosition();
        this.updateNativeMetadata();
        this.updateNativePlaybackState();

        this.createMediaPipeline(seekTo, session);
      },
      error: () => {
        this.ignorePauseEvent = false;
        this.isLoadingAudio.set(false);
      },
    });
  }

  private createMediaPipeline(seekTo: number, session: number): void {
    if (!this.audio) return;
    this.mediaSource = new MediaSource();
    if (this.objectUrl) URL.revokeObjectURL(this.objectUrl);
    this.objectUrl = URL.createObjectURL(this.mediaSource);
    this.audio.src = this.objectUrl;
    this.firstAppendDone = false;

    this.mediaSource.addEventListener(
      'sourceopen',
      () => {
        if (session !== this.sessionId || !this.mediaSource) return;
        this.mediaSource.duration = this.totalDuration || 1e6;
        this.sourceBuffer = this.mediaSource.addSourceBuffer('audio/mpeg');
        this.sourceBuffer.mode = 'sequence';
        this.sourceBuffer.addEventListener('updateend', () => {
          if (session !== this.sessionId) return;
          if (!this.firstAppendDone) {
            this.firstAppendDone = true;
            const targetTime = this.pendingSeekTime ?? seekTo;
            const safe = Math.max(
              targetTime,
              (this.chunkStarts[this.currentChunkIndex] ?? 0) + 0.01
            );
            try {
              this.audio!.currentTime = safe;
            } finally {
              this.currentTime.set(targetTime);
              this.isSeeking = false;
              this.pendingSeekTime = null;
              this.isLoadingAudio.set(false);
              if (this.autoPlayOnLoad) {
                if (this.isVisible()) {
                  this.setActiveAudio();
                  this.audio!.play()
                    .then(() => this.isPlaying.set(true))
                    .catch(() => this.isPlaying.set(false));
                }
                this.autoPlayOnLoad = false;
              } else if (this.isPlaying()) {
                this.audio!.play();
              }
              this.updateMediaSessionPlaybackState();
              this.updateMediaSessionPosition();
              this.updateNativePlaybackState();
              this.scheduleNextAppend(this.currentChunkIndex, session);
            }
          } else {
            const next = this.currentChunkIndex + 1;
            if (next < this.chunks().length) {
              this.scheduleNextAppend(this.currentChunkIndex, session);
            } else {
              try {
                this.mediaSource?.endOfStream();
              } catch {}
            }
          }
        });

        const targetTime = this.pendingSeekTime ?? seekTo;
        const idx = this.findChunkByTime(targetTime);
        this.currentChunkIndex = idx;
        const offset = this.chunkStarts[idx] ?? 0;
        try {
          this.sourceBuffer.timestampOffset = offset;
        } finally {
          this.appendChunk(idx, session);
        }
      },
      { once: true }
    );
  }

  private rebuildOrder(): void {
    if (!this.playlist || !this.playlist.length) {
      this.order = [];
      return;
    }
    const n = this.playlist.length;
    if (!this.isShuffle()) {
      this.order = Array.from({ length: n }, (_, i) => i);
      return;
    }
    const rest: number[] = [];
    for (let i = 0; i < n; i++) if (i !== this.currentIndex) rest.push(i);
    for (let i = rest.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [rest[i], rest[j]] = [rest[j], rest[i]];
    }
    this.order = this.currentIndex >= 0 ? [this.currentIndex, ...rest] : rest;
  }

  private computeNextIndex(): number | null {
    if (!this.playlist || !this.playlist.length) return null;
    if (this.currentIndex < 0) return 0;
    if (!this.isShuffle()) {
      const next = this.currentIndex + 1;
      if (next < this.playlist.length) return next;
      if (this.isRepeat()) return 0;
      return null;
    }
    const pos = this.order.indexOf(this.currentIndex);
    if (pos < 0) return null;
    const nextPos = pos + 1;
    if (nextPos < this.order.length) return this.order[nextPos];
    if (this.isRepeat()) return this.order[0] ?? null;
    return null;
  }

  private computePrevIndex(): number | null {
    if (!this.playlist || !this.playlist.length) return null;
    if (this.currentIndex < 0) return null;
    if (!this.isShuffle()) {
      const prev = this.currentIndex - 1;
      if (prev >= 0) return prev;
      if (this.isRepeat()) return this.playlist.length - 1;
      return null;
    }
    const pos = this.order.indexOf(this.currentIndex);
    if (pos < 0) return null;
    const prevPos = pos - 1;
    if (prevPos >= 0) return this.order[prevPos];
    if (this.isRepeat()) return this.order[this.order.length - 1] ?? null;
    return null;
  }

  public get canNext(): boolean {
    if (this.computeNextIndex() !== null) return true;
    if (this.pendingAdvanceAfterLoad) return false;
    return !this.noMoreAfterLoad;
  }

  public get canPrevious(): boolean {
    if (!this.audio) return this.computePrevIndex() !== null;
    if (this.audio.currentTime > 3) return true;
    return this.computePrevIndex() !== null;
  }

  private teardownMediaPipeline(): void {
    this.cancelPendingWork();
    try {
      if (this.sourceBuffer?.updating) this.sourceBuffer.abort();
    } catch {}
    try {
      if (this.mediaSource && this.mediaSource.readyState !== 'closed') {
        this.mediaSource.endOfStream();
      }
    } catch {}
    this.nextAppendScheduled = false;
    this.firstAppendDone = false;
    try {
      if (this.objectUrl) URL.revokeObjectURL(this.objectUrl);
    } catch {}
    this.objectUrl = null;
    try {
      if (this.audio) this.audio.removeAttribute('src');
    } catch {}
  }

  private onSeek(time: number): void {
    if (!this.audio) return;
    const duration = this.totalDuration || this.songSignal()?.duration || time;
    let clamped = Math.max(0, Math.min(time, duration));
    clamped = this.clampToLastChunkStart(clamped);
    this.pendingSeekTime = clamped;
    this.currentTime.set(clamped);
    this.isSeeking = true;
    if (!this.mediaSource || !this.firstAppendDone) {
      if (this.mediaSource) {
        this.hardSeek(clamped);
      }
      return;
    }
    const idx = this.findChunkByTime(clamped);
    const curIdx = this.findChunkByTime(this.audio.currentTime);
    if (idx !== curIdx) {
      this.hardSeek(clamped);
      return;
    }
    this.audio.currentTime = clamped;
    this.isSeeking = false;
    this.updateMediaSessionPosition();
    this.updateNativePlaybackState();
  }

  private hardSeek(time: number): void {
    if (!this.mediaSource) return;
    const wasPlaying = this.isPlaying();
    if (this.audio && !this.audio.paused) {
      this.audio.pause();
    }
    this.teardownMediaPipeline();
    this.createMediaPipeline(time, this.sessionId);
    if (wasPlaying) this.isPlaying.set(true);
    this.updateMediaSessionPlaybackState();
    this.updateNativePlaybackState();
  }

  private scheduleNextAppend(prevIndex: number, session: number): void {
    if (this.nextAppendScheduled || !this.audio) return;
    const next = prevIndex + 1;
    if (next >= this.chunks().length) return;
    this.nextAppendScheduled = true;
    const threshold =
      (this.chunkStarts[prevIndex] ?? 0) + (this.chunkDurations[prevIndex] ?? 0) * 0.55;

    const fn = (): void => {
      if (session !== this.sessionId || !this.audio) {
        try {
          this.audio?.removeEventListener('timeupdate', fn);
        } catch {}
        this.scheduledTimeUpdateHandlers.delete(fn);
        return;
      }
      if (this.audio.currentTime >= threshold) {
        this.audio.removeEventListener('timeupdate', fn);
        this.scheduledTimeUpdateHandlers.delete(fn);
        this.nextAppendScheduled = false;
        this.appendChunk(next, session);
        this.currentChunkIndex = next;
      }
    };

    if (this.audio.currentTime >= threshold) {
      this.nextAppendScheduled = false;
      this.appendChunk(next, session);
      this.currentChunkIndex = next;
    } else {
      this.audio.addEventListener('timeupdate', fn);
      this.scheduledTimeUpdateHandlers.add(fn);
    }
  }

  private async appendChunk(index: number, session: number): Promise<void> {
    if (!this.mediaSource || index >= this.chunks().length) return;
    if (session !== this.sessionId) return;
    const chunk = this.chunks()[index];
    const controller = new AbortController();
    this.activeFetchControllers.add(controller);
    let buf: ArrayBuffer | null = null;
    try {
      const res = await fetch(chunk.url, { signal: controller.signal });
      buf = await res.arrayBuffer();
    } catch {
      this.activeFetchControllers.delete(controller);
      return;
    }
    this.activeFetchControllers.delete(controller);
    if (session !== this.sessionId) return;
    if (!this.sourceBuffer) return;
    await this.waitNotUpdating(session);
    try {
      if (!buf) return;
      if (!this.mediaSource || this.mediaSource.readyState !== 'open') return;
      this.sourceBuffer.appendBuffer(buf);
    } catch {}
  }

  private waitNotUpdating(session: number): Promise<void> {
    if (session !== this.sessionId || !this.sourceBuffer) return Promise.resolve();
    if (!this.sourceBuffer.updating) return Promise.resolve();
    return new Promise((resolve) => {
      const h = (): void => {
        if (session !== this.sessionId) {
          try {
            this.sourceBuffer?.removeEventListener('updateend', h);
          } catch {}
          resolve();
          return;
        }
        if (!this.sourceBuffer?.updating) {
          this.sourceBuffer?.removeEventListener('updateend', h);
          resolve();
        }
      };
      this.sourceBuffer?.addEventListener('updateend', h);
    });
  }

  private findChunkByTime(t: number): number {
    if (!this.chunkStarts.length) return 0;
    for (let i = this.chunkStarts.length - 1; i >= 0; i--) {
      const s = this.chunkStarts[i] ?? 0;
      const e = s + (this.chunkDurations[i] ?? 0);
      if (t >= s && t < e) return i;
    }
    return Math.max(0, this.chunkStarts.length - 1);
  }

  private clampToLastChunkStart(time: number): number {
    if (!this.chunkStarts.length) return time;
    const lastStart = this.chunkStarts[this.chunkStarts.length - 1] ?? 0;
    const snapPoint = Math.max(0, lastStart - 1);
    return time >= lastStart ? snapPoint : time;
  }

  private cancelPendingWork(): void {
    for (const controller of this.activeFetchControllers) {
      try {
        controller.abort();
      } catch {}
    }
    this.activeFetchControllers.clear();
    try {
      if (this.audio) {
        for (const fn of this.scheduledTimeUpdateHandlers) {
          try {
            this.audio.removeEventListener('timeupdate', fn);
          } catch {}
        }
      }
    } catch {}
    this.scheduledTimeUpdateHandlers.clear();
    this.nextAppendScheduled = false;
  }

  private setActiveAudio(): void {
    if (!this.audio) return;
    if (SongPlayer.activeAudio && SongPlayer.activeAudio !== this.audio) {
      try {
        SongPlayer.activeAudio.pause();
      } catch {}
    }
    SongPlayer.activeAudio = this.audio;
  }

  private isVisible(): boolean {
    const host = this.hostRef.nativeElement;
    return host.isConnected && host.getClientRects().length > 0;
  }

  private setupMediaSession(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    if (this.mediaSessionInitialized) return;
    const nav = (globalThis as unknown as { navigator?: Navigator }).navigator;
    if (!nav || !('mediaSession' in nav)) return;
    const ms = (nav as unknown as { mediaSession?: MediaSession }).mediaSession;
    if (!ms) return;
    try {
      ms.setActionHandler('play', () => this.handleMediaPlay());
      ms.setActionHandler('pause', () => this.handleMediaPause());
      ms.setActionHandler('previoustrack', () => this.onPrev());
      ms.setActionHandler('nexttrack', () => this.onNext());
      ms.setActionHandler('seekto', (d: MediaSessionActionDetails) => {
        const t = typeof d?.seekTime == 'number' ? d.seekTime : this.audio?.currentTime ?? 0;
        this.onSeek(t);
      });
      ms.setActionHandler('seekbackward', (d: MediaSessionActionDetails) => {
        const off = typeof d?.seekOffset == 'number' ? d.seekOffset : 10;
        const cur = this.audio?.currentTime ?? 0;
        this.onSeek(Math.max(0, cur - off));
      });
      ms.setActionHandler('seekforward', (d: MediaSessionActionDetails) => {
        const off = typeof d?.seekOffset == 'number' ? d.seekOffset : 10;
        const cur = this.audio?.currentTime ?? 0;
        const dur = this.songSignal()?.duration ?? this.totalDuration;
        this.onSeek(Math.min(dur, cur + off));
      });
      this.mediaSessionInitialized = true;
    } catch {}
  }

  private handleMediaPlay(): void {
    const active = SongPlayer.activeAudio ?? this.audio;
    if (!active) return;
    if (active === this.audio) {
      this.setActiveAudio();
    }
    active
      .play()
      .then(() => {
        if (active === this.audio) this.isPlaying.set(true);
      })
      .catch(() => {
        if (active === this.audio) this.isPlaying.set(false);
      });
  }

  private handleMediaPause(): void {
    const active = SongPlayer.activeAudio ?? this.audio;
    if (!active) return;
    active.pause();
    if (active === this.audio) {
      this.isPlaying.set(false);
    }
  }

  private updateMediaSessionMetadata(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    const nav = (globalThis as unknown as { navigator?: Navigator }).navigator;
    if (!nav || !('mediaSession' in nav)) return;
    const ms = (nav as unknown as { mediaSession?: MediaSession }).mediaSession;
    if (!ms) return;
    const s = this.songSignal();
    try {
      ms.metadata = s
        ? new MediaMetadata({
            title: s.title,
            artist: s.artist,
            album: '',
            artwork: s.thumbnail ? [{ src: s.thumbnail }] : [],
          })
        : null;
    } catch {}
  }

  private updateMediaSessionPlaybackState(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    const nav = (globalThis as unknown as { navigator?: Navigator }).navigator;
    if (!nav || !('mediaSession' in nav)) return;
    const ms = (nav as unknown as { mediaSession?: MediaSession }).mediaSession;
    if (!ms) return;
    try {
      ms.playbackState = this.isPlaying() ? 'playing' : 'paused';
    } catch {}
  }

  private updateMediaSessionPosition(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    const nav = (globalThis as unknown as { navigator?: Navigator }).navigator;
    if (!nav || !('mediaSession' in nav)) return;
    const ms = (
      nav as unknown as {
        mediaSession?: MediaSession & { setPositionState?: (state?: MediaPositionState) => void };
      }
    ).mediaSession;
    if (!ms || typeof ms.setPositionState !== 'function') return;
    const duration = this.getPlaybackDuration();
    const position = this.audio?.currentTime ?? 0;
    try {
      ms.setPositionState({
        duration,
        playbackRate: 1,
        position: duration > 0 ? Math.min(position, duration) : position,
      });
    } catch {}
  }

  private getPlaybackDuration(): number {
    const fromSong = this.songSignal()?.duration ?? 0;
    const fromChunks = this.totalDuration ?? 0;
    const fromAudio = this.audio?.duration ?? 0;
    const candidates = [fromSong, fromChunks, fromAudio].filter(
      (value) => Number.isFinite(value) && value > 0
    );
    return candidates.length ? Math.max(...candidates) : 0;
  }

  private initNativeSession(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    if (!Capacitor.isNativePlatform()) return;
    if (this.nativeSessionInitialized) return;
    try {
      NativeMediaSession.setActionHandler({ action: 'play' }, () => this.handleMediaPlay());
      NativeMediaSession.setActionHandler({ action: 'pause' }, () => this.handleMediaPause());
      NativeMediaSession.setActionHandler({ action: 'nexttrack' }, () => this.onNext());
      NativeMediaSession.setActionHandler({ action: 'previoustrack' }, () => this.onPrev());
      NativeMediaSession.setActionHandler({ action: 'seekto' }, (d) =>
        this.onSeek(typeof d.seekTime === 'number' ? d.seekTime : this.audio?.currentTime ?? 0)
      );
      NativeMediaSession.setActionHandler({ action: 'seekbackward' }, (d) => {
        const off = 10;
        const cur = this.audio?.currentTime ?? 0;
        this.onSeek(Math.max(0, cur - off));
      });
      NativeMediaSession.setActionHandler({ action: 'seekforward' }, (d) => {
        const off = 10;
        const cur = this.audio?.currentTime ?? 0;
        const dur = this.getPlaybackDuration();
        this.onSeek(Math.min(dur, cur + off));
      });
      this.nativeSessionInitialized = true;
      this.updateNativeMetadata();
      this.updateNativePlaybackState();
    } catch {}
  }

  private updateNativeMetadata(): void {
    if (!Capacitor.isNativePlatform()) return;
    const s = this.songSignal();
    try {
      NativeMediaSession.setMetadata({
        title: s?.title ?? '',
        artist: s?.artist ?? '',
        album: '',
        artwork: s?.thumbnail ? [{ src: s.thumbnail }] : [],
      });
    } catch {}
  }

  private updateNativePlaybackState(): void {
    if (!Capacitor.isNativePlatform()) return;
    const duration = this.getPlaybackDuration();
    const position = this.audio?.currentTime ?? 0;
    try {
      NativeMediaSession.setPlaybackState({
        playbackState: this.isPlaying() ? 'playing' : 'paused',
      });
      NativeMediaSession.setPositionState({
        duration,
        playbackRate: 1,
        position: duration > 0 ? Math.min(position, duration) : position,
      });
    } catch {}
  }
}
