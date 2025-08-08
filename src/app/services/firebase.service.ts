import { Injectable } from '@angular/core';
import { 
  Firestore, 
  collection, 
  doc, 
  addDoc, 
  setDoc, 
  getDoc, 
  getDocs, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  limit,
  DocumentData,
  QueryConstraint,
  QueryFieldFilterConstraint,
  QueryOrderByConstraint,
  QueryLimitConstraint,
  Timestamp,
  serverTimestamp
} from '@angular/fire/firestore';
import { Observable, from, map } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class FirebaseService {
  
  constructor(private firestore: Firestore) {}

  // Generic CRUD operations
  
  /**
   * Add a document to a collection
   */
  add<T>(collectionName: string, data: T): Observable<string> {
    const collectionRef = collection(this.firestore, collectionName);
    const docData = this.convertDatesToTimestamps(data);
    return from(addDoc(collectionRef, docData)).pipe(
      map(docRef => docRef.id)
    );
  }

  /**
   * Set a document with a specific ID
   */
  set<T>(collectionName: string, docId: string, data: T): Observable<void> {
    const docRef = doc(this.firestore, collectionName, docId);
    const docData = this.convertDatesToTimestamps(data);
    return from(setDoc(docRef, docData));
  }

  /**
   * Get a document by ID
   */
  get<T>(collectionName: string, docId: string): Observable<T | null> {
    const docRef = doc(this.firestore, collectionName, docId);
    return from(getDoc(docRef)).pipe(
      map(docSnap => {
        if (docSnap.exists()) {
          const data = docSnap.data() as T;
          return { ...data, id: docSnap.id } as T;
        }
        return null;
      })
    );
  }

  /**
   * Get all documents from a collection
   */
  getAll<T>(collectionName: string, ...queryConstraints: QueryConstraint[]): Observable<T[]> {
    const collectionRef = collection(this.firestore, collectionName);
    const q = queryConstraints.length > 0 
      ? query(collectionRef, ...queryConstraints) 
      : query(collectionRef);
    
    return from(getDocs(q)).pipe(
      map(querySnapshot => 
        querySnapshot.docs.map(doc => ({
          ...doc.data(),
          id: doc.id
        } as T))
      )
    );
  }

  /**
   * Update a document
   */
  update<T>(collectionName: string, docId: string, data: Partial<T>): Observable<void> {
    const docRef = doc(this.firestore, collectionName, docId);
    const updateData = this.convertDatesToTimestamps(data);
    return from(updateDoc(docRef, updateData));
  }

  /**
   * Delete a document
   */
  delete(collectionName: string, docId: string): Observable<void> {
    const docRef = doc(this.firestore, collectionName, docId);
    return from(deleteDoc(docRef));
  }

  /**
   * Get documents from a subcollection
   */
  getSubcollection<T>(
    parentCollection: string, 
    parentDocId: string, 
    subcollectionName: string,
    ...queryConstraints: QueryConstraint[]
  ): Observable<T[]> {
    const subcollectionRef = collection(
      this.firestore, 
      parentCollection, 
      parentDocId, 
      subcollectionName
    );
    const q = queryConstraints.length > 0 
      ? query(subcollectionRef, ...queryConstraints) 
      : query(subcollectionRef);
    
    return from(getDocs(q)).pipe(
      map(querySnapshot => 
        querySnapshot.docs.map(doc => ({
          ...doc.data(),
          id: doc.id
        } as T))
      )
    );
  }

  /**
   * Add document to subcollection
   */
  addToSubcollection<T>(
    parentCollection: string, 
    parentDocId: string, 
    subcollectionName: string, 
    data: T
  ): Observable<string> {
    const subcollectionRef = collection(
      this.firestore, 
      parentCollection, 
      parentDocId, 
      subcollectionName
    );
    const docData = this.convertDatesToTimestamps(data);
    return from(addDoc(subcollectionRef, docData)).pipe(
      map(docRef => docRef.id)
    );
  }

  /**
   * Helper to get server timestamp
   */
  getServerTimestamp(): any {
    return serverTimestamp();
  }

  /**
   * Convert Date objects to Firestore Timestamps
   */
  private convertDatesToTimestamps(data: any): any {
    if (!data) return data;
    
    const converted = { ...data };
    
    Object.keys(converted).forEach(key => {
      if (converted[key] instanceof Date) {
        converted[key] = Timestamp.fromDate(converted[key]);
      } else if (typeof converted[key] === 'object' && converted[key] !== null) {
        converted[key] = this.convertDatesToTimestamps(converted[key]);
      }
    });
    
    return converted;
  }

  // Query helpers
  where = where;
  orderBy = orderBy;
  limit = limit;
}
