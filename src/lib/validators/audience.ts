import { z } from "zod";

export const contactCreateSchema = z.object({
  email: z.string().email().max(254),
  firstName: z.string().trim().max(100).optional().nullable(),
  lastName: z.string().trim().max(100).optional().nullable(),
  customFields: z.record(z.string()).optional(),
  tagIds: z.array(z.string()).optional(),
  source: z.string().max(80).optional(),
});

export const importContactSchema = z.object({
  email: z.string().email().max(254),
  firstName: z.string().trim().max(100).optional().nullable(),
  lastName: z.string().trim().max(100).optional().nullable(),
  customFields: z.record(z.string()).optional(),
  tagNames: z.array(z.string().max(60)).optional(),
});

export const importSchema = z.object({
  contacts: z.array(importContactSchema).min(1).max(50_000),
  source: z.string().max(80).optional(),
  confirmPurchasedListsPolicy: z.boolean().optional(),
});

export const bulkActionSchema = z.object({
  action: z.enum(["tag", "untag", "unsubscribe", "delete"]),
  contactIds: z.array(z.string()).min(1).max(5_000),
  tagId: z.string().optional(),
});

export const tagSchema = z.object({
  name: z.string().trim().min(1).max(60),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
});

export const segmentConditionSchema = z.object({
  field: z.string().min(1).max(80),
  operator: z.enum([
    "eq",
    "neq",
    "contains",
    "not_contains",
    "starts_with",
    "is_set",
    "is_empty",
    "in",
  ]),
  value: z.string().max(500).optional(),
});

export const segmentRulesSchema = z.object({
  match: z.enum(["all", "any"]),
  conditions: z.array(segmentConditionSchema).max(50),
});

export const segmentSchema = z.object({
  name: z.string().trim().min(1).max(80),
  rules: segmentRulesSchema,
});
