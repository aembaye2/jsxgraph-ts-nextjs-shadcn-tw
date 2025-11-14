import DrawingBoard from "@/components/DrawingBoard";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-50 to-zinc-100 dark:from-zinc-900 dark:to-black">
      <main className="container mx-auto py-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 mb-2">
            JSXGraph Drawing App
          </h1>
          {/* <p className="text-lg text-zinc-600 dark:text-zinc-400">
            Draw lines, rectangles, and circles with interactive mouse controls
          </p> */}
        </div>
        <DrawingBoard />
      </main>
    </div>
  );
}
