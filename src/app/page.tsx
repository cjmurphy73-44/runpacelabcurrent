import Link from 'next/link';
import AICoachWidget from '../components/AICoachWidget';

export default function Home() {
  const tools = [
    {
      title: 'VDOT Fitness Calculator',
      description: 'Calculate your running score, race predictions, and target training paces.',
      href: '/vdot',
      badge: 'Core Engine',
      color: 'border-blue-200 hover:border-blue-400 bg-blue-50/30',
    },
    {
      title: 'Weather & Altitude Adjuster',
      description: 'Adjust paces instantly for dew point, temperature, relative humidity, and elevation.',
      href: '/weather-adjust',
      badge: 'Environmental',
      color: 'border-amber-200 hover:border-amber-400 bg-amber-50/30',
    },
    {
      title: 'Heart Rate & Pace Zones',
      description: 'Compute physiological zones using Karvonen HR Reserve or Daniels VDOT formulas.',
      href: '/zones',
      badge: 'Physiology',
      color: 'border-emerald-200 hover:border-emerald-400 bg-emerald-50/30',
    },
  ];

  return (
    <main className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-12">
        
        {/* Hero Section */}
        <div className="text-center space-y-4">
          <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-bold uppercase tracking-wider">
            Running Science & Intelligence Engine
          </span>
          <h1 className="text-4xl sm:text-5xl font-extrabold text-slate-900 tracking-tight">
            Train Smarter with <span className="text-blue-600">RunPaceLogic</span>
          </h1>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            Advanced algorithms for endurance athletes combining VDOT physiology, weather heat stress penalties, and AI coaching insights.
          </p>
        </div>

        {/* AI Coach & Quick Launch Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          
          {/* Left / Main Tools (2 columns) */}
          <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-6">
            {tools.map((tool) => (
              <Link
                key={tool.href}
                href={tool.href}
                className={`p-6 rounded-2xl border-2 transition-all shadow-sm hover:shadow-md flex flex-col justify-between ${tool.color}`}
              >
                <div>
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-xs font-bold uppercase tracking-wider px-2.5 py-1 bg-white rounded-md shadow-xs text-slate-700">
                      {tool.badge}
                    </span>
                    <span className="text-blue-600 font-bold text-sm">Launch &rarr;</span>
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 mb-2">{tool.title}</h3>
                  <p className="text-sm text-slate-600">{tool.description}</p>
                </div>
              </Link>
            ))}
          </div>

          {/* Right / AI Coach Widget */}
          <div className="lg:col-span-1">
            <AICoachWidget />
          </div>

        </div>

      </div>
    </main>
  );
}
