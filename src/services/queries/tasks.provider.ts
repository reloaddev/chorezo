import { collectionSnapshots, limit, orderBy, query, where, CollectionReference, Query } from '@angular/fire/firestore';
import { map } from 'rxjs/operators';
import { Observable } from 'rxjs';
import { convertToDate } from '../../utils/date.utils';

// Build a query to fetch a small batch and filter client-side for open tasks
// (completedAt is null or undefined). Firestore cannot query for missing fields,
// so we only set a reasonable limit here and let the caller filter client-side.
export const buildOpenTasksQuery = (ref: unknown) => {
  const queryable = ref as unknown as CollectionReference<unknown> | Query<unknown>;
  return query(queryable, limit(50));
};

// Build a query to fetch the latest completed task (has completedAt) for a type
export const buildLastDoneTaskQuery = (ref: unknown) => {
  const queryable = ref as unknown as CollectionReference<unknown> | Query<unknown>;
  return query(
    queryable,
    where('completedAt', '!=', null),
    orderBy('completedAt', 'desc'),
    limit(1)
  );
};

// Observable that emits the open task documents (with id and fields) for a given collection reference
export interface OpenTaskDoc { id: string; type?: string; assignee?: string; completedAt?: unknown }

export const openTasks$ = (
  ref: unknown
): Observable<OpenTaskDoc[]> => {
  const openQ = buildOpenTasksQuery(ref);
  return collectionSnapshots(openQ).pipe(
    map((snaps) =>
      snaps
        .map((s) => ({ id: (s as any).id as string, ...(s.data() as Record<string, unknown>) }) as (Record<string, unknown> & { id: string }))
        .filter((doc) => doc["completedAt"] === null || typeof doc["completedAt"] === 'undefined')
        .map((doc) => doc as unknown as OpenTaskDoc)
    )
  );
};

// Observable that emits the latest completed date as a single-element array (or empty if none)
export const latestCompletedTasks$ = (ref: unknown): Observable<Date[]> => {
  const lastDoneQ = buildLastDoneTaskQuery(ref);
  return collectionSnapshots(lastDoneQ).pipe(
    map((snaps) =>
      snaps
        .map((s) => s.data())
        .filter((doc): doc is Record<string, unknown> => typeof doc === 'object' && doc !== null)
        .map((doc) => convertToDate((doc as { completedAt?: unknown }).completedAt))
        .filter((d): d is Date => d instanceof Date)
    )
  );
};
