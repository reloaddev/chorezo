import {Timestamp} from '@angular/fire/firestore';

export const convertToDate  = (value: any) => {
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
