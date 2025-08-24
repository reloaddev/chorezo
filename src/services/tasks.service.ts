import {Injectable} from '@angular/core';
import {
  addDoc,
  collection,
  collectionData,
  doc,
  Firestore,
  getDocs,
  limit,
  orderBy,
  query,
  updateDoc,
  where
} from '@angular/fire/firestore';
import {map, shareReplay, tap} from 'rxjs/operators';
import {combineLatest, Observable} from 'rxjs';
import {getNextInRotation} from '../utils/rotation.util.ts';
import {convertToDate} from '../utils/date.utils';

const KITCHEN_TASKS_COLLECTION = 'kitchen-tasks';
const BATHROOM_TASKS_COLLECTION = 'bathroom-tasks';
const LIVINGROOM_TASKS_COLLECTION = 'livingroom-tasks';

export interface TaskDoc {
  type: string;
  assignee: string;
  completedAt?: Date;
}

@Injectable({ providedIn: 'root' })
export class TasksService {
  constructor(private readonly firestore: Firestore) {}

  private collectionNameForType(type: string): string {
    switch (type) {
      case 'kitchen':
        return KITCHEN_TASKS_COLLECTION;
      case 'bathroom':
        return BATHROOM_TASKS_COLLECTION;
      case 'floor':
        return LIVINGROOM_TASKS_COLLECTION;
      default:
        console.warn('Unknown task type, defaulting to tasks collection:', type);
        return 'tasks';
    }
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
      const ref = collection(this.firestore, this.collectionNameForType(t));

      // Open (not completed) entry for this type
      // Note: Firestore cannot query for missing fields. Since open docs may NOT have `completedAt` at all,
      // we fetch a small batch from the type-specific collection and filter client-side for docs where `completedAt` is null or undefined.
      const openQ = query(
        ref,
        // no completedAt filter here; filter client-side instead
        limit(50)
      );

      // Latest completed entry for this type
      const lastDoneQ = query(
        ref,
        where('completedAt', '!=', null),
        orderBy('completedAt', 'desc'),
        limit(1)
      );

      const open$ = collectionData(openQ, { idField: 'id' }).pipe(
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
        map((items: any[]) => items.map((doc) => convertToDate(doc.completedAt)))
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
      shareReplay({ bufferSize: 1, refCount: true })
    );
  }

  // Marks the currently open task (no completedAt) for a given type as completed now
  // and creates a new open task with the next assignee based on choreRotation.
  async completeOpenTask(type: string): Promise<void> {
    const ref = collection(this.firestore, this.collectionNameForType(type));
    const q = query(ref, limit(50));
    const snap = await getDocs(q as any);
    const openDoc = snap.docs.find((d: any) => {
      const data = d.data();
      return data.completedAt === null || typeof data.completedAt === 'undefined';
    });
    if (!openDoc) {
      console.warn('No open task found for type', type);
      return;
    }

    const data: any = openDoc.data();
    const currentAssignee = data?.assignee ?? '';

    // 1) Set completedAt on the current open task
    const dref = doc(this.firestore, this.collectionNameForType(type), openDoc.id);
    await updateDoc(dref as any, { completedAt: new Date() } as any);

    // 2) Create a new open task without completedAt, with next assignee in rotation
    const next = getNextInRotation(currentAssignee);
    await addDoc(ref as any, { type, assignee: next } as any);
  }
}
