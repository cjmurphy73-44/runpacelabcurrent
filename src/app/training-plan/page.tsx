import TrainingCalendar from '../../components/TrainingCalendar';

export const metadata = {
  title: 'Training Plan & Calendar | RunPaceLogic',
  description: 'Periodized endurance training schedule calibrated to your VDOT fitness score.',
};

export default function TrainingPlanPage() {
  return (
    <main className="min-h-screen bg-slate-50 py-12 px-4">
      <TrainingCalendar />
    </main>
  );
}
