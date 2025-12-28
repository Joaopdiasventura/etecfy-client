import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { Song } from '../../../core/models/song';
import { SongService } from '../../../core/services/song/song.service';
import { AuthService } from '../../../core/services/auth/auth.service';
import { User } from '../../../core/models/user';
import { ThemeToggle } from '../../../shared/components/theme-toggle/theme-toggle';
import { SongList } from '../../../shared/components/song-list/song-list';
import { CustomButton } from '../../../shared/components/custom-button/custom-button';
import { SongPlayer } from '../../../shared/components/song-player/song-player';
import { ProfilePanel } from '../../../shared/components/profile-panel/profile-panel';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-home-page',
  imports: [RouterLink, ThemeToggle, SongList, CustomButton, SongPlayer, ProfilePanel],
  templateUrl: './home-page.html',
  styleUrl: './home-page.scss',
})
export class HomePage implements OnInit {
  public readonly currentUser = signal<User | null>(null);
  public readonly selectedSong = signal<Song | null>(null);
  public readonly isLoadingSong = signal(false);
  public readonly showProfile = signal(false);
  public readonly showPlayer = signal(false);
  public readonly playlist = signal<Song[]>([]);
  public readonly currentIndex = signal(-1);
  public readonly showAppDownload = computed(() => !Capacitor.isNativePlatform());

  private readonly authService = inject(AuthService);
  private readonly songService = inject(SongService);
  private lastQuery = '';
  private lastOrderBy = 'title:asc';
  private page = 1;
  private readonly pageSize = 10;

  public ngOnInit(): void {
    this.authService.disconnectUser();
    this.authService.$user.subscribe((u) => this.currentUser.set(u));
  }

  public handleSelectSong(song: Song): void {
    this.currentIndex.set(this.findIndexInPlaylist(song.id));
    this.loadSongById(song.id);
  }

  public handlePlayIndex(index: number): void {
    const songs = this.playlist();
    const target = songs[index];
    if (!target) return;
    this.currentIndex.set(index);
    this.loadSongById(target.id);
  }

  public handleSongsChange(songs: Song[]): void {
    this.playlist.set(songs);
    this.page = Math.max(1, Math.ceil(songs.length / this.pageSize));
    this.syncCurrentIndex();
  }

  public handleFiltersChange(data: { query: string; orderBy: string }): void {
    this.lastQuery = data.query;
    this.lastOrderBy = data.orderBy;
    this.page = 1;
  }

  public handleLoadMore(): void {
    const nextPage = this.page + 1;
    this.songService
      .findMany({
        title: this.lastQuery,
        orderBy: this.lastOrderBy,
        page: nextPage,
        limit: this.pageSize,
      })
      .subscribe({
        next: (result) => {
          if (!result.length) return;
          this.page = nextPage;
          const merged = this.mergePlaylist(this.playlist(), result);
          this.playlist.set(merged);
        },
      });
  }

  private loadSongById(songId: number): void {
    this.isLoadingSong.set(true);
    this.songService.findById(songId).subscribe({
      next: (result) => {
        this.showPlayer.set(true);
        this.selectedSong.set(result);
        this.isLoadingSong.set(false);
      },
      error: () => this.isLoadingSong.set(false),
    });
  }

  handleBack() {
    this.showPlayer.set(false);
  }

  private syncCurrentIndex(): void {
    const current = this.selectedSong();
    if (!current) return;
    this.currentIndex.set(this.findIndexInPlaylist(current.id));
  }

  private findIndexInPlaylist(songId: number): number {
    const list = this.playlist();
    return list.findIndex((item) => item.id === songId);
  }

  private mergePlaylist(current: Song[], incoming: Song[]): Song[] {
    const merged = new Map<number, Song>();
    for (const song of current) merged.set(song.id, song);
    for (const song of incoming) merged.set(song.id, song);
    return Array.from(merged.values());
  }
}
