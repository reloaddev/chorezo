import { Injectable, inject } from '@angular/core';
import {
  Firestore,
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  CollectionReference,
  DocumentData,
  writeBatch
} from '@angular/fire/firestore';
import { Observable } from 'rxjs';

export interface ShoppingTodo {
  id?: string;
  text: string;
  completed: boolean;
}

@Injectable({ providedIn: 'root' })
export class ShoppingListService {
  private readonly firestore = inject(Firestore);
  private readonly collectionRef = collection(this.firestore, 'shopping-list') as CollectionReference<DocumentData>;

  getTodos(): Observable<ShoppingTodo[]> {
    return new Observable<ShoppingTodo[]>(subscriber => {
      return onSnapshot(this.collectionRef, snapshot => {
        const todos = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ShoppingTodo));
        subscriber.next(todos);
      });
    });
  }

  async updateTodoText(id: string, text: string) {
    await updateDoc(doc(this.collectionRef, id), { text });
  }

  async addTodo(text: string) {
    await addDoc(this.collectionRef, { text, completed: false });
  }

  async updateTodo(id: string, completed: boolean) {
    await updateDoc(doc(this.collectionRef, id), { completed });
  }

  async deleteTodo(id: string) {
    await deleteDoc(doc(this.collectionRef, id));
  }

  async clearAll() {
    const snapshot = await getDocs(this.collectionRef);
    const batch = writeBatch(this.firestore);
    snapshot.forEach(docSnap => {
      batch.delete(docSnap.ref);
    });
    await batch.commit();
  }
}
