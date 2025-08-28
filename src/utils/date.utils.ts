import {Timestamp} from '@angular/fire/firestore';

export const convertToDate = (value: unknown): Date | undefined => {
  if (!value) return undefined;
  if (value instanceof Date) return value;
  // AngularFire returns Firebase Timestamp instances for Firestore timestamps
  if (value instanceof Timestamp) {
    return value.toDate();
  }
  // Fallback for string/number
  const d = new Date(value as string | number | Date);
  return isNaN(d.getTime()) ? undefined : d;
}
