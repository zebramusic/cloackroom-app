export interface Event {
  id: string; // event_<timestamp> or database-generated
  name: string;
  startsAt: number; // epoch ms start time
  endsAt: number; // epoch ms end time (exclusive or inclusive boundary depending on usage)
  createdAt: number; // epoch ms when event record created
  updatedAt?: number; // epoch ms when last modified
}

// Active if current timestamp is within [startsAt, endsAt] inclusive.
export function isEventActive(ev: Event, at: number = Date.now()): boolean {
  return at >= ev.startsAt && at <= ev.endsAt; // inclusive end per requirements
}
