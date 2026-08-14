import VdotCalculator from '../../components/VdotCalculator';

export const metadata = {
  title: 'VDOT Calculator | RunPaceLogic',
  description: 'Calculate running VDOT fitness score and equivalent training pace zones.',
};

export default function VdotPage() {
  return (
    <main className="min-h-screen bg-slate-50 py-12 px-4">
      <VdotCalculator />
    </main>
  );
}
