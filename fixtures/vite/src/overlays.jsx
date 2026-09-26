// Report over host overlays: an antd Modal and a masked right-side Drawer, both
// maskClosable with footer buttons. A stub transport records what the widget
// sends (window.__reports); set window.__failSubmit = true to make it throw.
import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Button, Drawer, Modal } from 'antd';
import { ReportProvider, FeedbackWidget } from '@bicbioeng/report-widget';
import '@bicbioeng/report-widget/styles.css';

window.__reports = [];
window.__clicks = [];
const transport = {
  fetchFeedbackConfig: async () => ({ project: { name: 'Fixture' }, transcription: { available: false } }),
  submitFeedback: async (payload) => {
    if (window.__failSubmit) throw new Error('stub: submit failed');
    window.__reports.push(payload);
    return { id: window.__reports.length, ticketKey: `FIX-${window.__reports.length}` };
  },
  uploadFeedbackFile: async () => ({}),
  finalizeFeedback: async () => ({}),
  transcribeAudio: async () => ({ unavailable: true }),
  fetchMyFeedback: async () => ({ items: [] }),
};

function Page() {
  const [modal, setModal] = useState(false);
  const [drawer, setDrawer] = useState(false);
  const click = (name) => () => window.__clicks.push(name);
  return (
    <main style={{ padding: 24 }}>
      <h1>Overlays fixture</h1>
      <Button id="open-modal" onClick={() => setModal(true)}>Open modal</Button>{' '}
      <Button id="open-drawer" onClick={() => setDrawer(true)}>Open drawer</Button>
      <Modal
        open={modal}
        title="Host modal"
        onCancel={() => setModal(false)}
        maskClosable
        footer={[
          <Button key="c" id="modal-cancel" onClick={() => setModal(false)}>Cancel</Button>,
          <Button key="s" id="modal-send" type="primary" onClick={click('modal-send')}>Send</Button>,
        ]}
      >
        <p>A host modal. Clicking its mask closes it.</p>
      </Modal>
      <Drawer
        open={drawer}
        title="Host drawer"
        placement="right"
        width={420}
        mask
        maskClosable
        onClose={() => setDrawer(false)}
        footer={(
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <Button id="drawer-cancel" onClick={() => setDrawer(false)}>Cancel</Button>
            <Button id="drawer-send" type="primary" onClick={click('drawer-send')}>Send</Button>
          </div>
        )}
      >
        <p>A masked right-side drawer. Clicking its mask closes it.</p>
      </Drawer>
    </main>
  );
}

createRoot(document.getElementById('root')).render(
  <ReportProvider config={{ transport, appName: 'Fixture' }}>
    <Page />
    <FeedbackWidget />
  </ReportProvider>,
);
