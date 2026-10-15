import "server-only";
import { and, desc, eq } from "drizzle-orm";
import type { Db } from "@/db";
import { aiReports } from "@/db/schema";
import type { AiReport, Review, Scorecard } from "@/lib/ai-schemas";

type NewReport = { kind: "interview"; data: Scorecard } | { kind: "review"; data: Review };

export async function saveReport(db: Db, courseId: string, title: string, report: NewReport): Promise<AiReport> {
  const [row] = await db.insert(aiReports).values({ course: courseId, title, kind: report.kind, data: report.data }).returning();
  return toReport(row);
}

export async function listReports(db: Db, courseId: string, kind: AiReport["kind"], limit = 20): Promise<AiReport[]> {
  const rows = await db
    .select()
    .from(aiReports)
    .where(and(eq(aiReports.course, courseId), eq(aiReports.kind, kind)))
    .orderBy(desc(aiReports.createdAt))
    .limit(limit);
  return rows.map(toReport);
}

function toReport(row: typeof aiReports.$inferSelect): AiReport {
  return { id: row.id, kind: row.kind, title: row.title, createdAt: row.createdAt.toISOString(), data: row.data } as AiReport;
}
