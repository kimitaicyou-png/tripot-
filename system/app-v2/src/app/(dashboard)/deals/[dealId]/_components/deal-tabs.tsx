'use client';

import { useState, type ReactNode } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

type Counts = {
  meetings: number;
  proposals: number;
  estimates: number;
  invoices: number;
};

export function DealTabs({
  initialTab = 'overview',
  counts,
  overview,
  meetings,
  proposals,
  estimates,
  invoices,
}: {
  initialTab?: string;
  counts: Counts;
  overview: ReactNode;
  meetings: ReactNode;
  proposals: ReactNode;
  estimates: ReactNode;
  invoices: ReactNode;
}) {
  const [tab, setTab] = useState(initialTab);

  return (
    <Tabs value={tab} onValueChange={setTab} defaultValue={initialTab} className="w-full">
      <div className="px-6 sticky top-0 z-10 bg-surface/90 backdrop-blur-sm">
        <TabsList className="overflow-x-auto -mx-6 px-6 flex-nowrap whitespace-nowrap w-[calc(100%+3rem)]">
          <TabsTrigger value="overview">概要</TabsTrigger>
          <TabsTrigger value="meetings" count={counts.meetings}>議事録</TabsTrigger>
          <TabsTrigger value="proposals" count={counts.proposals}>提案書</TabsTrigger>
          <TabsTrigger value="estimates" count={counts.estimates}>見積</TabsTrigger>
          <TabsTrigger value="invoices" count={counts.invoices}>請求</TabsTrigger>
        </TabsList>
      </div>

      <div className="px-6 py-6 max-w-3xl mx-auto">
        <TabsContent value="overview">{overview}</TabsContent>
        <TabsContent value="meetings">{meetings}</TabsContent>
        <TabsContent value="proposals">{proposals}</TabsContent>
        <TabsContent value="estimates">{estimates}</TabsContent>
        <TabsContent value="invoices">{invoices}</TabsContent>
      </div>
    </Tabs>
  );
}
