// In-memory Firestore stub for offline service tests.
const store = new Map(); // path -> data
let autoId = 0;
let ts = 0;

export const __store = store;
export const __reset = () => {
  store.clear();
  autoId = 0;
  ts = 0;
};

export const doc = (db, ...segs) => ({ path: segs.join("/") });
export const collection = (parent, name) => ({
  path: `${parent.path}/${name}`,
});
export const serverTimestamp = () => ({ __ts: ++ts });
export const query = (col, ...constraints) => ({ col, constraints });
export const where = (f, op, v) => ({ t: "where", f, op, v });
export const orderBy = (f, dir = "asc") => ({ t: "orderBy", f, dir });
export const limit = (n) => ({ t: "limit", n });
export const startAfter = () => ({ t: "cursor" });

export async function getDoc(ref) {
  const data = store.get(ref.path);
  return {
    exists: () => data !== undefined,
    id: ref.path.split("/").pop(),
    data: () => data,
  };
}

export async function setDoc(ref, data) {
  store.set(ref.path, data);
}

export async function updateDoc(ref, patch) {
  const cur = store.get(ref.path) ?? {};
  // Support dotted paths (e.g. "profile.soilTestInfo").
  for (const [k, v] of Object.entries(patch)) {
    const parts = k.split(".");
    let obj = cur;
    while (parts.length > 1) {
      const p = parts.shift();
      obj[p] = obj[p] ?? {};
      obj = obj[p];
    }
    obj[parts[0]] = v;
  }
  store.set(ref.path, cur);
}

export async function addDoc(col, data) {
  const id = `autoid${++autoId}`;
  store.set(`${col.path}/${id}`, data);
  return { id };
}

function compare(a, b, f, dir) {
  const av = a.data()[f];
  const bv = b.data()[f];
  let cmp;
  if (av && typeof av === "object" && "__ts" in av) {
    cmp = (av.__ts ?? 0) - (bv?.__ts ?? 0);
  } else {
    cmp = String(av ?? "").localeCompare(String(bv ?? ""));
  }
  return dir === "desc" ? -cmp : cmp;
}

export async function getDocs({ col, constraints }) {
  const prefix = `${col.path}/`;
  let docs = [...store.entries()]
    .filter(([k]) => k.startsWith(prefix))
    .map(([path, data]) => ({
      id: path.slice(prefix.length),
      ref: { path },
      data: () => data,
    }));
  for (const c of constraints) {
    if (c.t === "where" && c.op === "==") {
      docs = docs.filter((d) => d.data()[c.f] === c.v);
    } else if (c.t === "orderBy") {
      docs.sort((a, b) => compare(a, b, c.f, c.dir));
    } else if (c.t === "limit") {
      docs = docs.slice(0, c.n);
    }
  }
  return { docs, empty: docs.length === 0 };
}

export function writeBatch() {
  const ops = [];
  return {
    set(ref, data) {
      ops.push(() => store.set(ref.path, data));
    },
    update(ref, patch) {
      ops.push(() => {
        const cur = store.get(ref.path) ?? {};
        Object.assign(cur, patch);
        store.set(ref.path, cur);
      });
    },
    delete(ref) {
      ops.push(() => store.delete(ref.path));
    },
    async commit() {
      ops.forEach((op) => op());
    },
  };
}
