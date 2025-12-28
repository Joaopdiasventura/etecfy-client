import { inject, Injectable } from '@angular/core';
import { CanActivate, GuardResult, MaybeAsync } from '@angular/router';
import { UserService } from '../../services/user/user.service';
import { AuthService } from '../../services/auth/auth.service';
import { User } from '../../models/user';
import { catchError, map, Observable, of, switchMap } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class AuthGuard implements CanActivate {
  private readonly userService = inject(UserService);
  private readonly authService = inject(AuthService);

  public canActivate(): MaybeAsync<GuardResult> {
    return this.authService.$user.pipe(switchMap((user) => this.connectUser(user)));
  }

  private connectUser(user: User | null): Observable<boolean> {
    if (user) return of(true);

    return this.userService.decodeToken().pipe(
      map((result) => {
        this.authService.updateUserData(result);
        return true;
      }),
      catchError(() => of(true))
    );
  }
}
