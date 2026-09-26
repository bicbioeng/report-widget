// KIDS-style wiring: REST transport, build SHA from Vite env, history-patch route tracking.
import React from 'react';
import { createRoot } from 'react-dom/client';
import { ReportProvider, FeedbackWidget, RouteRecorder, installContextBuffer, openFeedback } from '@bicbioeng/report-widget';
import { createKidsTransport } from '@bicbioeng/report-widget/adapters/kids';
import '@bicbioeng/report-widget/styles.css';

installContextBuffer(); // as early as possible, like KIDS src/index.jsx

const transport = createKidsTransport({
  baseUrl: import.meta.env.VITE_REST_API_URL || '/api',
  getAuthHeaders: async () => ({ Authorization: 'Bearer dev' }),
});

createRoot(document.getElementById('root')).render(
  <ReportProvider config={{ transport, buildSha: import.meta.env.VITE_BUILD_SHA || 'dev', appName: 'KIDS' }}>
    <h1>Vite fixture</h1>
    <button type="button" onClick={() => openFeedback({ kind: 'idea', summary: 'Prefilled' })}>Open with prefill</button>
    <RouteRecorder />
    <FeedbackWidget onOpenTicket={(key) => window.location.assign(`/browse/${key}`)} />
  </ReportProvider>,
);
