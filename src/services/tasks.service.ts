import {Injectable} from '@angular/core';
import {
  addDoc,
  collection,
  doc,
  Firestore,
  updateDoc
} from '@angular/fire/firestore';
import {map, shareReplay} from 'rxjs/operators';
import {combineLatest, Observable, firstValueFrom} from 'rxjs';
import {getNextInRotation, Person} from '../utils/rotation.util.ts';
import {openTasks$, latestCompletedTasks$, openTaskDocs$} from './queries/tasks.provider';
import {collectionNameForType} from './firestore/collection-names';


export interface TaskDoc {
  type: string;
  assignee: string;
  completedAt?: Date;
}

@Injectable({providedIn: 'root'})
export class TasksService {
  constructor(private readonly firestore: Firestore) {
  }

  openWithLastDoneByType$(): Observable<TaskDoc[]> {
    const types = ['kitchen', 'floor', 'bathroom'] as const;

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
            assignee: open.assignee,
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
    const ref = collection(this.firestore, collectionNameForType(type));

    // Use the centralized observable to get the current open task document
    const openDocs = await firstValueFrom(openTaskDocs$(ref));
    const openDoc = openDocs[0];
    if (!openDoc) {
      console.warn('No open task found for type', type);
      return;
    }

    const currentAssignee = openDoc.assignee ?? '';

    // 1) Set completedAt on the current open task
    const dref = doc(this.firestore, collectionNameForType(type), openDoc.id);
    await updateDoc(dref as any, { completedAt: new Date() } as any);

    // 2) Create a new open task without completedAt, with next assignee in rotation
    const next = getNextInRotation(currentAssignee as Person);
    await addDoc(ref as any, { type, assignee: next } as any);
  }
}
