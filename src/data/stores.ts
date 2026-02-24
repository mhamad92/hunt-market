// src/data/stores.ts
export type StoreBase = {
  id: string;
  name: string;
  region: string;
  logo: string;
};

export const STORES: StoreBase[] = [
  {
    id: "s1",
    name: "Falcon Hunt Store",
    region: "Beirut",
    logo:
      "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=200&q=60",
  },
  {
    id: "s2",
    name: "Mountain Gear",
    region: "Keserwan",
    logo:
      "https://images.unsplash.com/photo-1520975680401-7a3b2a3c2ef2?auto=format&fit=crop&w=200&q=60",
  },
  {
    id: "s3",
    name: "Beqaa Outdoors",
    region: "Beqaa",
    logo:
      "https://images.unsplash.com/photo-1520975680401-7a3b2a3c2ef2?auto=format&fit=crop&w=200&q=60",
  },
];