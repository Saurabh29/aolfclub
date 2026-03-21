import { For } from "solid-js";
import { PublicTopBar } from "~/components/shell/PublicTopBar";

const PROGRAMS = [
  {
    icon: "🧘",
    title: "The Happiness Program",
    desc: "Learn Sudarshan Kriya — a powerful rhythmic breathing technique that can help eliminate stress and bring mind and body into harmony.",
  },
  {
    icon: "🌬️",
    title: "Pranayama & Meditation",
    desc: "Deepen your practice with ancient breathing techniques and guided meditation for clarity, calm, and inner balance.",
  },
  {
    icon: "📚",
    title: "Teacher Training",
    desc: "Become a certified Art of Living instructor and share the gift of breath, yoga, and meditation with others.",
  },
  {
    icon: "🌿",
    title: "Ayurveda & Wellness",
    desc: "Explore holistic wellness through Ayurvedic principles — diet, lifestyle, and daily routines for vibrant health.",
  },
];

const TESTIMONIALS = [
  {
    quote: "The Sudarshan Kriya transformed my relationship with anxiety. I feel lighter every single day.",
    name: "Priya S., Bengaluru",
  },
  {
    quote: "Teacher Training was the most profound experience of my life. I came to learn, I left to serve.",
    name: "Arjun M., Delhi",
  },
  {
    quote: "I was sceptical, but after one weekend program I felt a peace I had been searching for years.",
    name: "Nadia K., Mumbai",
  },
];

export default function LandingPage() {
  return (
    <div class="min-h-svh bg-background text-foreground">
      <PublicTopBar />

      {/* ── Hero ── */}
      <section class="px-6 py-16 text-center max-w-2xl mx-auto">
        <div class="text-5xl mb-4">🌿</div>
        <h1 class="text-3xl sm:text-4xl font-bold leading-tight mb-4">
          Breathe. Connect. Transform.
        </h1>
        <p class="text-muted-foreground text-base sm:text-lg leading-relaxed mb-8">
          The Art of Living Foundation offers evidence-based programs in
          breathwork, yoga, and meditation — reaching millions across 180
          countries.
        </p>
        <a
          href="/locations"
          class="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-full font-medium text-sm hover:opacity-90 transition-opacity"
        >
          📍 Find a centre near you
        </a>
      </section>

      {/* ── Programs ── */}
      <section class="px-4 py-12 bg-muted/40">
        <div class="max-w-3xl mx-auto">
          <h2 class="text-xl font-semibold text-center mb-8">Our Programs</h2>
          <div class="grid gap-4 sm:grid-cols-2">
            <For each={PROGRAMS}>
              {(p) => (
                <div class="bg-background rounded-xl p-5 border border-border">
                  <div class="text-3xl mb-3">{p.icon}</div>
                  <h3 class="font-semibold text-base mb-1">{p.title}</h3>
                  <p class="text-sm text-muted-foreground leading-relaxed">{p.desc}</p>
                </div>
              )}
            </For>
          </div>
        </div>
      </section>

      {/* ── Stats ── */}
      <section class="px-4 py-12">
        <div class="max-w-3xl mx-auto grid grid-cols-3 gap-6 text-center">
          <div>
            <div class="text-3xl font-bold text-primary">180+</div>
            <div class="text-xs text-muted-foreground mt-1">Countries</div>
          </div>
          <div>
            <div class="text-3xl font-bold text-primary">800M+</div>
            <div class="text-xs text-muted-foreground mt-1">Lives Touched</div>
          </div>
          <div>
            <div class="text-3xl font-bold text-primary">45+</div>
            <div class="text-xs text-muted-foreground mt-1">Years of Service</div>
          </div>
        </div>
      </section>

      {/* ── Testimonials ── */}
      <section class="px-4 py-12 bg-muted/40">
        <div class="max-w-3xl mx-auto">
          <h2 class="text-xl font-semibold text-center mb-8">What People Say</h2>
          <div class="grid gap-4 sm:grid-cols-3">
            <For each={TESTIMONIALS}>
              {(t) => (
                <blockquote class="bg-background rounded-xl p-5 border border-border">
                  <p class="text-sm text-muted-foreground leading-relaxed mb-3">
                    "{t.quote}"
                  </p>
                  <footer class="text-xs font-medium">— {t.name}</footer>
                </blockquote>
              )}
            </For>
          </div>
        </div>
      </section>

      {/* ── Footer CTA ── */}
      <section class="px-6 py-16 text-center max-w-xl mx-auto">
        <h2 class="text-xl font-semibold mb-3">Ready to begin your journey?</h2>
        <p class="text-muted-foreground text-sm mb-6">
          Sign in to connect with your local centre, join volunteer initiatives,
          and grow with your community.
        </p>
        <a
          href="/locations"
          class="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-full font-medium text-sm hover:opacity-90 transition-opacity"
        >
          📍 Explore centres
        </a>
      </section>

      {/* ── Footer ── */}
      <footer class="border-t border-border px-6 py-6 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} Art of Living Foundation. All rights reserved.
      </footer>
    </div>
  );
}
