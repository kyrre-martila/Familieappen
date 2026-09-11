"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Check, Pencil } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AppShell } from "../../../components/AppShell";
import { ProtectedFamilyRoute, useFamilyAccess } from "../../../components/ProtectedFamilyRoute";
import { availablePlanActions, planProgressLabel, recurrenceLabel } from "../../../features/health-plan/model";
import { getHealthPlan, healthPlanCommand, updateHealthPlan, type HealthPlan, type HealthPlanAction } from "../../../lib/api";

const STATUS = { DRAFT: "Utkast", ACTIVE: "Aktiv", PAUSED: "Pauset", COMPLETED: "Avsluttet", ARCHIVED: "Arkivert" } as const;
type Command = Parameters<typeof healthPlanCommand>[2];

function PlanDetail() {
  const { id } = useParams<{ id: string }>();
  const access = useFamilyAccess(); const familyId = access.status === "approved" ? access.familyContext.activeFamilyId : null;
  const [plan, setPlan] = useState<HealthPlan | null>(null); const [loading, setLoading] = useState(true); const [error, setError] = useState(""); const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState<{ command: Command; title: string; body: string } | null>(null); const [edit, setEdit] = useState<"metadata" | HealthPlanAction | null>(null);
  const load = useCallback(async () => { if (!familyId || !id) return; setLoading(true); setError(""); try { setPlan(await getHealthPlan(familyId, id)); } catch (caught) { setPlan(null); setError(caught instanceof Error ? caught.message : "Kunne ikke hente helseplanen."); } finally { setLoading(false); } }, [familyId, id]);
  useEffect(() => { void load(); }, [load]);
  async function run(command: Command) { if (!familyId) return; setBusy(true); setError(""); try { setPlan(await healthPlanCommand(familyId, id, command)); setConfirm(null); } catch (caught) { setError(caught instanceof Error ? caught.message : "Planen ble endret et annet sted. Last inn på nytt og prøv igjen."); await load(); } finally { setBusy(false); } }
  const actions = useMemo(() => plan ? availablePlanActions(plan) : null, [plan]);
  const currentLevel = plan?.levels?.find(level => level.id === plan.activeLevelId); const up = plan?.levels?.find(level => level.levelIndex === (currentLevel?.levelIndex ?? -1) + 1); const down = plan?.levels?.find(level => level.levelIndex === (currentLevel?.levelIndex ?? 0) - 1);

  return <AppShell title="Helseplan"><main className="health-detail"><Link className="health-back" href="/health-plans"><ArrowLeft size={18}/> Helseplan · Planer</Link>
    {loading && <div className="health-empty" aria-live="polite">Laster helseplan …</div>}
    {!loading && error && !plan && <section className="health-empty"><h2>Planen ble ikke funnet</h2><p>{error}</p><button onClick={() => void load()}>Prøv igjen</button></section>}
    {plan && actions && <>
      <header className="health-detail-header"><div><span className={`health-status-pill health-status-pill--${plan.status.toLowerCase()}`}>{STATUS[plan.status]}</span><h1>{plan.name}</h1><p>{plan.familyMember.displayName}</p>{plan.description && <p className="health-description">{plan.description}</p>}<strong>{plan.status === "COMPLETED" ? "Planen er avsluttet" : plan.status === "ARCHIVED" ? "Planen er arkivert" : plan.status === "DRAFT" ? "Ikke startet" : planProgressLabel(plan)}</strong></div>{plan.status !== "ARCHIVED" && <button className="health-secondary" onClick={() => setEdit("metadata")}><Pencil size={16}/> Rediger</button>}</header>
      {error && <p className="health-error" role="alert">{error}</p>}
      <section className="health-lifecycle" aria-label="Planhandlinger">
        {actions.start && <button className="health-primary" disabled={busy} onClick={() => void run("start")}>Start</button>}
        {actions.pause && <button className="health-primary" onClick={() => setConfirm({ command: "pause", title: "Pause denne helseplanen?", body: "Planen settes på pause. Varigheten fortsetter når planen startes igjen." })}>Pause</button>}
        {actions.resume && <button className="health-primary" disabled={busy} onClick={() => void run("resume")}>Fortsett</button>}
        {actions.levelUp && up && <button onClick={() => setConfirm({ command: "level-up", title: `Trapp opp til Trinn ${up.levelIndex}?`, body: `Planen starter på Del 1 i Trinn ${up.levelIndex}.` })}>Trapp opp</button>}
        {actions.levelDown && down && <button onClick={() => setConfirm({ command: "level-down", title: `Trapp ned til ${down.levelIndex === 0 ? "Basisplan" : `Trinn ${down.levelIndex}`}?`, body: `Planen starter på Del 1 i ${down.levelIndex === 0 ? "Basisplanen" : `Trinn ${down.levelIndex}`}.` })}>Trapp ned</button>}
        {actions.archive && <button disabled={busy} onClick={() => setConfirm({ command: "archive", title: "Arkiver denne helseplanen?", body: "Planen blir liggende i arkivet og kan fortsatt leses." })}>Arkiver</button>}
        {actions.complete && <button className="health-danger" onClick={() => setConfirm({ command: "complete", title: "Avslutt denne helseplanen?", body: "Planen blir avsluttet og nye hendelser vil ikke bli opprettet. Dette kan ikke angres i denne versjonen." })}>Avslutt plan</button>}
      </section>
      <section aria-labelledby="structure-heading"><h2 id="structure-heading">Planstruktur</h2><div className="health-levels">{plan.levels?.map(level => { const levelCurrent = ["ACTIVE", "PAUSED"].includes(plan.status) && level.id === plan.activeLevelId; return <article className={`health-level ${levelCurrent ? "health-level--active" : ""}`} key={level.id}><header><h3>{level.levelIndex === 0 ? "Basisplan" : `Trinn ${level.levelIndex}`}</h3>{levelCurrent && <span><Check size={15}/> Aktivt trinn</span>}</header>{level.name && <p>{level.name}</p>}<div className="health-detail-steps">{level.steps?.map(step => { const current = levelCurrent && step.id === plan.activeStepId; return <section className={`health-detail-step ${current ? "health-detail-step--active" : ""}`} key={step.id}><header><h4>Del {step.stepOrder + 1}{step.name ? ` · ${step.name}` : ""}</h4>{current && <span>Nå · Aktiv del</span>}</header><p><strong>Varighet:</strong> {step.durationDays ? `${step.durationDays} ${step.durationDays === 1 ? "dag" : "dager"}` : "Ingen fast varighet"}</p>{step.schedules?.map(schedule => <div className="health-detail-schedule" key={schedule.id}><div><strong>Tidspunkt:</strong> {displayTime(schedule.localTime)}</div><div><strong>Gjentakelse:</strong> {recurrenceLabel(schedule)}</div><div className="health-detail-actions"><strong>Hendelser</strong>{schedule.actions.map(action => <div key={action.id}><div><b>{action.title}</b>{action.instruction && <small>{action.instruction}</small>}</div>{plan.status !== "ARCHIVED" && <button aria-label={`Rediger hendelse ${action.title}`} onClick={() => setEdit(action)}><Pencil size={15}/> Rediger hendelse</button>}</div>)}</div></div>)}</section>; })}</div></article>; })}</div></section>
    </>}
    {confirm && <ConfirmDialog {...confirm} busy={busy} onCancel={() => setConfirm(null)} onConfirm={() => void run(confirm.command)}/>} 
    {edit && plan && familyId && <EditDialog plan={plan} action={edit === "metadata" ? null : edit} busy={busy} onCancel={() => setEdit(null)} onSave={async input => { setBusy(true); setError(""); try { setPlan(await updateHealthPlan(familyId, plan.id, input)); setEdit(null); } catch (caught) { setError(caught instanceof Error ? caught.message : "Endringen kunne ikke lagres."); } finally { setBusy(false); } }}/>} 
  </main></AppShell>;
}

