// src/data/rentals.ts

export type RentalType = "land" | "cabin";

export type Rental = {
  id: string;
  title: string;
  region: string;
  type: RentalType;
  pricePerDay: number;

  // Main card image
  image: string;

  // Details gallery (carousel + zoom)
  images: string[];

  size?: string;
  capacity?: number;
  description: string;

  // Availability: block specific dates (YYYY-MM-DD)
  blockedDates?: string[];

  // Optional: block ranges too (inclusive)
  blockedRanges?: { start: string; end: string }[];
};

export const RENTALS: Rental[] = [
  {
    id: "r1",
    title: "Beqaa Hunting Land",
    region: "Beqaa",
    type: "land",
    pricePerDay: 120,
    image:
      "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1600&q=60",
    images: [
      "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=2000&q=60",
      "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&w=2000&q=60",
      "https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=2000&q=60",
    ],
    size: "12 hectares",
    capacity: 4,
    description:
      "Private land ideal for upland hunting. Quiet area, natural cover, and safe access.",

    // Example blocked dates (you’ll replace with real bookings later)
    blockedDates: [
      "2026-02-28",
      "2026-03-02",
      "2026-03-08",
      "2026-03-09",
      "2026-03-15",
    ],
    blockedRanges: [
      { start: "2026-03-20", end: "2026-03-23" }, // inclusive
    ],
  },
  {
    id: "r2",
    title: "Mountain Cabin Retreat",
    region: "Keserwan",
    type: "cabin",
    pricePerDay: 200,
    image:
      "https://images.unsplash.com/photo-1505691938895-1758d7feb511?auto=format&fit=crop&w=1600&q=60",
    images: [
      "https://images.unsplash.com/photo-1505691938895-1758d7feb511?auto=format&fit=crop&w=2000&q=60",
      "https://images.unsplash.com/photo-1502005229762-cf1b2da7c5d6?auto=format&fit=crop&w=2000&q=60",
      "https://images.unsplash.com/photo-1445019980597-93fa8acb246c?auto=format&fit=crop&w=2000&q=60",
    ],
    capacity: 6,
    description:
      "Fully equipped cabin with fireplace. Perfect base for hunting trips.",

    blockedDates: ["2026-03-01", "2026-03-05", "2026-03-06"],
    blockedRanges: [{ start: "2026-03-12", end: "2026-03-14" }],
  },
];