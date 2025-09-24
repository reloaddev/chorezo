import {Injectable, inject} from '@angular/core';
import {
  addDoc,
  collection,
  doc,
  Firestore,
  updateDoc,
  CollectionReference,
  DocumentReference
} from '@angular/fire/firestore';
import {map, shareReplay} from 'rxjs/operators';
import {combineLatest, Observable, firstValueFrom} from 'rxjs';
import {getNextInRotation, Person} from '../utils/rotation.util';
import {openTasks$, latestCompletedTasks$} from './queries/tasks.provider';
import {collectionNameForType} from './firestore/collection-names';


export interface TaskDoc {
  id?: string;
  type: string;
  assignee: string;
  completedAt?: Date;
}

@Injectable({providedIn: 'root'})
export class TasksService {
  private readonly firestore = inject(Firestore);

  openWithLastDoneByType$(): Observable<TaskDoc[]> {
    const types = ['kitchen', 'floor', 'bathroom', 'plants'] as const;

    const perTypeStreams = types.map((t) => {
      const ref = collection(this.firestore, collectionNameForType(t));

      return combineLatest([openTasks$(ref), latestCompletedTasks$(ref)]).pipe(
        map(([openArr, lastArr]) => {
          const open = openArr[0];
          if (!open) return null; // No open task for this type
          const last = lastArr[0];
          const completedAt = last ?? undefined;
          const result: TaskDoc = {
            type: t,
            assignee: open.assignee ?? '',
            completedAt
          };
          return result;
        })
      );
    });

    return combineLatest(perTypeStreams).pipe(
      map((arr) => arr.filter((x): x is TaskDoc => !!x)),
      shareReplay({bufferSize: 1, refCount: true})
    );
  }

  async completeOpenTask(type: string): Promise<void> {
    const ref = collection(this.firestore, collectionNameForType(type)) as unknown as CollectionReference<TaskDoc>;

    // Use the centralized observable to get the current open task document
    const openDocs = await firstValueFrom(openTasks$(ref));
    const openDoc = openDocs[0];
    if (!openDoc) {
      console.warn('No open task found for type', type);
      return;
    }

    const openDocId = openDoc.id ?? '';
    const currentAssignee = openDoc.assignee ?? '';

    // 1) Set completedAt on the current open task
    const dref = doc(this.firestore, collectionNameForType(type), openDocId) as unknown as DocumentReference<TaskDoc>;
    await updateDoc(dref, { completedAt: new Date() } as Partial<TaskDoc>);

    // 2) Create a new open task without completedAt, with next assignee in rotation
    const next = getNextInRotation(currentAssignee as Person);
    await addDoc(ref, { type, assignee: next } as TaskDoc);
  }
}
