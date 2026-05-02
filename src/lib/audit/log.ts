// Helper centralizzato per scrivere righe di AuditLog.
//
// Tutte le route che fanno modifiche persistenti (POST/PATCH/DELETE su Quote,
// Product, DiscountCode, User) chiamano logAction al momento giusto. Errori
// nella scrittura dell'audit log NON devono mai far fallire l'operazione
// principale: catturati e loggati su console.

import { prisma } from "@/lib/prisma";

export type AuditAction =
  | "CREATE"
  | "UPDATE"
  | "DELETE"
  | "SEND"
  | "DUPLICATE"
  | "STATUS_CHANGE";

export type AuditEntityType =
  | "Quote"
  | "Product"
  | "DiscountCode"
  | "User"
  | "ProductCost"
  | "RoiConfig";

export type LogActionParams = {
  userId: string;
  action: AuditAction;
  entityType: AuditEntityType;
  entityId: string;
  before?: unknown;
  after?: unknown;
  metadata?: Record<string, unknown>;
};

/**
 * Scrive una riga di audit log. Fire-and-forget: in caso di errore, lo
 * logghiamo su console e proseguiamo. Mai bloccare la route principale per
 * un fail dell'audit.
 */
export async function logAction(params: LogActionParams): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        userId: params.userId,
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId,
        before: params.before !== undefined ? JSON.stringify(params.before) : null,
        after: params.after !== undefined ? JSON.stringify(params.after) : null,
        metadata: params.metadata ? JSON.stringify(params.metadata) : null,
      },
    });
  } catch (e) {
    console.error("[audit] failed to write log", {
      error: e instanceof Error ? e.message : String(e),
      action: params.action,
      entityType: params.entityType,
      entityId: params.entityId,
    });
  }
}

/**
 * Restringe un'entita' Prisma alle proprieta' "interessanti" per l'audit log,
 * evitando di salvare snapshot enormi col contenuto degli items o dei costi.
 * Usata per Quote e simili.
 */
export function summarizeForAudit<T extends Record<string, unknown>>(
  obj: T,
  keys: Array<keyof T>
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const k of keys) {
    out[k as string] = obj[k];
  }
  return out;
}

/** Chiavi standard da snappare per l'entita' Quote nell'audit. */
export const QUOTE_AUDIT_KEYS = [
  "quoteNumber",
  "clientName",
  "clientCompany",
  "clientEmail",
  "totalOneTime",
  "totalMonthly",
  "totalAnnual",
  "discountType",
  "discountAmount",
  "status",
  "salesStage",
  "deliveryStage",
  "creditoMcEnabled",
] as const;
