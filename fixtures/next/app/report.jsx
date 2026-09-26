'use client';
// READS-style wiring: GraphQL transport over plain fetch, App Router pathname.
// The transport holds functions, so it must be created in a client file.
import { usePathname } from 'next/navigation';
import { ReportProvider, FeedbackWidget, RouteRecorder } from '@bicbioeng/report-widget';
import { createReadsGraphqlTransport } from '@bicbioeng/report-widget/adapters/reads-graphql';

const transport = createReadsGraphqlTransport({ url: '/graphql', app: 'gedb' });
const config = { transport, buildSha: process.env.NEXT_PUBLIC_BUILD_SHA || 'dev', appName: 'GeDB' };

export default function Report() {
  const pathname = usePathname();
  return (
    <ReportProvider config={config}>
      <RouteRecorder pathname={pathname} />
      <FeedbackWidget />
    </ReportProvider>
  );
}