function displayTime(value: string) { const match = value.match(/T(\d{2}:\d{2})/); return match?.[1] ?? value.slice(0, 5); }
function ConfirmDialog({ title, body, busy, onCancel, onConfirm }: { command: Command; title: string; body: string; busy: boolean; onCancel: () => void; onConfirm: () => void }) { return <div className="health-modal-backdrop"><div className="health-confirm" role="alertdialog" aria-modal="true" aria-labelledby="confirm-title" aria-describedby="confirm-body"><h2 id="confirm-title">{title}</h2><p id="confirm-body">{body}</p><footer><button autoFocus onClick={onCancel}>Avbryt</button><button className="health-primary" disabled={busy} onClick={onConfirm}>Bekreft</button></footer></div></div>; }
function EditDialog({ plan, action, busy, onCancel, onSave }: { plan: HealthPlan; action: HealthPlanAction | null; busy: boolean; onCancel: () => void; onSave: (input: { name?: string; description?: string | null; action?: { id: string; title: string; instruction: string | null } }) => Promise<void> }) { const [name, setName] = useState(action?.title ?? plan.name); const [description, setDescription] = useState(action?.instruction ?? plan.description ?? ""); return <div className="health-modal-backdrop"><form className="health-confirm" role="dialog" aria-modal="true" aria-labelledby="edit-title" onSubmit={e => { e.preventDefault(); void onSave(action ? { action: { id: action.id, title: name, instruction: description.trim() || null } } : { name, description: description.trim() || null }); }}><h2 id="edit-title">{action ? "Rediger hendelse" : "Rediger helseplan"}</h2><label>{action ? "Tittel" : "Plannavn"}<input autoFocus required value={name} onChange={e => setName(e.target.value)}/></label><label>{action ? "Instruksjon" : "Beskrivelse"}<textarea value={description} onChange={e => setDescription(e.target.value)}/></label><footer><button type="button" onClick={onCancel}>Avbryt</button><button className="health-primary" disabled={busy || !name.trim()} type="submit">Lagre</button></footer></form></div>; }

export default function HealthPlanDetailPage() { return <ProtectedFamilyRoute><PlanDetail/></ProtectedFamilyRoute>; }
