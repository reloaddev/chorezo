// Centralized mapping between domain types and Firestore collection names
// This keeps collection naming consistent and discoverable across the app.

export const COLLECTION_NAME_BY_TASK_TYPE: Record<string, string> = {
  kitchen: 'kitchen-tasks',
  bathroom: 'bathroom-tasks',
  floor: 'livingroom-tasks',
  plants: 'plant-tasks'
};

/**
 * Returns the Firestore collection name for a given task type.
 * Falls back to the generic "tasks" collection when the type is unknown.
 */
export function collectionNameForType(type: string): string {
  const mapped = COLLECTION_NAME_BY_TASK_TYPE[type];
  if (!mapped) {
    console.warn('Unknown task type, defaulting to tasks collection:', type);
    return 'tasks';
  }
  return mapped;
}
