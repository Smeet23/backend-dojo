import { courses } from "@/content/catalog";
import { CourseList } from "./CourseList";

export default function Home() {
  const cards = courses.map(({ course, lectures }) => ({
    id: course.id,
    title: course.title,
    summary: course.summary,
    author: course.author,
    lectureKeys: lectures.filter((l) => l.available).map((l) => `${course.id}:${l.id}`),
  }));

  return (
    <div>
      <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Courses</h1>
      <p className="mt-2 max-w-xl text-muted">
        Read each lesson, play with the widgets, then prove it with real-world scenarios. No videos needed.
      </p>
      <CourseList courses={cards} />
    </div>
  );
}
