import { z } from "zod";

export const isoDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((value) => !Number.isNaN(Date.parse(`${value}T00:00:00Z`)), {
    message: "Fecha inválida",
  });

export const manualOverrideSchema = z.object({
  type: z.enum([
    "absence",
    "starter",
    "formation",
    "referee",
    "weather",
    "odds",
    "suspension",
  ]),
  description: z.string().trim().min(5).max(500),
  sourceUrl: z.url().optional().or(z.literal("")),
  observedAt: z.iso.datetime().optional(),
});
