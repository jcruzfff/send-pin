import BackButton from '@/components/BackButton';

export default function LetPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-5xl mx-auto px-[18px]">
        <div className="py-4">
          <BackButton />
        </div>
        
        <h1 className="text-2xl font-bold mb-6">Let</h1>
        
        {/* Placeholder spots list */}
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map((spot) => (
            <div
              key={spot}
              className="p-4 rounded-lg border-2 border-dashed border-muted-foreground/25 flex items-center"
            >
              {/* Placeholder image */}
              <div className="w-16 h-16 rounded-lg border-2 border-dashed border-muted-foreground/25 flex items-center justify-center">
                <span className="text-xs text-muted-foreground">Image</span>
              </div>
              
              <div className="ml-4">
                <h2 className="font-medium">Let Spot {spot}</h2>
                <p className="text-sm text-muted-foreground">Challenge description</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
} 