import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { Song } from '../../models/song';
import { FindSongDto } from '../../../shared/dto/song/find-song.dto';

declare const API_URL: string;

@Injectable({
  providedIn: 'root',
})
export class SongService {
  private readonly apiUrl = API_URL + '/song';
  private readonly http = inject(HttpClient);

  public findMany(findSongDto: FindSongDto): Observable<Song[]> {
    return this.http.get<Song[]>(this.apiUrl, {
      params: Object.fromEntries(
        Object.entries(findSongDto)
          .filter(([, v]) => v != undefined && v != null && v != '')
          .map(([k, v]) => [k, String(v)])
      ),
    });
  }

  public findById(id: number): Observable<Song> {
    return this.http.get<Song>(`${this.apiUrl}/${id}`);
  }
}
