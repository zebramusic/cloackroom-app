// Minimal runtime-only MongoDB wiring without a hard build-time dependency
// Uses dynamic import("mongodb") so the app still builds/runs without the package.
// When MONGODB_URI is set and the package is available, a cached connection is used.

type Collection<T> = {
  find: (query?: unknown) => {
    sort: (arg: unknown) => {
      limit: (n: number) => { toArray: () => Promise<T[]> };
    };
  };
  updateOne: (filter: unknown, update: unknown, options?: unknown) => Promise<unknown>;
  deleteOne: (filter: unknown) => Promise<unknown>;
  findOne: (filter: unknown) => Promise<T | null>;
};

export type Db = {
  collection: <T>(name: string) => Collection<T>;
};

type MongoClientLike = {
  connect: () => Promise<void>;
  db: (name: string) => Db;
  topology?: unknown;
};

type MongoCache = {
  client: MongoClientLike | null;
  db: Db | null;
};

declare global {
  var __mongoCache: MongoCache | undefined;
}

const cache: MongoCache = globalThis.__mongoCache || { client: null, db: null };
if (!globalThis.__mongoCache) globalThis.__mongoCache = cache;

export async function getDb(): Promise<Db | null> {
  const uri = process.env.MONGODB_URI;
  const dbName =
    process.env.MONGODB_DB || process.env.MONGODB_DATABASE || "cloackroom";
  if (!uri) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[mongodb] MONGODB_URI not set. Using in-memory store.");
    }
    return null;
  }
  if (cache.db) return cache.db;
  try {
    if (!cache.client) {
      const mod = (await import("mongodb")) as unknown;
      const MongoClientCtor = (
        (mod as Record<string, unknown>).MongoClient ??
        (mod as { default?: { MongoClient?: unknown } }).default?.MongoClient
      ) as unknown as { new (uri: string): MongoClientLike } | undefined;
      if (!MongoClientCtor) {
        console.warn("[mongodb] MongoClient not found in module. Falling back to memory.");
        return null;
      }
      cache.client = new MongoClientCtor(uri);
    }
    if (!cache.client.topology) {
      await cache.client.connect();
    }
    cache.db = cache.client.db(dbName);
    return cache.db;
  } catch (e) {
    console.warn("[mongodb] Failed to initialize MongoDB. Falling back to memory.", e);
    return null;
  }
}
