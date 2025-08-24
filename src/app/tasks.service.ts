import { Injectable, computed, signal } from '@angular/core';
import { Firestore, collection, collectionData, Timestamp, query, where, orderBy, limit } from '@angular/fire/firestore';
import { map, shareReplay, tap } from 'rxjs/operators';
import { Observable, combineLatest } from 'rxjs';

export interface TaskDoc {
  type: string;
  assignee: string;
  // After normalization in tasks$(), completedAt is always a Date (or undefined)
  completedAt?: Date;
}

@Injectable({ providedIn: 'root' })
export class TasksService {
  constructor(private readonly firestore: Firestore) {}

  private toDate(value: any): Date | undefined {
    if (!value) return undefined;
    if (value instanceof Date) return value;
    // AngularFire returns Firebase Timestamp instances for Firestore timestamps
    if (typeof value === 'object' && value instanceof Timestamp) {
      return value.toDate();
    }
    // Fallback for string/number
    const d = new Date(value);
    return isNaN(d.getTime()) ? undefined : d;
  }

  // Returns, for each known type, the OPEN task (completedAt == null)
  // combined with the latest COMPLETED timestamp of the same type.
  // The resulting TaskDoc has:
  // - assignee from the open task
  // - completedAt set to the most recent completion time
  // If no open task exists for a type, that type is omitted from the result.
  openWithLastDoneByType$(): Observable<TaskDoc[]> {
    const types = ['kitchen', 'floor', 'bathroom'] as const;

    const perTypeStreams = types.map((t) => {
      const ref = collection(this.firestore, 'tasks');

      // Open (not completed) entry for this type
      // Note: Firestore cannot query for missing fields. Since open docs may NOT have `completedAt` at all,
      // we fetch a small batch by type and filter client-side for docs where `completedAt` is null or undefined.
      const openQ = query(
        ref,
        where('type', '==', t),
        // no completedAt filter here; filter client-side instead
        limit(50)
      );

      // Latest completed entry for this type
      const lastDoneQ = query(
        ref,
        where('type', '==', t),
        where('completedAt', '!=', null),
        orderBy('completedAt', 'desc'),
        limit(1)
      );

      const open$ = collectionData(openQ, { idField: 'id' }).pipe(
        tap((items) => console.log('raw open candidates', t, items)),
        map((items: any[]) => {
          const openDoc = items.find((doc) => doc.completedAt === null || typeof doc.completedAt === 'undefined');
          return openDoc
            ? [
                {
                  type: openDoc.type ?? '',
                  assignee: openDoc.assignee ?? ''
                }
              ]
            : [];
        })
      );

      const lastDone$ = collectionData(lastDoneQ, { idField: 'id' }).pipe(
        map((items: any[]) =>
          items.map((doc) => this.toDate(doc.completedAt))
        )
      );

      return combineLatest([open$, lastDone$]).pipe(
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
      tap((items) => console.log('open + last done per type', items)),
      shareReplay({ bufferSize: 1, refCount: true })
    );
  }
}
