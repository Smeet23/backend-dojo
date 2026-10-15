export type Section = { id: string; heading: string; text: string };
export function lessonSections(mdx: string): Section[];
export function buildLessonText(): Record<string, Section[]>;
export function serialize(data: unknown): string;
