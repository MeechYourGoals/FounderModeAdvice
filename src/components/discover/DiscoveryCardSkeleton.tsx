import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

/** Matches DiscoveryCard's layout so the grid doesn't jump when data lands. */
export const DiscoveryCardSkeleton = () => (
  <Card className="flex h-full flex-col overflow-hidden">
    <Skeleton className="aspect-[16/9] w-full rounded-none" />
    <div className="flex flex-1 flex-col gap-3 p-4">
      <Skeleton className="h-3 w-1/2" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-4/5" />
      <Skeleton className="h-16 w-full rounded-xl" />
      <div className="mt-auto flex gap-2 pt-1">
        <Skeleton className="h-10 flex-1 rounded-full" />
        <Skeleton className="h-10 w-10 rounded-full" />
      </div>
    </div>
  </Card>
);

export const DiscoveryGridSkeleton = ({ count = 6 }: { count?: number }) => (
  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-busy="true" aria-label="Loading recommendations">
    {Array.from({ length: count }, (_, index) => (
      <DiscoveryCardSkeleton key={index} />
    ))}
  </div>
);
