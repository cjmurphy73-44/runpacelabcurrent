import ZonesCalculator from '../../components/ZonesCalculator';

export const metadata = {
  title: 'Heart Rate & Pace Zones Calculator | RunPaceLogic',
  description: 'Calculate physiological heart rate target zones and training pace zones.',
};

export default function ZonesPage() {
  return (
    <main className="min-h-screen bg-slate-50 py-12 px-4">
      <ZonesCalculator />
    </main>
  );
}
