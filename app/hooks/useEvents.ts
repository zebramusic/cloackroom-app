import useSWR, { SWRConfiguration } from "swr";
import type { Event } from "@/app/models/event";

const EVENTS_ENDPOINT = "/api/events";
const EMPTY_EVENTS: Event[] = [];

async function fetchEvents(): Promise<Event[]> {
  const res = await fetch(EVENTS_ENDPOINT, { cache: "no-store" });
  if (!res.ok) {
    const error = new Error("Failed to load events");
    throw Object.assign(error, { status: res.status });
  }
  const json = (await res.json()) as { items?: Event[] };
  const items = Array.isArray(json.items) ? json.items : [];
  return items.slice().sort((a, b) => a.startsAt - b.startsAt);
}

export function useEvents(config?: SWRConfiguration<Event[]>) {
  const swr = useSWR<Event[]>(EVENTS_ENDPOINT, fetchEvents, {
    revalidateOnFocus: false,
    ...config,
  });
  return {
    ...swr,
    data: swr.data ?? EMPTY_EVENTS,
  };
}
