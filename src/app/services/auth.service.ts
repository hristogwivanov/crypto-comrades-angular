import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Observable, throwError, of, from } from 'rxjs';
import { map, catchError, tap, switchMap } from 'rxjs/operators';
import { User, LoginCredentials, RegisterCredentials, AuthResponse, UserProfile } from '../models/user.interface';
import { Auth } from '@angular/fire/auth';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  updateProfile,
  sendEmailVerification,
  User as FirebaseUser
} from '@angular/fire/auth';
import { FirebaseService } from './firebase.service';

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
  private firebaseService = inject(FirebaseService);

  constructor() {
    this.initializeAuthState();
  }

  private initializeAuthState(): void {
    onAuthStateChanged(this.auth, async (firebaseUser) => {
      if (firebaseUser) {
        const user: User = await this.createUserFromFirebaseUser(firebaseUser);
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
        switchMap(async (userCredential) => {
          const firebaseUser = userCredential.user;
          
          await updateProfile(firebaseUser, { displayName: credentials.username });
          await sendEmailVerification(firebaseUser);

          const userData: Omit<UserProfile, 'id'> = {
            email: firebaseUser.email!,
            username: credentials.username,
            firstName: '',
            lastName: '',
            displayName: credentials.username,
            bio: '',
            location: '',
            website: '',
            avatar: firebaseUser.photoURL || '',
            createdAt: new Date(),
            updatedAt: new Date(),
            lastActiveAt: new Date(),
            isEmailVerified: false,
            joinedDate: new Date(),
            totalPortfolioValue: 0,
            portfolioPublic: false,
            isActive: true,
            portfolios: [],
            favoriteCoins: [],
            tradingExperience: 'beginner',
            followersCount: 0,
            followingCount: 0,
            postsCount: 0,
            preferences: {
              theme: 'light',
              currency: 'USD',
              notifications: {
                email: true,
                portfolio: true,
                social: true
              }
            },
            privacy: {
              profileVisibility: 'public',
              portfolioVisibility: 'private',
              showHoldings: false
            }
          };

          await this.firebaseService.set('users', firebaseUser.uid, userData).toPromise();

          return userCredential;
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

  async refreshCurrentUser(): Promise<void> {
    const firebaseUser = this.auth.currentUser;
    if (firebaseUser) {
      const user = await this.createUserFromFirebaseUser(firebaseUser);
      this.setUserInStorage(user);
      this.currentUserSubject.next(user);
    }
  }

  private async createUserFromFirebaseUser(firebaseUser: FirebaseUser): Promise<User> {
    const nameParts = firebaseUser.displayName?.split(' ') || ['', ''];
    
    const baseUser: User = {
      id: firebaseUser.uid,
      email: firebaseUser.email || '',
      firstName: nameParts[0] || '',
      lastName: nameParts.slice(1).join(' ') || '',
      username: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || '',
      createdAt: new Date(firebaseUser.metadata.creationTime || new Date()),
      isEmailVerified: firebaseUser.emailVerified
    };

    try {
      const firestoreProfile = await this.firebaseService.get<UserProfile>('users', firebaseUser.uid).toPromise();
      
      if (firestoreProfile) {
        return {
          ...baseUser,
          username: firestoreProfile.username || firebaseUser.displayName || firebaseUser.email!.split('@')[0],
          firstName: firestoreProfile.firstName || baseUser.firstName,
          lastName: firestoreProfile.lastName || baseUser.lastName,
          avatar: firestoreProfile.avatar || baseUser.avatar,
          isEmailVerified: firestoreProfile.isEmailVerified ?? baseUser.isEmailVerified
        };
      }
    } catch (error) {
      console.warn('Could not fetch Firestore profile for user:', firebaseUser.uid, error);
    }

    return baseUser;
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
