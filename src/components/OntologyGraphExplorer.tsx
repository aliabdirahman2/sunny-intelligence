"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import {
  Background,
  Controls,
  MarkerType,
  MiniMap,
  ReactFlow,
  type Edge,
  type Node,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { Filter, GitBranch, Sparkles, X } from "lucide-react";
import type { OntologyEdge, OntologyEntityType, OntologyNode } from "@/lib/ontology/service";

const TYPE_STYLE: Record<
  OntologyEntityType,
  { bg: string; border: string; badge: string; row: number }
> = {
  Organization: { bg: "#e7f0ec", border: "#3d6b52", badge: "#2f5741", row: 0 },
  Team: { bg: "#ebf1f7", border: "#3b6491", badge: "#2b4d73", row: 1 },
  Project: { bg: "#fcf3e1", border: "#b87b20", badge: "#8a570d", row: 2 },
  Employee: { bg: "#f3f1ec", border: "#6d746f", badge: "#454c47", row: 2 },
  Responsibility: { bg: "#fff8eb", border: "#c89038", badge: "#8a570d", row: 3 },
  EnergyProfile: { bg: "#f4eef8", border: "#825b96", badge: "#614173", row: 3 },
  EnergyCheckIn: { bg: "#eef6f5", border: "#3f8f8a", badge: "#2d6b67", row: 3 },
  OrganizationalEvent: { bg: "#fbeee9", border: "#b95835", badge: "#8c3d20", row: 4 },
  WorkplaceObservation: { bg: "#eef3f8", border: "#4a74a8", badge: "#31547b", row: 4 },
  TeamVitalSnapshot: { bg: "#eaf2ed", border: "#3d6b52", badge: "#2f5741", row: 5 },
  Insight: { bg: "#f0ebf8", border: "#6a4c9c", badge: "#4d3575", row: 6 },
  Intervention: { bg: "#e8f3ee", border: "#2f6b4f", badge: "#23523c", row: 6 },
  InterventionExecution: { bg: "#e4f0ea", border: "#2f6b4f", badge: "#23523c", row: 7 },
  InterventionOutcome: { bg: "#dff0e6", border: "#256346", badge: "#1b4b34", row: 8 },
};

const ALL_TYPES: OntologyEntityType[] = [
  "Organization",
  "Team",
  "Project",
  "Responsibility",
  "Employee",
  "EnergyProfile",
  "OrganizationalEvent",
  "WorkplaceObservation",
  "TeamVitalSnapshot",
  "Intervention",
  "InterventionExecution",
  "InterventionOutcome",
];

