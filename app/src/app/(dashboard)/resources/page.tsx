import Link from 'next/link';
import { ResourcesContent } from '@/components/production/ResourcesContent';

export default function ResourcesPage() {
  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto">
      <Link href="/settings" className="text-sm text-gray-500 hover:text-gray-900 font-medium">← 設定に戻る</Link>
      <ResourcesContent />
    </div>
  );
}
