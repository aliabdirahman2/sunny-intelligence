import { CheckCircle2, Database, ShieldCheck, XCircle } from "lucide-react";
import { getDemoContext } from "@/lib/analytics";
import { prisma } from "@/lib/db";
import { fmtDate, parseJSON } from "@/lib/domain";

export default async function DataSourcesPage() {
  const ctx = await getDemoContext();
  const sources = await prisma.dataSource.findMany({ orderBy: { id: "asc" } });
  const observations = await prisma.workplaceObservation.findMany({
    where: { deletedAt: null },
    orderBy: { observedAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-[#dfd9cc] bg-white p-5 shadow-xs">
        <div className="text-xs font-semibold uppercase tracking-wider text-[#3d6b52]">
          Simulated Connector &amp; Normalization Layer · Data Governance
        </div>
        <h1 className="mt-1 text-xl font-semibold text-[#1f2421]">
          Authorized Data Sources, Explicit Exclusions &amp; Retention Policies
        </h1>
        <p className="mt-1 max-w-3xl text-xs text-[#4b524e]">
          All connectors in this prototype are <strong>simulated</strong> and emit normalized synthetic events. No OAuth
          tokens, employee accounts, or private message bodies are ever requested or ingested.
        </p>
      </section>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {sources.map((s) => {
          const scopes = parseJSON<string[]>(s.scopes, []);
          const excluded = parseJSON<string[]>(s.excluded, []);
          return (
            <div key={s.id} className="rounded-xl border border-[#dfd9cc] bg-white p-5 shadow-xs">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Database className="h-4 w-4 text-[#3d6b52]" />
                  <div>
                    <h2 className="text-sm font-semibold text-[#1f2421]">{s.name}</h2>
                    <div className="text-[11px] text-[#5a625d]">
                      Connector ID: <code>{s.id}</code> · Records: {s.recordsIngested}
                    </div>
                  </div>
                </div>
                <span className="rounded bg-[#eaf2ed] px-2 py-0.5 text-[10px] font-semibold text-[#2f5741]">
                  {s.status}
                </span>
              </div>

              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="rounded-lg bg-[#faf8f3] p-3 text-xs">
                  <div className="flex items-center gap-1 font-semibold text-[#2f5741]">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Authorized Metadata Scopes
                  </div>
                  <ul className="mt-1.5 space-y-1 text-[11px] text-[#3f4642]">
                    {scopes.map((sc) => (
                      <li key={sc}>• {sc}</li>
                    ))}
                  </ul>
                </div>

                <div className="rounded-lg bg-[#fdf6f3] p-3 text-xs">
                  <div className="flex items-center gap-1 font-semibold text-[#8c3d20]">
                    <XCircle className="h-3.5 w-3.5" />
                    Explicitly Excluded (Never Ingested)
                  </div>
                  <ul className="mt-1.5 space-y-1 text-[11px] text-[#4b524e]">
                    {excluded.map((ex) => (
                      <li key={ex}>• {ex}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Observation Governance Table */}
      <section className="rounded-xl border border-[#dfd9cc] bg-white p-5 shadow-xs">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-[#3d6b52]" />
          <h2 className="text-base font-semibold text-[#1f2421]">
            Normalized WorkplaceObservations — Source, Purpose, Permission Scope &amp; Retention
          </h2>
        </div>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-[#e6e2d8] text-[11px] uppercase tracking-wider text-[#5a625d]">
                <th className="py-2 pr-3">Observed</th>
                <th className="px-3 py-2">Source</th>
                <th className="px-3 py-2">Summary</th>
                <th className="px-3 py-2">Permission Scope</th>
                <th className="px-3 py-2">Purpose</th>
                <th className="py-2 pl-3">Retention Policy</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f0ece2]">
              {observations.map((ob) => (
                <tr key={ob.id}>
                  <td className="py-2.5 pr-3 whitespace-nowrap text-[#5a625d]">
                    Wk {ob.weekIndex} · {fmtDate(ob.observedAt, { month: "short", day: "numeric" })}
                  </td>
                  <td className="px-3 py-2.5 font-mono text-[11px] text-[#3b6491]">{ob.connectorId}</td>
                  <td className="px-3 py-2.5 font-medium text-[#1f2421]">{ob.summary}</td>
                  <td className="px-3 py-2.5">
                    <span className="rounded bg-[#eaf2ed] px-2 py-0.5 text-[10px] font-semibold text-[#2f5741]">
                      {ob.permissionScope}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-[#4b524e]">{ob.purpose}</td>
                  <td className="py-2.5 pl-3 text-[#5a625d]">{ob.retentionPolicy}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
