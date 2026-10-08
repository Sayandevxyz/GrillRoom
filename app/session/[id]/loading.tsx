import { Skeleton } from "@/components/ui/Skeleton";

export default function SessionLoading() {
  return (
    <div className="min-h-screen bg-[#0C0D0E] text-[#F3F4F6] p-6 max-w-6xl mx-auto space-y-6 animate-pulse">
      <div className="flex items-center justify-between border-b border-[#23272B] pb-4">
        <div className="space-y-2">
          <Skeleton className="h-7 w-48 bg-[#1B1E22]" />
          <Skeleton className="h-4 w-32 bg-[#1B1E22]" />
        </div>
        <Skeleton className="h-10 w-28 rounded-lg bg-[#1B1E22]" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="p-4 rounded-xl border border-[#23272B] bg-[#141619] space-y-3">
            <div className="flex items-center gap-3">
              <Skeleton className="h-10 w-10 rounded-full bg-[#1B1E22]" />
              <div className="space-y-1">
                <Skeleton className="h-4 w-20 bg-[#1B1E22]" />
                <Skeleton className="h-3 w-14 bg-[#1B1E22]" />
              </div>
            </div>
            <Skeleton className="h-2 w-full rounded-full bg-[#1B1E22]" />
          </div>
        ))}
      </div>

      <div className="h-96 rounded-xl border border-[#23272B] bg-[#141619] p-6 space-y-4">
        <Skeleton className="h-6 w-3/4 bg-[#1B1E22]" />
        <Skeleton className="h-4 w-full bg-[#1B1E22]" />
        <Skeleton className="h-4 w-5/6 bg-[#1B1E22]" />
      </div>
    </div>
  );
}
