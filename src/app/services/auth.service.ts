import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Observable, throwError, of, from } from 'rxjs';
import { map, catchError, tap, switchMap } from 'rxjs/operators';
import { User, LoginCredentials, RegisterCredentials, AuthResponse } from '../models/user.interface';
import { Auth } from '@angular/fire/auth';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  updateProfile,
  User as FirebaseUser
} from '@angular/fire/auth';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly USER_KEY = 'current_user';

  private currentUserSubject = new BehaviorSubject<User | null>(this.getUserFromStorage());
  private isAuthenticatedSubject = new BehaviorSubject<boolean>(false);

  public currentUser$ = this.currentUserSubject.asObservable();
  public isAuthenticated$ = this.isAuthenticatedSubject.asObservable();

  private auth = inject(Auth);

  constructor() {
    this.initializeAuthState();
  }

  private initializeAuthState(): void {
    // Listen to Firebase auth state changes
    onAuthStateChanged(this.auth, (firebaseUser) => {
      if (firebaseUser) {
        const user: User = this.mapFirebaseUserToUser(firebaseUser);
        this.setUserInStorage(user);
        this.currentUserSubject.next(user);
        this.isAuthenticatedSubject.next(true);
      } else {
        this.handleLogout();
      }
    });
  }

  login(credentials: LoginCredentials): Observable<AuthResponse> {
    return from(signInWithEmailAndPassword(this.auth, credentials.email, credentials.password))
      .pipe(
        map(userCredential => {
          const user = this.mapFirebaseUserToUser(userCredential.user);
          return {
            token: userCredential.user.uid, // Use UID as token
            refreshToken: userCredential.user.refreshToken || '',
            user: user
          } as AuthResponse;
        }),
        tap(response => this.handleAuthSuccess(response)),
        catchError(this.handleFirebaseError)
      );
  }

  register(credentials: RegisterCredentials): Observable<AuthResponse> {
    return from(createUserWithEmailAndPassword(this.auth, credentials.email, credentials.password))
      .pipe(
        switchMap(userCredential => {
          // Update the user's display name to username
          const displayName = credentials.username;
          return from(updateProfile(userCredential.user, { displayName }))
            .pipe(
              map(() => userCredential)
            );
        }),
        map(userCredential => {
          const user = this.mapFirebaseUserToUser(userCredential.user);
          user.firstName = '';
          user.lastName = '';
          user.username = credentials.username;
          
          return {
            token: userCredential.user.uid,
            refreshToken: userCredential.user.refreshToken || '',
            user: user
          } as AuthResponse;
        }),
        tap(response => this.handleAuthSuccess(response)),
        catchError(this.handleFirebaseError)
      );
  }

  logout(): Observable<boolean> {
    return from(signOut(this.auth))
      .pipe(
        map(() => {
          this.handleLogout();
          return true;
        }),
        catchError(() => {
          this.handleLogout();
          return of(true);
        })
      );
  }

  refreshToken(): Observable<AuthResponse> {
    // Firebase handles token refresh automatically
    return this.getCurrentUser().pipe(
      map(user => {
        if (!user) throw new Error('No user found');
        return {
          token: this.auth.currentUser?.uid || '',
          refreshToken: this.auth.currentUser?.refreshToken || '',
          user: user
        } as AuthResponse;
      })
    );
  }

  getCurrentUser(): Observable<User | null> {
    return this.currentUser$;
  }

  private mapFirebaseUserToUser(firebaseUser: FirebaseUser): User {
    const nameParts = firebaseUser.displayName?.split(' ') || ['', ''];
    return {
      id: firebaseUser.uid,
      email: firebaseUser.email || '',
      firstName: nameParts[0] || '',
      lastName: nameParts.slice(1).join(' ') || '',
      username: firebaseUser.email?.split('@')[0] || '',
      createdAt: new Date(firebaseUser.metadata.creationTime || new Date()),
      isEmailVerified: firebaseUser.emailVerified
    };
  }

  private handleAuthSuccess(response: AuthResponse): void {
    this.setUserInStorage(response.user);
    this.currentUserSubject.next(response.user);
    this.isAuthenticatedSubject.next(true);
  }

  private handleLogout(): void {
    this.removeUserFromStorage();
    this.currentUserSubject.next(null);
    this.isAuthenticatedSubject.next(false);
  }

  private handleFirebaseError(error: any): Observable<never> {
    let errorMessage = 'An unknown error occurred';
    
    switch (error.code) {
      case 'auth/email-already-in-use':
        errorMessage = 'Email already exists. Please choose a different email.';
        break;
      case 'auth/invalid-email':
        errorMessage = 'Please enter a valid email address.';
        break;
      case 'auth/operation-not-allowed':
        errorMessage = 'Email/password authentication is not enabled.';
        break;
      case 'auth/weak-password':
        errorMessage = 'Password is too weak. Please choose a stronger password.';
        break;
      case 'auth/user-disabled':
        errorMessage = 'This account has been disabled.';
        break;
      case 'auth/user-not-found':
        errorMessage = 'No account found with this email.';
        break;
      case 'auth/wrong-password':
        errorMessage = 'Incorrect password.';
        break;
      default:
        errorMessage = error.message || 'Authentication failed.';
    }
    
    return throwError(() => new Error(errorMessage));
  }

  getToken(): string | null {
    return this.auth.currentUser?.uid || null;
  }

  private getUserFromStorage(): User | null {
    const userJson = localStorage.getItem(this.USER_KEY);
    if (userJson) {
      try {
        return JSON.parse(userJson);
      } catch {
        return null;
      }
    }
    return null;
  }

  private setUserInStorage(user: User): void {
    localStorage.setItem(this.USER_KEY, JSON.stringify(user));
  }

  private removeUserFromStorage(): void {
    localStorage.removeItem(this.USER_KEY);
  }

  private hasValidToken(): boolean {
    const token = this.getToken();
    if (!token) return false;

    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const expiry = payload.exp * 1000;
      return Date.now() < expiry;
    } catch {
      return false;
    }
  }
}
