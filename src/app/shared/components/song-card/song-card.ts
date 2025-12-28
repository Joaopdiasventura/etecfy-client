import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { Song } from '../../../core/models/song';
import { formatDuration } from '../../utils/validators';

@Component({
  selector: 'song-card',
  imports: [],
  templateUrl: './song-card.html',
  styleUrl: './song-card.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SongCard {
  @Input({ required: true }) public song!: Song;
  @Input() public isActive = false;
  @Output() public select = new EventEmitter<void>();

  public formatDuration = formatDuration;
}
