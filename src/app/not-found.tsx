import Link from 'next/link';
import { Button } from '@/components/ui/Button';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#F5F5F7] flex flex-col items-center justify-center p-4 text-center">
      <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center text-2xl font-bold text-[#1A1A2E] mb-4">
        404
      </div>
      <h1 className="text-xl font-bold text-[#1A1A2E] mb-2">Page Not Found</h1>
      <p className="text-sm text-[#888888] max-w-sm mb-6">
        The page or statement you are looking for does not exist or may have been moved.
      </p>
      <Link href="/main">
        <Button variant="primary">Return to Home</Button>
      </Link>
    </div>
  );
}
