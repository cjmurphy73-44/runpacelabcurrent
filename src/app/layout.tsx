import './globals.css';
import Navigation from '../components/Navigation';

export const metadata = {
  title: 'RunPaceLogic | Running Science & Pace Calculator Engine',
  description: 'VDOT, physiological target heart rate zones, and environmental weather pace adjustments.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-slate-50 text-slate-900 min-h-screen flex flex-col font-sans antialiased">
        <Navigation />
        <div className="flex-1">{children}</div>
      </body>
    </html>
  );
}
