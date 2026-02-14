import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Mic, Shield, BarChart3, Zap } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col">
      {/* Header */}
      <header className="flex h-16 items-center justify-between border-b border-border/50 px-6 lg:px-8">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
            <span className="text-sm font-bold text-primary-foreground">L</span>
          </div>
          <span className="text-lg font-semibold tracking-tight">LUNA</span>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/sign-in">
            <Button variant="ghost" size="sm">
              Sign In
            </Button>
          </Link>
          <Link href="/sign-up">
            <Button size="sm">Get Started</Button>
          </Link>
        </div>
      </header>

      {/* Hero */}
      <main className="flex flex-1 flex-col items-center justify-center px-6 text-center">
        <div className="mx-auto max-w-3xl space-y-6">
          <h1 className="text-5xl font-bold tracking-tight sm:text-6xl">
            Your company knowledge,{" "}
            <span className="bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              one voice away
            </span>
          </h1>
          <p className="mx-auto max-w-xl text-lg text-muted-foreground">
            LUNA transforms your SOPs, HR policies, and onboarding docs into an
            AI voice agent employees can talk to. Instant answers, zero
            repetition.
          </p>
          <div className="flex items-center justify-center gap-3">
            <Link href="/sign-up">
              <Button size="lg" className="h-12 px-8 text-base">
                Start Free Trial
              </Button>
            </Link>
            <Link href="/sign-in">
              <Button variant="outline" size="lg" className="h-12 px-8 text-base">
                Sign In
              </Button>
            </Link>
          </div>
        </div>

        {/* Feature Cards */}
        <div className="mx-auto mt-24 grid max-w-4xl gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {[
            {
              icon: Mic,
              title: "Voice-First",
              desc: "Natural voice conversations powered by ElevenLabs AI",
            },
            {
              icon: Shield,
              title: "Secure & Private",
              desc: "Your data stays yours. Full org isolation and encryption",
            },
            {
              icon: BarChart3,
              title: "Smart Analytics",
              desc: "See what employees ask and find documentation gaps",
            },
            {
              icon: Zap,
              title: "Instant Setup",
              desc: "Upload docs and your agent is ready in minutes",
            },
          ].map((feature) => (
            <div
              key={feature.title}
              className="rounded-xl border border-border/50 bg-card p-6 text-left transition-all hover:border-primary/30 hover:shadow-sm"
            >
              <feature.icon className="h-5 w-5 text-primary" />
              <h3 className="mt-3 font-semibold">{feature.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {feature.desc}
              </p>
            </div>
          ))}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border/50 py-6 text-center text-sm text-muted-foreground">
        <p>LUNA - Learn, Understand, Navigate, Apply</p>
      </footer>
    </div>
  );
}
