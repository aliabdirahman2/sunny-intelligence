import { getDemoContext } from "@/lib/analytics";
import { runEmployeeCoach } from "@/lib/ai/gemini";
import { EmployeeCoachPanel } from "@/components/EmployeeCoachPanel";

export default async function EmployeeCoachPage() {
  const ctx = await getDemoContext();
  const initial = await runEmployeeCoach({
    question: "How should I prepare for my 1:1 with Dana to clarify my outreach tasks?",
    viewer: ctx.viewer,
    currentDate: ctx.currentDate,
  });

  return (
    <EmployeeCoachPanel
      viewerName={ctx.viewer.name}
      viewerRole={ctx.viewer.role}
      initialAnswer={initial.answer}
      initialMode={initial.mode}
      contextUsed={initial.contextUsed}
    />
  );
}

