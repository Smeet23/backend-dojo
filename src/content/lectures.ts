import type { Lecture } from "@/lib/types";

export const lectures: Lecture[] = [
  {
    id: 1,
    slug: "roadmap",
    title: "The roadmap",
    summary: "The map of everything a backend engineer needs, and the order to learn it in.",
    videoUrl: "https://www.youtube.com/watch?v=0Rwb4Xmlcwc",
    minutes: 31,
    available: true,
  },
  {
    id: 2,
    slug: "path-of-a-backend-engineer",
    title: "Walk the path of a backend engineer",
    summary: "Why fundamentals beat frameworks.",
    videoUrl: "https://www.youtube.com/watch?v=3qFjZbFRSAU",
    minutes: 4,
    available: true,
  },
  {
    id: 3,
    slug: "what-is-a-backend",
    title: "What is a backend?",
    summary: "What a backend is, how a request reaches it, and why we need one.",
    videoUrl: "https://www.youtube.com/watch?v=6Ss4dJD9Kzg",
    minutes: 19,
    available: true,
  },
  {
    id: 4,
    slug: "first-principles",
    title: "Why learn from first principles",
    summary: "Concepts transfer across languages; syntax doesn't.",
    videoUrl: "https://www.youtube.com/watch?v=6fqZs5Z3k9A",
    minutes: 10,
    available: true,
  },
  {
    id: 5,
    slug: "http",
    title: "HTTP for backend engineers",
    summary: "Statelessness, messages, headers, methods, CORS, status codes, caching and more.",
    videoUrl: "https://www.youtube.com/watch?v=a3C1DMswClQ",
    minutes: 78,
    available: true,
  },
];

export function getLecture(slug: string): Lecture | undefined {
  return lectures.find((l) => l.slug === slug);
}
