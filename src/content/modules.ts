import { lectures } from "./lectures";
import type { Lecture } from "@/lib/types";

export type Module = { id: string; title: string; lectureIds: number[] };

/** The six modules of the course, in order. */
export const modules: Module[] = [
  { id: "foundations", title: "Foundations", lectureIds: [1, 2, 3, 4, 5, 6, 7] },
  { id: "api-core", title: "API core", lectureIds: [8, 9, 10, 11] },
  { id: "data", title: "Data layer", lectureIds: [12, 13, 14, 15] },
  { id: "production", title: "Production", lectureIds: [16, 17, 18, 19, 20] },
  { id: "scale", title: "Scale & real-time", lectureIds: [21.1, 21.2, 22, 23, 24, 25] },
  { id: "ship", title: "Ship it", lectureIds: [26, 27, 28, 29, 30] },
];

export function moduleLectures(m: Module): Lecture[] {
  return m.lectureIds.map((id) => lectures.find((l) => l.id === id)!).filter(Boolean);
}

export function moduleOf(lectureId: number): Module | undefined {
  return modules.find((m) => m.lectureIds.includes(lectureId));
}
