import AICoachWidget from '../../components/AICoachWidget';

export const metadata = {
  title: 'AI Running Coach | RunPaceLogic',
  description: 'Contextual endurance coaching powered by VDOT physiology and environmental weather modeling.',
};

export default function AICoachPage() {
  return (
    <main className="min-h-screen bg-slate-900 text-white py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="text-center space-y-2">
          <span className="px-3 py-1 bg-indigo-900/80 text-indigo-300 border border-indigo-700/50 rounded-full text-xs font-bold uppercase tracking-wider">
            Intelligent Training Intelligence
          </span>
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight">RPL AI Running Coach</h1>
          <p className="text-slate-400 max-w-xl mx-auto text-sm">
            Consult your virtual running scientist for instant pace adjustments, heat stress protocols, and race strategy.
          </p>
        </div>

        <AICoachWidget />
      </div>
    </main>
  );
}
