import Link from "next/link";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#0f0f0f] text-white flex flex-col">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 sm:px-10 py-5 border-b border-white/5">
        <span className="text-xl font-bold tracking-tight">Contrl</span>
        <div className="flex items-center gap-6">
          <a href="#features" className="text-sm text-gray-400 hover:text-white transition-colors hidden sm:block">
            Features
          </a>
          <Link
            href="/app"
            className="text-sm px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 transition-colors font-medium"
          >
            Launch app →
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <main className="flex-1 flex flex-col">
        <section className="flex flex-col items-center justify-center text-center px-6 pt-24 pb-20">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-indigo-500/30 bg-indigo-950/30 text-indigo-400 text-xs font-medium mb-8">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
            Now in Beta — Free to use
          </div>

          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-bold tracking-tight leading-tight max-w-4xl">
            Understand variation.
            <br />
            <span className="text-indigo-400">Drive improvement.</span>
          </h1>

          <p className="mt-6 text-lg sm:text-xl text-gray-400 max-w-2xl leading-relaxed">
            Contrl turns your operational data into Statistical Process Control charts
            — the gold standard for spotting signals in noise. Built for teams that need
            to understand variation and drive improvement.
          </p>

          <div className="mt-10 flex flex-col sm:flex-row gap-4 items-center">
            <Link
              href="/app"
              className="px-7 py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 transition-colors font-semibold text-base shadow-lg shadow-indigo-900/40"
            >
              Try with demo data →
            </Link>
            <a
              href="#features"
              className="px-7 py-3.5 rounded-xl border border-white/10 hover:border-white/25 text-gray-300 hover:text-white transition-colors text-base"
            >
              See how it works
            </a>
          </div>

          {/* Stat strip */}
          <div className="mt-16 grid grid-cols-3 gap-8 sm:gap-16 border-t border-white/5 pt-12">
            {[
              { value: "52 weeks", label: "of data in seconds" },
              { value: "3 signals", label: "automatically detected" },
              { value: "Zero setup", label: "no databases, no code" },
            ].map((s) => (
              <div key={s.label} className="text-center">
                <div className="text-2xl sm:text-3xl font-bold text-white">{s.value}</div>
                <div className="text-sm text-gray-500 mt-1">{s.label}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Features */}
        <section id="features" className="px-6 sm:px-10 py-20 max-w-6xl mx-auto w-full">
          <h2 className="text-2xl sm:text-3xl font-bold text-center mb-4">
            Everything you need. Nothing you don't.
          </h2>
          <p className="text-center text-gray-500 mb-14 max-w-xl mx-auto">
            Contrl is purpose-built for operational managers who want clarity, not complexity.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                icon: "📊",
                title: "SPC Charts",
                desc: "X̄ charts with automatically calculated control limits (UCL/LCL). See where your process is in control — and where it isn't.",
              },
              {
                icon: "⚠️",
                title: "Signal Detection",
                desc: "Automatic flagging of run signals (8+ consecutive above/below mean) and trend signals (6+ consecutive moves) in red and orange.",
              },
              {
                icon: "✂️",
                title: "Process Splits",
                desc: "Click any data point to add a process split. Control limits recalculate for each segment, showing the impact of interventions.",
              },
              {
                icon: "📁",
                title: "Excel Upload",
                desc: "Drag and drop your .xlsx or .csv file. Map your date column and any number of measures. Charts generated instantly.",
              },
              {
                icon: "📋",
                title: "Suite of Measures",
                desc: "Import multiple KPIs from one file. Switch between measures with a single click using the tabbed interface.",
              },
              {
                icon: "🏛️",
                title: "Built for Any Sector",
                desc: "Designed for operational managers, service teams, and anyone who needs evidence-based improvement tools.",
              },
            ].map((f) => (
              <div
                key={f.title}
                className="p-6 rounded-xl border border-white/6 bg-white/2 hover:border-white/12 hover:bg-white/4 transition-all"
              >
                <div className="text-3xl mb-3">{f.icon}</div>
                <h3 className="font-semibold text-white mb-2">{f.title}</h3>
                <p className="text-sm text-gray-400 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="px-6 py-20 text-center border-t border-white/5">
          <h2 className="text-2xl sm:text-3xl font-bold mb-4">
            Ready to see your data differently?
          </h2>
          <p className="text-gray-500 mb-8 max-w-lg mx-auto">
            Upload your data or explore the demo dataset. No account needed.
          </p>
          <Link
            href="/app"
            className="inline-flex px-8 py-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 transition-colors font-semibold text-lg shadow-xl shadow-indigo-900/30"
          >
            Get started free →
          </Link>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/5 px-6 py-6 flex flex-col sm:flex-row items-center justify-between gap-2">
        <span className="text-sm font-semibold tracking-tight text-white">Contrl</span>
        <span className="text-xs text-gray-600">
          Statistical Process Control for modern public services
        </span>
      </footer>
    </div>
  );
}
