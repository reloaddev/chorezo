export type Person = 'Wouter' | 'Tomas' | 'Henrik';

export const rotation: Person[] = [
  'Wouter',
  'Tomas',
  'Henrik'
];

export const getNextInRotation = (current: Person | undefined | null): string => {
  const idx = rotation.findIndex((name) => name === current);
  if (idx === -1) return rotation[0];
  return rotation[(idx + 1) % rotation.length];
}
