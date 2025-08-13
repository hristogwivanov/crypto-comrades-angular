import { Injectable, inject } from '@angular/core';
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
  where as firestoreWhere, 
  orderBy as firestoreOrderBy, 
  limit as firestoreLimit,
  DocumentData,
  QueryConstraint,
  QueryFieldFilterConstraint,
  QueryOrderByConstraint,
  QueryLimitConstraint,
  Timestamp,
  serverTimestamp,
  increment as firestoreIncrement
} from '@angular/fire/firestore';
import { Observable, from, map, tap, catchError } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class FirebaseService {
  
  constructor(private firestore: Firestore) {}


  add<T>(collectionName: string, data: T): Observable<string> {
    const collectionRef = collection(this.firestore, collectionName);
    const docData = this.convertDatesToTimestamps(data);
    return from(addDoc(collectionRef, docData)).pipe(
      map(docRef => docRef.id)
    );
  }


  set<T>(collectionName: string, docId: string, data: T): Observable<void> {
    const docRef = doc(this.firestore, collectionName, docId);
    const docData = this.convertDatesToTimestamps(data);
    return from(setDoc(docRef, docData));
  }


  get<T>(collectionName: string, docId: string): Observable<T | null> {
    const docRef = doc(this.firestore, collectionName, docId);
    return from(getDoc(docRef)).pipe(
      map(docSnap => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          const convertedData = this.convertTimestampsToDates(data);
          return { ...convertedData, id: docSnap.id } as T;
        }
        return null;
      })
    );
  }


  getAll<T>(collectionName: string, ...queryConstraints: QueryConstraint[]): Observable<T[]> {
    const collectionRef = collection(this.firestore, collectionName);
    const q = queryConstraints.length > 0 
      ? query(collectionRef, ...queryConstraints) 
      : query(collectionRef);
    
    return from(getDocs(q)).pipe(
      map(querySnapshot => 
        querySnapshot.docs.map(doc => {
          const data = doc.data();
          const convertedData = this.convertTimestampsToDates(data);
          return {
            ...convertedData,
            id: doc.id
          } as T;
        })
      )
    );
  }


  update<T>(collectionName: string, docId: string, data: Partial<T>): Observable<void> {
    const docRef = doc(this.firestore, collectionName, docId);
    
    // Filter out undefined values - Firestore doesn't accept them
    const cleanedData = Object.fromEntries(
      Object.entries(data).filter(([_, value]) => value !== undefined)
    );
    
    const updateData = this.convertDatesToTimestamps(cleanedData);
    return from(updateDoc(docRef, updateData));
  }


  delete(collectionName: string, docId: string): Observable<void> {
    const docRef = doc(this.firestore, collectionName, docId);
    return from(deleteDoc(docRef));
  }


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
        querySnapshot.docs.map(doc => {
          const data = doc.data();
          const convertedData = this.convertTimestampsToDates(data);
          return {
            ...convertedData,
            id: doc.id
          } as T;
        })
      )
    );
  }


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


  getServerTimestamp(): any {
    return serverTimestamp();
  }


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

  private convertTimestampsToDates(data: any): any {
    if (!data) return data;
    
    const converted = { ...data };
    
    Object.keys(converted).forEach(key => {
      if (converted[key] && typeof converted[key] === 'object') {
        // Check if it's a Firestore Timestamp
        if (converted[key].toDate && typeof converted[key].toDate === 'function') {
          converted[key] = converted[key].toDate();
        } else if (converted[key].seconds && converted[key].nanoseconds) {
          // Handle Firestore Timestamp format
          converted[key] = new Timestamp(converted[key].seconds, converted[key].nanoseconds).toDate();
        } else if (Array.isArray(converted[key])) {
          converted[key] = converted[key].map((item: any) => this.convertTimestampsToDates(item));
        } else {
          converted[key] = this.convertTimestampsToDates(converted[key]);
        }
      }
    });
    
    return converted;
  }


  // Helper methods to maintain injection context
  where(field: string, opStr: any, value: any): QueryFieldFilterConstraint {
    return firestoreWhere(field, opStr, value);
  }

  orderBy(field: string, directionStr?: 'asc' | 'desc'): QueryOrderByConstraint {
    return firestoreOrderBy(field, directionStr);
  }

  limit(limitCount: number): QueryLimitConstraint {
    return firestoreLimit(limitCount);
  }

  increment(value: number = 1): any {
    return firestoreIncrement(value);
  }
}
