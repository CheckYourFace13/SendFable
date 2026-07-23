/** Short answer block for AEO / featured-snippet style leads on inner SEO pages. */
export function AnswerLead({
  question,
  answer,
}: {
  question: string;
  answer: string;
}) {
  return (
    <aside className="mt-8 rounded-2xl border border-teal/25 bg-teal/5 px-5 py-4 sm:px-6">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-teal">{question}</p>
      <p className="mt-2 text-base leading-relaxed text-ink sm:text-lg">{answer}</p>
    </aside>
  );
}
