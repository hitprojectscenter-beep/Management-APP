import { setRequestLocale } from "next-intl/server";

/**
 * Training center — embeds the self-contained, voice-narrated training player
 * (public/training.html) in an iframe inside the app shell. The static HTML
 * carries its own chapter list, animation, captions and Hebrew SpeechSynthesis
 * narration, so nothing here needs client state.
 */
export default async function TrainingPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  return (
    <div className="h-full min-h-[calc(100vh-3.5rem)]">
      <iframe
        src="/training.html"
        title="מרכז הדרכה — PMO++"
        className="block w-full h-full min-h-[calc(100vh-3.5rem)] border-0"
        allow="autoplay"
      />
    </div>
  );
}
