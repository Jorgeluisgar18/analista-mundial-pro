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
    value: z.string().trim().max(4000).optional(),
  })
  .superRefine((data, context) => {
    function requireField(
      field: "teamId" | "impact" | "area" | "value" | "player",
      message: string,
    ) {
      if (data[field]) return;
      context.addIssue({
        code: "custom",
        path: [field],
        message,
      });
    }

    if (data.type === "absence") {
      requireField("teamId", "Selecciona el equipo afectado.");
      requireField("impact", "Selecciona el nivel de impacto.");
      requireField("area", "Selecciona el área afectada.");
    }

    if (data.type === "starter") {
      requireField("teamId", "Selecciona el equipo afectado.");
      requireField("player", "Indica el titular confirmado.");
      requireField("impact", "Selecciona el nivel de impacto.");
      requireField("area", "Selecciona el área afectada.");
    }

    if (data.type === "formation") {
      requireField("teamId", "Selecciona el equipo afectado.");
      requireField("value", "Indica la formación confirmada.");
    }

    if (["referee", "weather", "odds"].includes(data.type)) {
      requireField("value", "Indica el valor confirmado del cambio.");
    }
  });
