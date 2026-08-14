import WeatherAdjuster from '../../components/WeatherAdjuster';

export const metadata = {
  title: 'Weather & Altitude Pace Adjuster | RunPaceLogic',
  description: 'Adjust running pace targets based on ambient temperature, humidity, dew point, and elevation.',
};

export default function WeatherAdjustPage() {
  return (
    <main className="min-h-screen bg-slate-50 py-12 px-4">
      <WeatherAdjuster />
    </main>
  );
}
