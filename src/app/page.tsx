import { NiftyDashboard } from "@/components/NiftyDashboard";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-white to-sky-100/40 px-4 py-12 dark:from-zinc-950 dark:via-zinc-900 dark:to-slate-900">
      <div className="mx-auto max-w-5xl space-y-10">
        <header className="space-y-2">
          <p className="text-sm uppercase tracking-[0.3em] text-sky-600 dark:text-sky-400">
            Market Intelligence
          </p>
          <h1 className="text-4xl font-semibold text-zinc-900 dark:text-zinc-100">
            Nifty 50 Outlook &amp; Tactical Signals
          </h1>
          <p className="max-w-2xl text-base text-zinc-600 dark:text-zinc-300">
            Real-time technical insight powered by price structure, momentum, and
            volatility signals to guide the next move in India&apos;s benchmark index.
          </p>
        </header>
        <NiftyDashboard />
      </div>
    </div>
  );
}
