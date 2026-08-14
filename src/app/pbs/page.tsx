import RaceDistanceLedger from '../../components/RaceDistanceLedger';

export const metadata = {
  title: 'Race Distance Ledger & PBs | RunPaceLogic',
  description: 'Track all-time personal bests, fast splits, and segment breakdowns within longer races.',
};

export default function PbsPage() {
  return (
    <main className="min-h-screen bg-slate-50 py-12 px-4">
      <RaceDistanceLedger />
    </main>
  );
}
