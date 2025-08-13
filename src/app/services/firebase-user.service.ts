import { Injectable } from '@angular/core';
import { 
  Firestore, 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  collection, 
  query, 
  where, 
  getDocs,
  Timestamp 
} from '@angular/fire/firestore';
import { Observable, from, map, catchError, of } from 'rxjs';
import { UserProfile, UserPreferences, UserPrivacy } from '../models/user.interface';

@Injectable({
  providedIn: 'root'
})
export class FirebaseUserService {

  constructor(private firestore: Firestore) { }

  /**
   * Get user profile by ID
   */
  getUserProfile(userId: string): Observable<UserProfile | null> {
    const userDocRef = doc(this.firestore, 'users', userId);
    return from(getDoc(userDocRef)).pipe(
      map(docSnap => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          return {
            ...data,
            id: docSnap.id,
            createdAt: data['createdAt']?.toDate() || new Date(),
            updatedAt: data['updatedAt']?.toDate() || new Date(),
            lastActiveAt: data['lastActiveAt']?.toDate() || new Date(),
            joinedDate: data['joinedDate']?.toDate() || data['createdAt']?.toDate() || new Date()
          } as UserProfile;
        }
        return null;
      }),
      catchError(error => {
        console.error('Error getting user profile:', error);
        return of(null);
      })
    );
  }

  /**
   * Create new user profile
   */
  createUserProfile(userId: string, profileData: Partial<UserProfile>): Observable<void> {
    const userDocRef = doc(this.firestore, 'users', userId);
    const now = Timestamp.now();
    
    const newProfile: Partial<UserProfile> = {
      ...profileData,
      id: userId,
      createdAt: now.toDate(),
      updatedAt: now.toDate(),
      lastActiveAt: now.toDate(),
      isActive: true,
      portfolios: [],
      followersCount: 0,
      followingCount: 0,
      postsCount: 0,
      joinedDate: now.toDate(),
      portfolioPublic: false,
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

    return from(setDoc(userDocRef, {
      ...newProfile,
      createdAt: now,
      updatedAt: now,
      lastActiveAt: now,
      joinedDate: now
    })).pipe(
      map(() => void 0),
      catchError(error => {
        console.error('Error creating user profile:', error);
        throw error;
      })
    );
  }

  /**
   * Update user profile
   */
  updateUserProfile(userId: string, updates: Partial<UserProfile>): Observable<void> {
    const userDocRef = doc(this.firestore, 'users', userId);
    const updateData = {
      ...updates,
      updatedAt: Timestamp.now()
    };

    return from(updateDoc(userDocRef, updateData)).pipe(
      map(() => void 0),
      catchError(error => {
        console.error('Error updating user profile:', error);
        throw error;
      })
    );
  }

  /**
   * Update user preferences
   */
  updateUserPreferences(userId: string, preferences: Partial<UserPreferences>): Observable<void> {
    const userDocRef = doc(this.firestore, 'users', userId);
    return from(updateDoc(userDocRef, {
      preferences,
      updatedAt: Timestamp.now()
    })).pipe(
      map(() => void 0),
      catchError(error => {
        console.error('Error updating user preferences:', error);
        throw error;
      })
    );
  }

  /**
   * Update user privacy settings
   */
  updateUserPrivacy(userId: string, privacy: Partial<UserPrivacy>): Observable<void> {
    const userDocRef = doc(this.firestore, 'users', userId);
    return from(updateDoc(userDocRef, {
      privacy,
      updatedAt: Timestamp.now()
    })).pipe(
      map(() => void 0),
      catchError(error => {
        console.error('Error updating user privacy:', error);
        throw error;
      })
    );
  }

  /**
   * Update last active timestamp
   */
  updateLastActive(userId: string): Observable<void> {
    const userDocRef = doc(this.firestore, 'users', userId);
    return from(updateDoc(userDocRef, {
      lastActiveAt: Timestamp.now()
    })).pipe(
      map(() => void 0),
      catchError(error => {
        console.error('Error updating last active:', error);
        return of(void 0); // Don't throw for this non-critical operation
      })
    );
  }

  /**
   * Search users by username
   */
  searchUsersByUsername(username: string): Observable<UserProfile[]> {
    const usersRef = collection(this.firestore, 'users');
    const q = query(
      usersRef,
      where('username', '>=', username),
      where('username', '<=', username + '\uf8ff')
    );

    return from(getDocs(q)).pipe(
      map(querySnapshot => {
        const users: UserProfile[] = [];
        querySnapshot.forEach(doc => {
          const data = doc.data();
          users.push({
            ...data,
            id: doc.id,
            createdAt: data['createdAt']?.toDate() || new Date(),
            updatedAt: data['updatedAt']?.toDate() || new Date(),
            lastActiveAt: data['lastActiveAt']?.toDate() || new Date(),
            joinedDate: data['joinedDate']?.toDate() || data['createdAt']?.toDate() || new Date()
          } as UserProfile);
        });
        return users;
      }),
      catchError(error => {
        console.error('Error searching users:', error);
        return of([]);
      })
    );
  }
}
