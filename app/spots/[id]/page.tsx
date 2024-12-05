import { SpotDetail } from "@/components/spots/SpotDetail";
import { Suspense } from "react";
import { Loader2 } from "lucide-react";

interface PageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function SpotPage({ params }: PageProps) {
  const resolvedParams = await params;
  
  return (
    <Suspense 
      fallback={
        <div className="min-h-screen bg-black flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-white" />
        </div>
      }
    >
      <SpotDetail id={resolvedParams.id} />
    </Suspense>
  );
}

// Generate static params for known spots (optional)
export async function generateStaticParams() {
  return [];
} 