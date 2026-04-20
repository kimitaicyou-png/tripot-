'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { DealsContent } from '@/components/deals';
import dynamic from 'next/dynamic';

const PhotoDealCapture = dynamic(
  () => import('@/components/personal/PhotoDealCapture'),
  { ssr: false }
);

export default function MemberDealsPage() {
  const params = useParams();
  const memberId = params.memberId as string;
  const [photoOpen, setPhotoOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <div>
      <div className="flex justify-end gap-2 px-4 pt-3">
        <button
          onClick={() => setPhotoOpen(true)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 transition-colors active:scale-[0.98]"
        >
          📷 写メで登録
        </button>
        <Link
          href={`/home/${memberId}/deals/import`}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 transition-colors active:scale-[0.98]"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
            <path fillRule="evenodd" d="M10 3a.75.75 0 01.75.75v10.638l3.96-4.158a.75.75 0 111.08 1.04l-5.25 5.5a.75.75 0 01-1.08 0l-5.25-5.5a.75.75 0 111.08-1.04l3.96 4.158V3.75A.75.75 0 0110 3z" clipRule="evenodd" />
          </svg>
          インポート
        </Link>
      </div>
      <DealsContent key={refreshKey} />
      {photoOpen && (
        <PhotoDealCapture
          onClose={() => setPhotoOpen(false)}
          onSaved={() => setRefreshKey((k) => k + 1)}
        />
      )}
    </div>
  );
}
