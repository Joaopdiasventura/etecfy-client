import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { isPlatformBrowser } from '@angular/common';
import { inject, PLATFORM_ID } from '@angular/core';
import { User } from '../../models/user';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly userDataSource = new BehaviorSubject<User | null>(null);

  public get $user(): Observable<User | null> {
    return this.userDataSource.asObservable();
  }

  public updateUserData(data: User | null): void {
    this.userDataSource.next(data);
  }

  public disconnectUser(): void {
    this.updateUserData(null);
    if (isPlatformBrowser(this.platformId)) {
      document.cookie =
        'auth_token=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax';
    }
  }
}