export function OntologyGraphExplorer(props: {
  nodes: OntologyNode[];
  edges: OntologyEdge[];
  reasoningPathIds: string[];
  teams: { id: string; name: string }[];
  initialTeam: string;
  initialHighlightReasoning: boolean;
}) {
  const [teamFilter, setTeamFilter] = useState<string>(props.initialTeam || "t-outreach");
  const [maxWeekFilter, setMaxWeekFilter] = useState<number>(14);
  const [enabledTypes, setEnabledTypes] = useState<Set<OntologyEntityType>>(
    () => new Set(ALL_TYPES),
  );
  const [showReasoningPath, setShowReasoningPath] = useState<boolean>(props.initialHighlightReasoning);
  const [selectedId, setSelectedId] = useState<string>("t-outreach");

  const reasoningSet = useMemo(() => new Set(props.reasoningPathIds), [props.reasoningPathIds]);

  const filteredNodes = useMemo(() => {
    return props.nodes.filter((n) => {
      if (!enabledTypes.has(n.entityType)) return false;
      if (n.weekIndex && n.weekIndex > maxWeekFilter) return false;
      if (teamFilter !== "ALL" && n.entityType !== "Organization") {
        if (n.teamId && n.teamId !== teamFilter) return false;
      }
      return true;
    });
  }, [props.nodes, enabledTypes, maxWeekFilter, teamFilter]);

  const visibleIds = useMemo(() => new Set(filteredNodes.map((n) => n.id)), [filteredNodes]);

  const filteredEdges = useMemo(
    () => props.edges.filter((e) => visibleIds.has(e.source) && visibleIds.has(e.target)),
    [props.edges, visibleIds],
  );

  // Deterministic layered layout by ontology entity tier
  const rfNodes: Node[] = useMemo(() => {
    const byRow = new Map<number, OntologyNode[]>();
    for (const n of filteredNodes) {
      const r = TYPE_STYLE[n.entityType]?.row ?? 4;
      const arr = byRow.get(r) || [];
      arr.push(n);
      byRow.set(r, arr);
    }

    const out: Node[] = [];
    for (const [row, list] of byRow.entries()) {
      const width = 235;
      const totalWidth = list.length * width;
      list.forEach((n, idx) => {
        const st = TYPE_STYLE[n.entityType];
        const inPath = reasoningSet.has(n.id);
        const isSelected = n.id === selectedId;
        const dimmed = showReasoningPath && !inPath;
        out.push({
          id: n.id,
          position: {
            x: idx * width - totalWidth / 2 + 520,
            y: row * 125 + 20,
          },
          data: {
            label: (
              <div className="text-left">
                <div className="flex items-center justify-between gap-1">
                  <span
                    className="rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white"
                    style={{ backgroundColor: st.badge }}
                  >
                    {n.entityType}
                  </span>
                  {inPath && showReasoningPath && (
                    <span className="rounded bg-[#3d6b52] px-1.5 py-0.5 text-[9px] font-semibold text-white">
                      AI Path
                    </span>
                  )}
                </div>
                <div className="mt-1 truncate text-xs font-semibold text-[#1f2421]">{n.label}</div>
                <div className="truncate text-[10px] text-[#5a625d]">{n.subtitle}</div>
              </div>
            ),
          },
          style: {
            width: 215,
            borderRadius: 10,
            padding: 8,
            backgroundColor: st.bg,
            border: isSelected
              ? "2.5px solid #1f2421"
              : inPath && showReasoningPath
                ? "2.5px solid #2f5741"
                : `1.5px solid ${st.border}`,
            opacity: dimmed ? 0.3 : 1,
            boxShadow: isSelected || (inPath && showReasoningPath) ? "0 4px 14px rgba(47,87,65,0.22)" : "none",
          },
        });
      });
    }
    return out;
  }, [filteredNodes, reasoningSet, selectedId, showReasoningPath]);

  const rfEdges: Edge[] = useMemo(() => {
    return filteredEdges.map((e) => {
      const inPath = reasoningSet.has(e.source) && reasoningSet.has(e.target);
      const highlight = showReasoningPath && inPath;
      return {
        id: e.id,
        source: e.source,
        target: e.target,
        label: e.relationship,
        animated: highlight,
        labelStyle: { fontSize: 9, fill: highlight ? "#2f5741" : "#5a625d", fontWeight: highlight ? 700 : 500 },
        style: {
          stroke: highlight ? "#2f5741" : "#9aa39d",
          strokeWidth: highlight ? 2.4 : 1.2,
          opacity: showReasoningPath && !inPath ? 0.2 : 0.9,
        },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: highlight ? "#2f5741" : "#9aa39d",
        },
      };
    });
  }, [filteredEdges, reasoningSet, showReasoningPath]);

  const selectedNode = useMemo(
    () => props.nodes.find((n) => n.id === selectedId) || filteredNodes[0] || null,
    [props.nodes, filteredNodes, selectedId],
  );

  const selectedEdges = useMemo(() => {
    if (!selectedNode) return [];
    return props.edges.filter((e) => e.source === selectedNode.id || e.target === selectedNode.id);
  }, [props.edges, selectedNode]);

  const toggleType = (t: OntologyEntityType) => {
    const next = new Set(enabledTypes);
    if (next.has(t)) next.delete(t);
    else next.add(t);
    setEnabledTypes(next);
  };

  return (
    <div className="space-y-4">
      {/* Controls bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#dfd9cc] bg-white p-4 shadow-xs">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs">
            <Filter className="h-3.5 w-3.5 text-[#3d6b52]" />
            <span className="font-medium text-[#1f2421]">Scope:</span>
            <select
              value={teamFilter}
              onChange={(e) => setTeamFilter(e.target.value)}
              className="rounded-md border border-[#dfd9cc] bg-[#faf8f3] px-2.5 py-1 text-xs font-medium"
            >
              <option value="t-outreach">Community Outreach Team (Main Demo)</option>
              <option value="ALL">All 8 Teams (Full Organization)</option>
              {props.teams
                .filter((t) => t.id !== "t-outreach")
                .map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
            </select>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="font-medium text-[#1f2421]">Up to Week:</span>
            <input
              type="range"
              min={5}
              max={14}
              value={maxWeekFilter}
              onChange={(e) => setMaxWeekFilter(Number(e.target.value))}
              className="accent-[#3d6b52]"
            />
            <span className="w-12 font-semibold text-[#3d6b52]">Wk {maxWeekFilter}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowReasoningPath((v) => !v)}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition ${
              showReasoningPath
                ? "bg-[#3d6b52] text-white shadow-xs"
                : "border border-[#dfd9cc] bg-[#faf8f3] text-[#1f2421] hover:bg-[#ece7dc]"
            }`}
          >
            <GitBranch className="h-3.5 w-3.5" />
            {showReasoningPath ? "Showing AI Reasoning Path (Active)" : "Highlight AI Reasoning Path"}
          </button>
        </div>
      </div>

      {/* Entity-type filter chips */}
      <div className="flex flex-wrap items-center gap-1.5 rounded-xl border border-[#dfd9cc] bg-white px-4 py-2.5 text-xs">
        <span className="mr-1 font-medium text-[#5a625d]">Ontology Types:</span>
        {ALL_TYPES.map((t) => {
          const active = enabledTypes.has(t);
          return (
            <button
              key={t}
              type="button"
              onClick={() => toggleType(t)}
              className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium transition ${
                active
                  ? "bg-[#3d6b52] text-white"
                  : "bg-[#f2efe8] text-[#5a625d] hover:bg-[#e6e1d5]"
              }`}
            >
              {t}
            </button>
          );
        })}
      </div>

      {/* Canvas + Contextual Side Panel */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <div className="h-[680px] overflow-hidden rounded-xl border border-[#dfd9cc] bg-white shadow-xs lg:col-span-8">
          <ReactFlow
            nodes={rfNodes}
            edges={rfEdges}
            fitView
            onNodeClick={(_, node) => setSelectedId(node.id)}
            proOptions={{ hideAttribution: true }}
          >
            <Background color="#e5e0d4" gap={18} />
            <Controls />
            <MiniMap
              nodeColor={(n) => {
                const found = props.nodes.find((x) => x.id === n.id);
                return found ? TYPE_STYLE[found.entityType].border : "#3d6b52";
              }}
            />
          </ReactFlow>
        </div>

        {/* Selected Node Details & Relationships Panel */}
        <div className="flex h-[680px] flex-col justify-between overflow-y-auto rounded-xl border border-[#dfd9cc] bg-white p-5 shadow-xs lg:col-span-4">
          {selectedNode ? (
            <div className="space-y-4">
              <div className="flex items-start justify-between gap-2 border-b border-[#eee9dd] pb-3">
                <div>
                  <span
                    className="rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white"
                    style={{ backgroundColor: TYPE_STYLE[selectedNode.entityType].badge }}
                  >
                    {selectedNode.entityType}
                  </span>
                  <h2 className="mt-1.5 text-base font-semibold text-[#1f2421]">{selectedNode.label}</h2>
                  <p className="text-xs text-[#5a625d]">{selectedNode.subtitle}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedId("t-outreach")}
                  className="rounded p-1 text-[#5a625d] hover:bg-[#f2efe8]"
                  title="Reset selection"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Source provenance */}
              <div className="rounded-lg bg-[#faf8f3] p-3 text-xs">
                <div className="font-semibold text-[#1f2421]">Provenance &amp; Governance</div>
                <div className="mt-1 text-[#4b524e]">
                  <div>Source: <code>{selectedNode.source}</code></div>
                  {selectedNode.timestamp && <div>Timestamp: {selectedNode.timestamp}</div>}
                  <div>Dataset: Synthetic (Northstar Community Services)</div>
                </div>
              </div>

              {/* Properties */}
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-[#5a625d]">Properties</h3>
                <dl className="mt-2 space-y-1.5 text-xs">
                  {Object.entries(selectedNode.properties).map(([k, v]) => (
                    <div key={k} className="flex justify-between gap-2 border-b border-[#f3efe6] pb-1">
                      <dt className="font-medium text-[#5a625d]">{k}</dt>
                      <dd className="max-w-[210px] text-right font-medium text-[#1f2421]">
                        {Array.isArray(v) ? v.join("; ") : typeof v === "object" && v !== null ? JSON.stringify(v) : String(v ?? "—")}
                      </dd>
                    </div>
                  ))}
                </dl>
              </div>

              {/* Typed Semantic Relationships */}
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-[#5a625d]">
                  Connected Ontology Relationships ({selectedEdges.length})
                </h3>
                <div className="mt-2 max-h-56 space-y-1.5 overflow-y-auto pr-1">
                  {selectedEdges.map((e) => {
                    const otherId = e.source === selectedNode.id ? e.target : e.source;
                    const other = props.nodes.find((n) => n.id === otherId);
                    return (
                      <button
                        key={e.id}
                        type="button"
                        onClick={() => other && setSelectedId(other.id)}
                        className="w-full rounded-lg border border-[#ece7dc] bg-[#faf8f3] p-2 text-left text-xs transition hover:border-[#3d6b52]"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-[10px] font-semibold text-[#3d6b52]">{e.relationship}</span>
                          <span className="text-[10px] text-[#5a625d]">{other?.entityType}</span>
                        </div>
                        <div className="font-medium text-[#1f2421]">{other?.label ?? otherId}</div>
                        <div className="text-[10px] text-[#5a625d]">{e.meaning}</div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : null}

          {/* Action buttons */}
          <div className="mt-4 space-y-2 border-t border-[#eee9dd] pt-3">
            <Link
              href={`/insights?q=${encodeURIComponent(
                `Explain how ${selectedNode?.label ?? "Community Outreach Team"} connects to recent Team Vital changes.`,
              )}`}
              className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-[#3d6b52] px-3 py-2 text-xs font-medium text-white hover:bg-[#315843]"
            >
              <Sparkles className="h-3.5 w-3.5" />
              Ask AI About Selected Entity
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
