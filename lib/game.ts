import { z } from "zod";
export const statuses = [
  "REGULAR_ROTATION",
  "PLAYING",
  "PLAYED",
  "OCCASIONAL",
  "INTERESTED",
  "DROPPED",
] as const;
export const statusLabel: Record<string, string> = {
  REGULAR_ROTATION: "Regular Rotation",
  PLAYING: "Playing",
  PLAYED: "Played",
  OCCASIONAL: "Occasional",
  INTERESTED: "Interested",
  DROPPED: "Dropped",
};
const media = z
  .string()
  .max(2048)
  .refine((v) => !v || /^https?:\/\//i.test(v), "Use an HTTP or HTTPS URL");
export const gameSchema = z.object({
  title: z.string().trim().min(1).max(200),
  releaseDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable()
    .optional(),
  status: z.enum(statuses).default("INTERESTED"),
  platform: z.string().trim().min(1).max(80).default("PC"),
  timePlayedHours: z.number().min(0).max(100000).default(0),
  rating: z.number().int().min(1).max(5).nullable().optional(),
  reviewNotes: z.string().max(20000).nullable().optional(),
  inputMethod: z.string().max(100).default("Keyboard & Mouse"),
  isModded: z.boolean().default(false),
  modNotes: z.string().max(10000).nullable().optional(),
  additionalNotes: z.string().max(10000).nullable().optional(),
  steamAppId: z.string().regex(/^\d+$/).nullable().optional(),
  coverUrl: media.default(""),
  logoUrl: media.default(""),
  heroUrl: media.default(""),
  trailerUrl: media.default(""),
  gallery: z.array(media).max(100).default([]),
  hltbMainStoryHours: z.number().nonnegative().nullable().optional(),
  hltbMainExtraHours: z.number().nonnegative().nullable().optional(),
  hltbCompletionistHours: z.number().nonnegative().nullable().optional(),
});
export type GameInput = z.infer<typeof gameSchema>;
export type Game = GameInput & {
  id: string;
  createdAt: string;
  updatedAt: string;
};
