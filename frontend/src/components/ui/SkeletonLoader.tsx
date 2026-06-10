import { Skeleton } from "./skeleton";

export function HeroBannerSkeleton() {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-muted p-8 md:p-12 mb-8 border shadow-xs min-h-[280px] md:min-h-[440px] flex flex-col justify-center">
      <div className="relative z-10 max-w-3xl space-y-4">
        <Skeleton className="h-10 w-2/3 md:h-16" />
        <Skeleton className="h-6 w-1/2" />
        <Skeleton className="h-10 w-36 rounded-full mt-4" />
      </div>
    </div>
  );
}

export function CategoryCirclesSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6 mb-8">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex flex-col items-center gap-3 rounded-xl border bg-card p-4 shadow-sm">
          <Skeleton className="aspect-square w-full rounded-lg" />
          <Skeleton className="h-4 w-3/4" />
        </div>
      ))}
    </div>
  );
}

export function ProductGridSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4 mb-8">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex flex-col gap-3 rounded-xl border p-4 bg-card shadow-sm">
          <Skeleton className="aspect-square w-full rounded-lg" />
          <Skeleton className="h-3 w-1/3" />
          <Skeleton className="h-5 w-5/6" />
          <div className="flex justify-between items-center mt-2">
            <Skeleton className="h-5 w-1/4" />
            <Skeleton className="h-8 w-8 rounded-full" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function BlogGridSkeleton() {
  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 mb-8">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="flex flex-col gap-3 rounded-xl border p-4 shadow-sm bg-card">
          <Skeleton className="aspect-video w-full rounded-lg" />
          <div className="flex justify-between items-center mt-2">
            <Skeleton className="h-3 w-1/4" />
            <Skeleton className="h-3 w-1/5" />
          </div>
          <Skeleton className="h-5 w-full mt-2" />
          <Skeleton className="h-3.5 w-2/3" />
        </div>
      ))}
    </div>
  );
}

export function SidebarFiltersSkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="rounded-xl border bg-card p-4 space-y-3">
          <Skeleton className="h-4 w-1/3" />
          <div className="space-y-2">
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-4/5" />
            <Skeleton className="h-3 w-3/4" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function HomepageSkeleton() {
  return (
    <div className="container-page py-6 space-y-12">
      <HeroBannerSkeleton />
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <CategoryCirclesSkeleton />
      </div>
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <ProductGridSkeleton count={4} />
      </div>
      <div className="space-y-6">
        <Skeleton className="h-8 w-40" />
        <BlogGridSkeleton />
      </div>
    </div>
  );
}

export function ReliefSkeleton() {
  return (
    <div className="container-page py-8 space-y-12">
      <div className="space-y-2">
        <Skeleton className="h-4 w-32" />
        <HeroBannerSkeleton />
      </div>
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <CategoryCirclesSkeleton />
      </div>
      <div className="space-y-6">
        <Skeleton className="h-8 w-56" />
        <CategoryCirclesSkeleton />
      </div>
    </div>
  );
}

export function ReliefCategorySkeleton() {
  return (
    <div className="container-page py-8 space-y-12">
      <div className="space-y-2">
        <Skeleton className="h-4 w-48" />
        <HeroBannerSkeleton />
      </div>
      <div className="space-y-6">
        <Skeleton className="h-8 w-56" />
        <CategoryCirclesSkeleton />
      </div>
      <div className="space-y-8">
        <Skeleton className="h-8 w-64" />
        <div className="space-y-6">
          <Skeleton className="h-4 w-full" />
          <CategoryCirclesSkeleton />
        </div>
      </div>
    </div>
  );
}

export function CategorySkeleton() {
  return (
    <div className="container-page py-6">
      <div className="space-y-3 mb-6">
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-10 w-72" />
        <Skeleton className="h-4 w-32" />
      </div>
      <div className="grid gap-8 lg:grid-cols-[260px_1fr]">
        <SidebarFiltersSkeleton />
        <div>
          <div className="mb-4 flex items-center justify-between">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-9 w-40" />
          </div>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex flex-col gap-3 rounded-xl border p-4 bg-card shadow-sm">
                <Skeleton className="aspect-square w-full rounded-lg" />
                <Skeleton className="h-3 w-1/3" />
                <Skeleton className="h-5 w-5/6" />
                <div className="flex justify-between items-center mt-2">
                  <Skeleton className="h-5 w-1/4" />
                  <Skeleton className="h-8 w-8 rounded-full" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
