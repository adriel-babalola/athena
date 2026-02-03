import { BookOpen } from 'lucide-react';

export default function Header() {
  return (
    <header className="bg-[#1E3A5F] text-white px-6 lg:px-10 py-4 flex items-center justify-between border-b border-[#152C4A]">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 bg-white text-[#1E3A5F] rounded flex items-center justify-center">
          <BookOpen className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Athena</h1>
        </div>
      </div>
      <p className="hidden sm:block text-sm text-white/70">AI Study Companion</p>
    </header>
  );
}