import { z } from "zod";

export const isoDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((value) => !Number.isNaN(Date.parse(`${value}T00:00:00Z`)), {
    message: "Fecha inválida",
  });

export const manualOverrideSchema = z
  .object({
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
    teamId: z.string().trim().min(1).optional(),
    player: z.string().trim().max(120).optional(),
    impact: z.enum(["low", "medium", "high"]).optional(),
    area: z.enum(["attack", "defense", "balanced"]).optional(),
    value: z.string().trim().max(200).optional(),
  })
  .superRefine((data, context) => {
    if (data.type !== "absence") return;
    if (!data.teamId) {
      context.addIssue({
        code: "custom",
        path: ["teamId"],
        message: "Selecciona el equipo afectado.",
      });
    }
    if (!data.impact) {
      context.addIssue({
        code: "custom",
        path: ["impact"],
        message: "Selecciona el nivel de impacto.",
      });
    }
    if (!data.area) {
      context.addIssue({
        code: "custom",
        path: ["area"],
        message: "Selecciona el área afectada.",
      });
    }
  });
