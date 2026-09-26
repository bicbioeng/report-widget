// Server component: global CSS import is fine here; the widget itself lives in a client file.
import '@bicbioeng/report-widget/styles.css';
import Report from './report';

export const metadata = { title: 'report-widget · next' };

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        {children}
        <Report />
      </body>
    </html>
  );
}
