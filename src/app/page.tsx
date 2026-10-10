import { LectureList } from "./LectureList";

export default function Home() {
  return (
    <div>
      <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Backend from first principles</h1>
      <p className="mt-2 max-w-xl text-muted">
        Read each lesson, play with the widgets, then prove it with real-world scenarios. No videos needed.
      </p>
      <LectureList />
    </div>
  );
}
