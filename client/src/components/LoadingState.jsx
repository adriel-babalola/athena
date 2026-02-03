import { Loader2 } from 'lucide-react';

export default function LoadingState() {
  return (
    <div className="bg-white rounded border border-[#E2E6EB] p-12 text-center shadow-sm">
      <div className="flex justify-center mb-6">
        <Loader2 className="w-10 h-10 text-[#1E3A5F] animate-spin" />
      </div>
      <h3 className="text-xl font-semibold text-[#1A202C] mb-2">
        Analyzing your text
      </h3>
      <p className="text-[#5A6677] text-sm">
        Finding the best educational videos...
      </p>
    </div>
  );
}