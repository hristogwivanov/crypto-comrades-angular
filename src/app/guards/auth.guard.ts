import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { Observable, map, take, filter, switchMap, of, timer } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {
  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  canActivate(): Observable<boolean> {
    // Wait for Firebase auth state to initialize
    return this.authService.currentUser$.pipe(
      // Wait for the first emission that's not null or wait for a timeout
      switchMap(user => {
        if (user !== null) {
          // User is authenticated
          return of(true);
        } else {
          // User is null, but we need to make sure Firebase has finished initializing
          // Wait briefly to see if Firebase will restore the session
          return timer(1000).pipe(
            switchMap(() => this.authService.currentUser$),
            take(1),
            map(finalUser => {
              if (finalUser) {
                return true;
              } else {
                this.router.navigate(['/auth/login']);
                return false;
              }
            })
          );
        }
      }),
      take(1)
    );
  }
}
