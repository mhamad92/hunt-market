export type Product = {
  id: string;
  name: string;
  price: number;
  images: string[];
  categoryId: string;
  storeId: string;
  storeName: string;
  description: string;
  inStock?: boolean;
  sizes?: string[];
};

export const PRODUCTS: Product[] = [
  {
    id: "p1",
    name: "Camo Jacket Pro",
    price: 45,
    images: [
      "https://images.unsplash.com/photo-1520975958225-1c2e3f1a8d8a?auto=format&fit=crop&w=1600&q=60",
      "https://images.unsplash.com/photo-1520975900308-9f7f3da8bd65?auto=format&fit=crop&w=1600&q=60",
    ],
    categoryId: "clothing",
    storeId: "s1",
    storeName: "Falcon Hunt Store",
    description:
      "Lightweight camo jacket built for early mornings. Wind resistant, quiet fabric, and deep pockets for shells and calls.",
    inStock: true,
    sizes: ["S", "M", "L", "XL"],
  },

  {
    id: "p1b",
    name: "Thermal Base Layer",
    price: 22,
    images: [
      "https://images.unsplash.com/photo-1520975900308-9f7f3da8bd65?auto=format&fit=crop&w=1600&q=60",
    ],
    categoryId: "clothing",
    storeId: "s1",
    storeName: "Falcon Hunt Store",
    description: "Warm base layer for cold mornings. Breathable and lightweight.",
    inStock: true,
    sizes: ["S", "M", "L", "XL"],
  },

  {
    id: "p2",
    name: "Hiking Boots X",
    price: 60,
    images: [
      "https://images.unsplash.com/photo-1528701800489-20be3c6a2c1e?auto=format&fit=crop&w=1600&q=60",
      "https://images.unsplash.com/photo-1528701800619-8a8d83515a69?auto=format&fit=crop&w=1600&q=60",
    ],
    categoryId: "shoes",
    storeId: "s2",
    storeName: "Mountain Gear",
    description: "Rugged boots with strong grip and waterproof lining.",
    inStock: true,
    sizes: ["40", "41", "42", "43", "44", "45"],
  },

  {
    id: "p2b",
    name: "Trail Boots Storm",
    price: 74,
    images: [
      "https://images.unsplash.com/photo-1528701800619-8a8d83515a69?auto=format&fit=crop&w=1600&q=60",
    ],
    categoryId: "shoes",
    storeId: "s2",
    storeName: "Mountain Gear",
    description: "Storm-ready boots with extra ankle support and aggressive tread.",
    inStock: true,
    sizes: ["40", "41", "42", "43", "44", "45"],
  },

  {
    id: "p3",
    name: "Binoculars 10x42",
    price: 75,
    images: [
      "https://images.unsplash.com/photo-1516571748831-5d81767b788d?auto=format&fit=crop&w=1600&q=60",
    ],
    categoryId: "optics",
    storeId: "s1",
    storeName: "Falcon Hunt Store",
    description: "Clear optics with strong low-light performance.",
    inStock: true,
  },

  {
    id: "p3b",
    name: "Rangefinder Compact",
    price: 95,
    images: [
      "https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=1600&q=60",
    ],
    categoryId: "optics",
    storeId: "s3",
    storeName: "Beqaa Outdoors",
    description: "Compact rangefinder with fast lock-on distance readout.",
    inStock: true,
  },

  {
    id: "p4",
    name: "Camping Lantern",
    price: 18,
    images: [
      "https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?auto=format&fit=crop&w=1600&q=60",
    ],
    categoryId: "camping",
    storeId: "s2",
    storeName: "Mountain Gear",
    description: "Bright lantern with long battery life. Great for camp sites.",
    inStock: true,
  },

  {
    id: "p4b",
    name: "Compact Stove Kit",
    price: 28,
    images: [
      "https://images.unsplash.com/photo-1523413651479-597eb2da0ad6?auto=format&fit=crop&w=1600&q=60",
    ],
    categoryId: "camping",
    storeId: "s2",
    storeName: "Mountain Gear",
    description: "Compact stove kit for quick meals in the outdoors.",
    inStock: true,
  },

  {
    id: "p5",
    name: "Duck Call Classic",
    price: 12,
    images: [
      "https://images.unsplash.com/photo-1520975767771-4c26a8b9f0d9?auto=format&fit=crop&w=1600&q=60",
    ],
    categoryId: "calls",
    storeId: "s3",
    storeName: "Beqaa Outdoors",
    description: "Classic duck call with easy blow and realistic tone.",
    inStock: true,
  },

  {
    id: "p5b",
    name: "Quail Call",
    price: 9,
    images: [
      "https://images.unsplash.com/photo-1520975903662-2b4b1cd5df2a?auto=format&fit=crop&w=1600&q=60",
    ],
    categoryId: "calls",
    storeId: "s3",
    storeName: "Beqaa Outdoors",
    description: "Compact quail call with sharp, clear notes.",
    inStock: true,
  },

  {
    id: "p6",
    name: "12ga Shells Box",
    price: 20,
    images: [
      "https://images.unsplash.com/photo-1604617677229-96d65e6a85ee?auto=format&fit=crop&w=1600&q=60",
    ],
    categoryId: "ammo",
    storeId: "s1",
    storeName: "Falcon Hunt Store",
    description: "12 gauge shells box. Reserve in-app, pay in store (18+).",
    inStock: true,
  },

  {
    id: "p6b",
    name: "20ga Shells Box",
    price: 19,
    images: [
      "https://images.unsplash.com/photo-1604617677963-d4ad8e0f2f25?auto=format&fit=crop&w=1600&q=60",
    ],
    categoryId: "ammo",
    storeId: "s1",
    storeName: "Falcon Hunt Store",
    description: "20 gauge shells box. Reserve in-app, pay in store (18+).",
    inStock: true,
  },

  {
    id: "p7",
    name: "Over/Under Shotgun",
    price: 900,
    images: [
      "https://images.unsplash.com/photo-1609851451256-7f9e3b1a4d74?auto=format&fit=crop&w=1600&q=60",
    ],
    categoryId: "shotguns",
    storeId: "s3",
    storeName: "Beqaa Outdoors",
    description: "In-store purchase only (18+).",
    inStock: true,
  },

  {
    id: "p7b",
    name: "Semi-Auto Shotgun",
    price: 980,
    images: [
      "https://images.unsplash.com/photo-1541963463532-d68292c34b19?auto=format&fit=crop&w=1600&q=60",
    ],
    categoryId: "shotguns",
    storeId: "s3",
    storeName: "Beqaa Outdoors",
    description: "In-store purchase only (18+).",
    inStock: true,
  },
];