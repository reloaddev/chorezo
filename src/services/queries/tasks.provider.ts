import { collectionData, limit, orderBy, query, where } from '@angular/fire/firestore';
import { map } from 'rxjs/operators';
import { Observable } from 'rxjs';
import { convertToDate } from '../../utils/date.utils';

// Build a query to fetch a small batch and filter client-side for open tasks
// (completedAt is null or undefined). Firestore cannot query for missing fields,
// so we only set a reasonable limit here and let the caller filter client-side.
export const buildOpenTasksQuery = (ref: any) => {
  return query(ref, limit(50));
};

// Build a query to fetch the latest completed task (has completedAt) for a type
export const buildLastDoneTaskQuery = (ref: any) => {
  return query(
    ref,
    where('completedAt', '!=', null),
    orderBy('completedAt', 'desc'),
    limit(1)
  );
};

// Observable that emits the current open task info (type, assignee) as a single-element array or empty array
export const openTasks$ = (ref: any): Observable<{ type: string; assignee: string }[]> => {
  const openQ = buildOpenTasksQuery(ref);
  return collectionData(openQ, { idField: 'id' }).pipe(
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
};

// Observable that emits the open task documents (with id and fields) for a given collection reference
export const openTaskDocs$ = (
  ref: any
): Observable<Array<{ id: string; type?: string; assignee?: string; completedAt?: any }>> => {
  const openQ = buildOpenTasksQuery(ref);
  return collectionData(openQ, { idField: 'id' }).pipe(
    map((items: any[]) =>
      items.filter((doc) => doc.completedAt === null || typeof doc.completedAt === 'undefined')
    )
  );
};

// Observable that emits the latest completed date as a single-element array (or empty if none)
export const latestCompletedTasks$ = (ref: any): Observable<Date[]> => {
  const lastDoneQ = buildLastDoneTaskQuery(ref);
  return collectionData(lastDoneQ, { idField: 'id' }).pipe(
    map((items: any[]) => items.map((doc) => convertToDate(doc.completedAt)))
  );
};
