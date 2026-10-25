import { Skeleton } from "@/components/ui/primitives";

export default function ProjectsLoading() {
  return (
    <div className="mx-auto w-full max-w-6xl px-5 pb-20 pt-36 sm:px-8">
      <Skeleton className="h-3 w-24" />
      <Skeleton className="mt-6 h-12 w-1/2 max-w-lg" />
      <Skeleton className="mt-4 h-4 w-2/3 max-w-md" />
      <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="overflow-hidden rounded-lg border border-line">
            <Skeleton className="aspect-[4/3] w-full rounded-none" />
            <div className="space-y-3 p-5">
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
