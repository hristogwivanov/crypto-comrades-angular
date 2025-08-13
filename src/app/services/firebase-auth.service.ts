import { Injectable } from '@angular/core';
import { 
  Auth, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged, 
  User as FirebaseUser,
  updateProfile,
  sendEmailVerification
} from '@angular/fire/auth';
import { BehaviorSubject, Observable, from, map, switchMap, of } from 'rxjs';
import { User, LoginCredentials, RegisterCredentials, UserProfile } from '../models/user.interface';
import { FirebaseService } from './firebase.service';

@Injectable({
  providedIn: 'root'
})
export class FirebaseAuthService {
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  private isAuthenticatedSubject = new BehaviorSubject<boolean>(false);

  public currentUser$ = this.currentUserSubject.asObservable();
  public isAuthenticated$ = this.isAuthenticatedSubject.asObservable();

  constructor(
    private auth: Auth,
    private firebaseService: FirebaseService
  ) {
    this.initializeAuthState();
  }

  private initializeAuthState(): void {
    onAuthStateChanged(this.auth, async (firebaseUser) => {
      if (firebaseUser) {
        const user = await this.createUserFromFirebaseUser(firebaseUser);
        this.currentUserSubject.next(user);
        this.isAuthenticatedSubject.next(true);
      } else {
        this.currentUserSubject.next(null);
        this.isAuthenticatedSubject.next(false);
      }
    });
  }

  /**
   * Register a new user
   */
  register(credentials: RegisterCredentials): Observable<User> {
    return from(
      createUserWithEmailAndPassword(this.auth, credentials.email, credentials.password)
    ).pipe(
      switchMap(async (userCredential) => {
        const firebaseUser = userCredential.user;
        
        // Update the user's display name
        await updateProfile(firebaseUser, {
          displayName: credentials.username
        });

        // Send email verification
        await sendEmailVerification(firebaseUser);

        // Create user document in Firestore
        const userData: Omit<UserProfile, 'id'> = {
          email: firebaseUser.email!,
          username: credentials.username,
          firstName: credentials.firstName || '',
          lastName: credentials.lastName || '',
          avatar: firebaseUser.photoURL || undefined,
          createdAt: new Date(),
          isEmailVerified: false,
          joinedDate: new Date(),
          totalPortfolioValue: 0,
          portfolioPublic: false,
          // New required fields
          isActive: true,
          portfolios: []
        };

        await this.firebaseService.set('users', firebaseUser.uid, userData).toPromise();
        
        return this.createUserFromFirebaseUser(firebaseUser);
      })
    );
  }

  /**
   * Login user
   */
  login(credentials: LoginCredentials): Observable<User> {
    return from(
      signInWithEmailAndPassword(this.auth, credentials.email, credentials.password)
    ).pipe(
      map(userCredential => this.createUserFromFirebaseUser(userCredential.user))
    );
  }

  /**
   * Logout user
   */
  logout(): Observable<void> {
    return from(signOut(this.auth));
  }

  /**
   * Get current user profile from Firestore
   */
  getCurrentUserProfile(): Observable<UserProfile | null> {
    const currentUser = this.currentUserSubject.value;
    if (!currentUser) {
      return of(null);
    }

    return this.firebaseService.get<UserProfile>('users', currentUser.id);
  }

  /**
   * Update user profile
   */
  updateUserProfile(userId: string, updates: Partial<UserProfile>): Observable<void> {
    return this.firebaseService.update('users', userId, {
      ...updates,
      updatedAt: new Date()
    });
  }

  /**
   * Get user by ID
   */
  getUserById(userId: string): Observable<UserProfile | null> {
    return this.firebaseService.get<UserProfile>('users', userId);
  }

  /**
   * Check if username is available
   */
  isUsernameAvailable(username: string): Observable<boolean> {
    return this.firebaseService.getAll<UserProfile>(
      'users', 
      this.firebaseService.where('username', '==', username)
    ).pipe(
      map(users => users.length === 0)
    );
  }

  /**
   * Update user avatar
   */
  updateAvatar(userId: string, avatarUrl: string): Observable<void> {
    return this.updateUserProfile(userId, { avatar: avatarUrl });
  }

  /**
   * Update email verification status
   */
  updateEmailVerificationStatus(userId: string, isVerified: boolean): Observable<void> {
    return this.updateUserProfile(userId, { isEmailVerified: isVerified });
  }

  /**
   * Get current Firebase user
   */
  getCurrentFirebaseUser(): FirebaseUser | null {
    return this.auth.currentUser;
  }

  /**
   * Convert Firebase user to app User interface
   */
  private createUserFromFirebaseUser(firebaseUser: FirebaseUser): User {
    const nameParts = firebaseUser.displayName?.split(' ') || ['', ''];
    return {
      id: firebaseUser.uid,
      email: firebaseUser.email!,
      username: firebaseUser.displayName || firebaseUser.email!.split('@')[0],
      firstName: nameParts[0] || '',
      lastName: nameParts.slice(1).join(' ') || '',
      avatar: firebaseUser.photoURL || undefined,
      createdAt: new Date(firebaseUser.metadata.creationTime!),
      isEmailVerified: firebaseUser.emailVerified
    };
  }

  resendEmailVerification(): Observable<void> {
    const user = this.getCurrentFirebaseUser();
    if (!user) {
      throw new Error('No user logged in');
    }
    return from(sendEmailVerification(user));
  }


  isAdmin(): Observable<boolean> {
    return this.currentUser$.pipe(
      map(user => {
        return false;
      })
    );
  }
}
