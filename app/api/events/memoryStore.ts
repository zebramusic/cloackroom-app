import type { Event } from "@/app/models/event";

const memEvents: Event[] = [];

function sortInPlace() {
  memEvents.sort((a, b) => a.startsAt - b.startsAt);
}

export function listMemoryEvents(): Event[] {
  sortInPlace();
  return memEvents;
}

export function findMemoryEvent(id: string): Event | undefined {
  return memEvents.find((event) => event.id === id);
}

export function upsertMemoryEvent(event: Event): Event {
  const idx = memEvents.findIndex((existing) => existing.id === event.id);
  if (idx === -1) {
    memEvents.push(event);
  } else {
    memEvents[idx] = event;
  }
  sortInPlace();
  return event;
}

export function updateMemoryEvent(
  id: string,
  updater: (previous: Event) => Event
): Event | null {
  const idx = memEvents.findIndex((event) => event.id === id);
  if (idx === -1) return null;
  const next = updater(memEvents[idx]);
  memEvents[idx] = next;
  sortInPlace();
  return next;
}

export function removeMemoryEvent(id: string): boolean {
  const idx = memEvents.findIndex((event) => event.id === id);
  if (idx === -1) return false;
  memEvents.splice(idx, 1);
  return true;
}
