import {
  Component,
  effect,
  EventEmitter,
  inject,
  Input,
  OnDestroy,
  Output,
  PLATFORM_ID,
  signal,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Song } from '../../../core/models/song';
import { SongService } from '../../../core/services/song/song.service';
import { CustomInput } from '../custom-input/custom-input';
import { CustomButton } from '../custom-button/custom-button';
import { SongCard } from '../song-card/song-card';
import { SongCardSkeleton } from '../song-card-skeleton/song-card-skeleton';

type OrderByOption =
  | 'title:asc'
  | 'title:desc'
  | 'artist:asc'
  | 'artist:desc'
  | 'duration:asc'
  | 'duration:desc';

const ORDER_LABELS: Record<OrderByOption, string> = {
  'title:asc': 'Título A-Z',
  'title:desc': 'Título Z-A',
  'artist:asc': 'Artista A-Z',
  'artist:desc': 'Artista Z-A',
  'duration:asc': 'Duração ↑',
  'duration:desc': 'Duração ↓',
};

@Component({
  selector: 'song-list',
  imports: [CustomInput, CustomButton, SongCard, SongCardSkeleton],
  templateUrl: './song-list.html',
  styleUrl: './song-list.scss',
})
export class SongList implements OnDestroy {
  @Input({ required: false }) public selectedSongId?: number;
  @Input({ required: false }) public className = '';
  @Output() public selectSong = new EventEmitter<Song>();
  @Output() public songsChange = new EventEmitter<Song[]>();
  @Output() public filtersChange = new EventEmitter<{ query: string; orderBy: OrderByOption }>();

  public readonly songs = signal<Song[]>([]);
  public readonly isLoading = signal(true);
  public readonly isLoadingMore = signal(false);
  public readonly error = signal<string | null>(null);
  public readonly searchQuery = signal('');
  public readonly orderBy = signal<OrderByOption>('title:asc');
  public readonly showFilters = signal(false);
  public readonly hasMore = signal(true);
  public readonly hasUserScrolled = signal(false);

  public readonly orderOptions = Object.keys(ORDER_LABELS) as OrderByOption[];
  public readonly orderLabels = ORDER_LABELS;
  public readonly pageSize = 10;
  private page = 1;

  private readonly songService = inject(SongService);
  private readonly platformId = inject(PLATFORM_ID);

  public constructor() {
    effect((onCleanup) => {
      const query = this.searchQuery();
      const sort = this.orderBy();
      this.isLoading.set(true);

      if (!isPlatformBrowser(this.platformId)) return this.loadSongs(query, sort);

      const timeoutId = setTimeout(() => this.loadSongs(query, sort), 300);

      onCleanup(() => clearTimeout(timeoutId));
    });
  }

  public ngOnDestroy(): void {
  }

  public loadSongs(query = this.searchQuery(), sort = this.orderBy()) {
    this.isLoading.set(true);
    this.isLoadingMore.set(false);
    this.error.set(null);
    this.filtersChange.emit({ query, orderBy: sort });
    this.page = 1;
    this.hasMore.set(true);
    this.songService
      .findMany({
        title: query,
        orderBy: sort,
        limit: this.pageSize,
        page: this.page,
      })
      .subscribe({
        next: (result) => {
          this.songs.set(result);
          this.hasMore.set(result.length === this.pageSize);
          this.songsChange.emit(result);
          this.isLoading.set(false);
        },
        error: () => {
          this.error.set('Erro ao carregar músicas. Tente novamente.');
          this.isLoading.set(false);
        },
      });
  }

  public clearSearch() {
    this.searchQuery.set('');
  }

  public onScroll(event: Event): void {
    if (!isPlatformBrowser(this.platformId)) return;
    const target = event.target as HTMLDivElement;
    if (!target) return;
    if (target.scrollTop > 0 && !this.hasUserScrolled()) {
      this.hasUserScrolled.set(true);
    }
    const nearBottom =
      target.scrollTop + target.clientHeight >= target.scrollHeight - 24;
    if (nearBottom && this.hasUserScrolled() && this.songs().length >= this.pageSize) {
      this.loadMore();
    }
  }

  private loadMore(): void {
    if (this.isLoading() || this.isLoadingMore() || !this.hasMore()) return;
    this.isLoadingMore.set(true);
    this.page += 1;
    const query = this.searchQuery();
    const sort = this.orderBy();
    this.songService
      .findMany({
        title: query,
        orderBy: sort,
        limit: this.pageSize,
        page: this.page,
      })
      .subscribe({
        next: (result) => {
          const merged = [...this.songs(), ...result];
          this.songs.set(merged);
          this.hasMore.set(result.length === this.pageSize);
          this.songsChange.emit(merged);
          this.isLoadingMore.set(false);
        },
        error: () => {
          this.error.set('Erro ao carregar mÇÎ¶õsicas. Tente novamente.');
          this.isLoadingMore.set(false);
        },
      });
  }
}


