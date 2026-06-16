"use client";

import { FormEvent, useEffect, useMemo, useState, type ChangeEvent } from "react";
import { createPortal } from "react-dom";
import { ListTodo, MoreHorizontal, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LockedFeatureState } from "../../../components/PendingAccess";
import { useFamilyAccess } from "../../../components/ProtectedFamilyRoute";
import { Badge, Button, Card, EmptyState, ErrorState, LoadingState, PageContainer, SectionHeader } from "../../../components/ui";
import {
  ApiError,
  FamilyDetails,
  FamilyMember,
  FamilyWithMembership,
  Task,
  addTask,
  deleteTask,
  getFamily,
  getTasks,
  toggleTask,
  updateTask
} from "../../../lib/api";
import { chooseActiveFamily, getUserFacingApiMessage, handleMissingOrInvalidAuth } from "../../../lib/auth-family";
import { clearActiveFamilyId } from "../../../lib/session";

type OppgaverStatus = "loading" | "ready" | "pending" | "unauthorized" | "no-family" | "error";

export function OppgaverSection({ query, createRequest = 0 }: { query: string; createRequest?: number }) {
  const router = useRouter();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [familyDetails, setFamilyDetails] = useState<FamilyDetails | null>(null);
  const [families, setFamilies] = useState<FamilyWithMembership[]>([]);
  const [activeFamilyId, setActiveFamilyIdState] = useState<string | null>(null);
  const [status, setStatus] = useState<OppgaverStatus>("loading");
  const [message, setMessage] = useState("Laster oppgaver …");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [assignedFamilyMemberId, setAssignedFamilyMemberId] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [pendingTaskId, setPendingTaskId] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [openTaskMenuId, setOpenTaskMenuId] = useState<string | null>(null);
  const [isTaskSheetOpen, setIsTaskSheetOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  const familyAccess = useFamilyAccess();
  const approvedFamilyContext = familyAccess.status === "approved" ? familyAccess.familyContext : null;

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (createRequest > 0) {
      resetTaskForm();
      setIsTaskSheetOpen(true);
    }
  }, [createRequest]);

  useEffect(() => {
    if (!isTaskSheetOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previousOverflow; };
  }, [isTaskSheetOpen]);

  useEffect(() => {
    if (!approvedFamilyContext) {
      return;
    }

    setFamilies(approvedFamilyContext.families);
    setActiveFamilyIdState(approvedFamilyContext.activeFamilyId);
    void loadOppgaver(approvedFamilyContext.activeFamilyId);
  }, [approvedFamilyContext?.activeFamilyId, approvedFamilyContext]);

  const normalizedQuery = query.trim().toLocaleLowerCase("nb-NO");
  const filteredTasks = useMemo(() => {
    if (!normalizedQuery) return tasks;
    return tasks.filter((task) => [task.title, task.description ?? "", formatOppgaveMeta(task, familyDetails?.members ?? [])].some((value) => value.toLocaleLowerCase("nb-NO").includes(normalizedQuery)));
  }, [familyDetails?.members, normalizedQuery, tasks]);
  const incompleteTasks = useMemo(() => filteredTasks.filter((task) => !task.completed), [filteredTasks]);
  const completedTasks = useMemo(() => filteredTasks.filter((task) => task.completed), [filteredTasks]);
  const incompleteCount = useMemo(() => tasks.filter((task) => !task.completed).length, [tasks]);
  const hasMultipleFamilies = families.length > 1;
  const members = familyDetails?.members ?? [];

  async function loadOppgaver(familyId = activeFamilyId) {
    if (!familyId) {
      setStatus("no-family");
      setMessage("Velg familie før du åpner oppgaver.");
      return;
    }

    setStatus("loading");
    setMessage("Laster oppgaver …");

    try {
      const [details, taskItems] = await Promise.all([getFamily(familyId), getTasks(familyId)]);
      setFamilyDetails(details);
      setTasks(taskItems.sort(sortTasks));
      setStatus("ready");
      setMessage("");
    } catch (error) {
      handleLoadError(error);
    }
  }

  async function handleFamilyChange(event: ChangeEvent<HTMLSelectElement>) {
    const familyId = event.target.value;
    chooseActiveFamily(familyId);
    setActiveFamilyIdState(familyId);
    setAssignedFamilyMemberId("");
    await loadOppgaver(familyId);
  }

  async function handleAddOppgave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nextTitle = title.trim();
    const nextDescription = description.trim();

    if (!activeFamilyId || nextTitle.length === 0 || isAdding) {
      return;
    }

    setIsAdding(true);
    setMessage("");

    try {
      const task = editingTaskId
        ? await updateTask(activeFamilyId, editingTaskId, {
            title: nextTitle,
            description: nextDescription || null,
            assignedFamilyMemberId: assignedFamilyMemberId || null,
            dueDate: dueDate || null
          })
        : await addTask(activeFamilyId, {
            title: nextTitle,
            ...(nextDescription ? { description: nextDescription } : {}),
            ...(assignedFamilyMemberId ? { assignedFamilyMemberId } : {}),
            ...(dueDate ? { dueDate } : {})
          });
      if (editingTaskId) {
        setTasks((currentOppgaver) => currentOppgaver.map((currentTask) => (currentTask.id === editingTaskId ? task : currentTask)).sort(sortTasks));
        setEditingTaskId(null);
      } else {
        setTasks((currentOppgaver) => [...currentOppgaver, task].sort(sortTasks));
      }
      resetTaskForm();
      setIsTaskSheetOpen(false);
      setStatus("ready");
    } catch (error) {
      handleActionError(error, "Could not add the task. Please try again.");
    } finally {
      setIsAdding(false);
    }
  }

  async function handleToggleOppgave(taskId: string) {
    if (!activeFamilyId || pendingTaskId) {
      return;
    }

    setPendingTaskId(taskId);
    setMessage("");

    try {
      const updatedOppgave = await toggleTask(activeFamilyId, taskId);
      setTasks((currentOppgaver) => currentOppgaver.map((task) => (task.id === taskId ? updatedOppgave : task)).sort(sortTasks));
    } catch (error) {
      handleActionError(error, "Could not update the task. Please try again.");
    } finally {
      setPendingTaskId(null);
    }
  }

  async function handleSlettOppgave(taskId: string) {
    if (!activeFamilyId || pendingTaskId) {
      return;
    }

    setPendingTaskId(taskId);
    setMessage("");

    try {
      await deleteTask(activeFamilyId, taskId);
      setTasks((currentOppgaver) => currentOppgaver.filter((task) => task.id !== taskId));
    } catch (error) {
      handleActionError(error, "Could not delete the task. Please try again.");
    } finally {
      setPendingTaskId(null);
    }
  }

  function startEditingOppgave(task: Task) {
    setEditingTaskId(task.id);
    setTitle(task.title);
    setDescription(task.description ?? "");
    setAssignedFamilyMemberId(task.assignedFamilyMemberId ?? "");
    setDueDate(task.dueDate ? task.dueDate.slice(0, 10) : "");
    setOpenTaskMenuId(null);
    setIsTaskSheetOpen(true);
    setMessage("");
  }

  function resetTaskForm() {
    setTitle("");
    setDescription("");
    setAssignedFamilyMemberId("");
    setDueDate("");
    setEditingTaskId(null);
  }

  function handleLoadError(error: unknown) {
    if (error instanceof ApiError && error.status === 401) {
      handleMissingOrInvalidAuth(error, router);
      setStatus("unauthorized");
      setMessage(getUserFacingApiMessage(error, "Your session has expired. Logg inn på nytt."));
      return;
    }

    if (error instanceof ApiError && error.status === 404) {
      clearActiveFamilyId();
      setActiveFamilyIdState(null);
      setFamilyDetails(null);
      setTasks([]);
      setStatus("error");
      setMessage("Oppgavene for denne familien kunne ikke lastes for kontoen din.");
      return;
    }

    setStatus("error");
    setMessage("Could not load tasks right now. Please try again.");
  }

  function handleActionError(error: unknown, fallbackMessage: string) {
    if (error instanceof ApiError && error.status === 401) {
      handleMissingOrInvalidAuth(error, router);
      setStatus("unauthorized");
      setMessage(getUserFacingApiMessage(error, "Your session has expired. Logg inn på nytt."));
      return;
    }

    if (error instanceof ApiError && error.status === 404) {
      setStatus("error");
      setMessage("Denne oppgaven finnes ikke lenger i familien.");
      void loadOppgaver();
      return;
    }

    setMessage(getUserFacingApiMessage(error, fallbackMessage));
  }

  if (familyAccess.status === "pending") {
    return <LockedFeatureState />;
  }

  if (familyAccess.status !== "approved") {
    return (
      <PageContainer>
        <Card tone="default">
          <EmptyState title="Sjekker familietilgang" description="Vent litt mens vi bekrefter familietilknytningen din." />
        </Card>
      </PageContainer>
    );
  }

  return (
    <section className="tasks-page" aria-labelledby="tasks-title">
        <div className="tasks-page__header">
          <div className="tasks-page__copy">
            <Badge tone="primary">Husk</Badge>
            <h1 id="tasks-title" className="tasks-page__title">
              Oppgaver
            </h1>
            <p className="tasks-page__description">
              {status === "ready"
                ? `${formatOppgaveCount(incompleteCount)} for ${familyDetails?.family.name ?? "familien din"}.`
                : message}
            </p>
          </div>
          {hasMultipleFamilies ? (
            <label className="family-switcher">
              <span className="family-switcher__label">Aktiv familie</span>
              <select className="family-switcher__select" value={activeFamilyId ?? ""} onChange={handleFamilyChange}>
                {families.map((family) => (
                  <option key={family.family.id} value={family.family.id}>
                    {family.family.name}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
        </div>

        <Card className="tasks-card" tone="warm">
          <SectionHeader
            action={<Badge tone="neutral">{tasks.length} totalt</Badge>}
            eyebrow="Familieoppgaver"
            title={formatOppgaveCount(incompleteCount)}
          />

          {status === "unauthorized" ? <OppgaverStatusCard message={message} status={status} onRetry={() => loadOppgaver()} /> : null}
          {status === "no-family" ? <OppgaverStatusCard message={message} status={status} onRetry={() => loadOppgaver()} /> : null}
          {status === "error" ? <OppgaverStatusCard message={message} status={status} onRetry={() => loadOppgaver()} /> : null}

          {status !== "unauthorized" && status !== "no-family" ? (
            <TaskFormSheet
              activeFamilyId={activeFamilyId}
              assignedFamilyMemberId={assignedFamilyMemberId}
              description={description}
              dueDate={dueDate}
              editingTaskId={editingTaskId}
              isAdding={isAdding}
              isMounted={isMounted}
              isOpen={isTaskSheetOpen}
              members={members}
              onClose={() => { setIsTaskSheetOpen(false); resetTaskForm(); }}
              onSubmit={handleAddOppgave}
              setAssignedFamilyMemberId={setAssignedFamilyMemberId}
              setDescription={setDescription}
              setDueDate={setDueDate}
              setTitle={setTitle}
              title={title}
            />
          ) : null}

          {message && status === "ready" ? <p className="tasks-card__message">{message}</p> : null}

          {status === "loading" ? <LoadingState title="Laster oppgaver" description="Henter familiens nyeste oppgaver." /> : null}

          {status === "ready" && tasks.length === 0 ? (
            <EmptyState title="Ingen oppgaver i dag" description="Legg til en oppgave når noe må gjøres." />
          ) : null}

          {status === "ready" && filteredTasks.length > 0 ? (
            <div className="tasks-sections">
              <TaskGroup title="Gjenstående oppgaver" tasks={incompleteTasks} members={members} pendingTaskId={pendingTaskId} openTaskMenuId={openTaskMenuId} onToggle={handleToggleOppgave} onMenuToggle={setOpenTaskMenuId} onEdit={startEditingOppgave} onDelete={handleSlettOppgave} />
              <TaskGroup title="Fullførte oppgaver" tasks={completedTasks} members={members} pendingTaskId={pendingTaskId} openTaskMenuId={openTaskMenuId} onToggle={handleToggleOppgave} onMenuToggle={setOpenTaskMenuId} onEdit={startEditingOppgave} onDelete={handleSlettOppgave} />
            </div>
          ) : null}
        </Card>
      </section>
  );
}

function TaskFormSheet({
  assignedFamilyMemberId,
  description,
  dueDate,
  editingTaskId,
  isAdding,
  isMounted,
  isOpen,
  members,
  onClose,
  onSubmit,
  setAssignedFamilyMemberId,
  setDescription,
  setDueDate,
  setTitle,
  title
}: {
  activeFamilyId: string | null;
  assignedFamilyMemberId: string;
  description: string;
  dueDate: string;
  editingTaskId: string | null;
  isAdding: boolean;
  isMounted: boolean;
  isOpen: boolean;
  members: FamilyMember[];
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  setAssignedFamilyMemberId: (value: string) => void;
  setDescription: (value: string) => void;
  setDueDate: (value: string) => void;
  setTitle: (value: string) => void;
  title: string;
}) {
  const sheet = (
    <div aria-hidden={!isOpen} className={`husk-school-sheet${isOpen ? " husk-school-sheet--open" : ""}`}>
      <button className="husk-school-sheet__backdrop" type="button" aria-label="Lukk oppgave" onClick={onClose} />
      <form className="husk-school-sheet__panel task-edit-sheet__panel" role="dialog" aria-modal="true" aria-labelledby="task-edit-title" onSubmit={onSubmit}>
        <div className="husk-school-sheet__handle" aria-hidden="true" />
        <div className="husk-school-sheet__header">
          <div className="husk-reminder-edit-sheet__heading">
            <span className="husk-reminder-edit-sheet__icon" aria-hidden="true">
              <ListTodo size={22} strokeWidth={2.35} />
            </span>
            <div>
              <p className="husk-school-sheet__eyebrow">Oppgaver</p>
              <h3 className="husk-school-sheet__title" id="task-edit-title">{editingTaskId ? "Rediger oppgave" : "Ny oppgave"}</h3>
            </div>
          </div>
          <button className="husk-school-sheet__close" type="button" aria-label="Lukk" onClick={onClose}>
            <X aria-hidden="true" size={18} strokeWidth={2.5} />
          </button>
        </div>
        <div className="husk-school-sheet__content husk-reminder-edit-sheet__content">
          <label className="husk-school-field">
            <span>Oppgave</span>
            <input maxLength={120} onChange={(event) => setTitle(event.target.value)} placeholder="Kjøp melk" required value={title} />
          </label>
          <label className="husk-school-field">
            <span>Notat</span>
            <textarea maxLength={500} onChange={(event) => setDescription(event.target.value)} placeholder="Valgfri detalj …" rows={3} value={description} />
          </label>
          <div className="event-form-card event-form-card--rows husk-reminder-edit-sheet__rows" aria-label="Oppgavedetaljer">
            <label className="event-form-row">
              <span>Tildel</span>
              <select onChange={(event) => setAssignedFamilyMemberId(event.target.value)} value={assignedFamilyMemberId}>
                <option value="">Alle</option>
                {members.map((member) => (
                  <option key={member.id} value={member.id}>{member.displayName}</option>
                ))}
              </select>
            </label>
            <label className="event-form-row">
              <span>Frist</span>
              <input onChange={(event) => setDueDate(event.target.value)} type="date" value={dueDate} />
            </label>
          </div>
        </div>
        <div className="husk-school-sheet__actions">
          <button className="husk-school-sheet__action husk-school-sheet__action--secondary" type="button" onClick={onClose}>Avbryt</button>
          <button className="husk-school-sheet__action husk-school-sheet__action--primary" disabled={isAdding || title.trim().length === 0} type="submit">{isAdding ? "Lagrer …" : "Lagre"}</button>
        </div>
      </form>
    </div>
  );

  return isMounted ? createPortal(sheet, document.body) : sheet;
}

function TaskGroup({
  members,
  onDelete,
  onEdit,
  onMenuToggle,
  onToggle,
  openTaskMenuId,
  pendingTaskId,
  tasks,
  title
}: {
  members: FamilyMember[];
  onDelete: (taskId: string) => void;
  onEdit: (task: Task) => void;
  onMenuToggle: (taskId: string | null | ((currentId: string | null) => string | null)) => void;
  onToggle: (taskId: string) => void;
  openTaskMenuId: string | null;
  pendingTaskId: string | null;
  tasks: Task[];
  title: string;
}) {
  return (
    <section className="tasks-section" aria-labelledby={`${title.replaceAll(" ", "-").toLowerCase()}-heading`}>
      <div className="husk-reminder-group__heading">
        <h2 className="husk-reminder-group__title" id={`${title.replaceAll(" ", "-").toLowerCase()}-heading`}>{title}</h2>
        <span className="husk-reminder-group__count">{tasks.length}</span>
      </div>
      {tasks.length > 0 ? (
        <ul className="tasks-list" aria-label={title}>
          {tasks.map((task) => (
            <li className={task.completed ? "tasks-list__item tasks-list__item--completed" : "tasks-list__item"} key={task.id}>
              <button aria-label={`${task.completed ? "Marker som ikke ferdig" : "Fullfør"} ${task.title}`} className="tasks-list__toggle" disabled={pendingTaskId === task.id} onClick={() => onToggle(task.id)} type="button">
                {task.completed ? "☑" : "☐"}
              </button>
              <div className="tasks-list__content">
                <span className="tasks-list__title">{task.title}</span>
                <span className="tasks-list__meta">{formatOppgaveMeta(task, members)}</span>
                {task.description ? <span className="tasks-list__description">{task.description}</span> : null}
              </div>
              <span className="husk-reminder-card__menu-wrap tasks-list__menu-wrap" onBlur={(event) => {
                if (!(event.relatedTarget instanceof Node && event.currentTarget.contains(event.relatedTarget))) onMenuToggle(null);
              }}>
                <button aria-expanded={openTaskMenuId === task.id} aria-label={`Åpne meny for ${task.title}`} className="husk-reminder-card__menu-button" disabled={pendingTaskId === task.id} onClick={() => onMenuToggle((currentId) => (currentId === task.id ? null : task.id))} type="button">
                  <MoreHorizontal aria-hidden="true" size={20} />
                </button>
                {openTaskMenuId === task.id ? (
                  <span className="husk-reminder-card__menu tasks-list__menu-popover" role="menu">
                    <button type="button" role="menuitem" onClick={() => onEdit(task)}>Rediger</button>
                    <button className="husk-reminder-card__menu-delete" type="button" role="menuitem" onClick={() => { onMenuToggle(null); onDelete(task.id); }}>Slett</button>
                  </span>
                ) : null}
              </span>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}

function OppgaverStatusCard({
  message,
  onRetry,
  status
}: {
  message: string;
  onRetry: () => void;
  status: OppgaverStatus;
}) {
  if (status === "unauthorized") {
    return (
      <div className="tasks-status">
        <EmptyState title="Logg inn på nytt" description={message} />
        <Link className="button button--primary" href="/login">
          Gå til innlogging
        </Link>
      </div>
    );
  }

  if (status === "no-family") {
    return (
      <div className="tasks-status">
        <EmptyState title="Opprett din første familie" description={message} />
        <Link className="button button--primary" href="/onboarding/create-family">
          Opprett familie
        </Link>
      </div>
    );
  }

  return (
    <div className="tasks-status">
      <ErrorState title="Oppgaver kunne ikke lastes" description={message} />
      <Button variant="primary" onClick={onRetry}>
        Prøv igjen
      </Button>
    </div>
  );
}

function formatOppgaveCount(count: number): string {
  return `${count} oppgave${count === 1 ? "" : "r"} gjenstår`;
}

function formatOppgaveMeta(task: Task, members: FamilyMember[]): string {
  const assignee = members.find((member) => member.id === task.assignedFamilyMemberId)?.displayName ?? "Alle";
  const due = task.dueDate ? ` · ${new Date(task.dueDate).toLocaleDateString(undefined, { month: "short", day: "numeric" })}` : "";

  return `${assignee}${due}`;
}

function sortTasks(first: Task, second: Task) {
  if (first.completed !== second.completed) {
    return first.completed ? 1 : -1;
  }

  const firstFrist = first.dueDate ? new Date(first.dueDate).getTime() : Number.MAX_SAFE_INTEGER;
  const secondFrist = second.dueDate ? new Date(second.dueDate).getTime() : Number.MAX_SAFE_INTEGER;

  if (firstFrist !== secondFrist) {
    return firstFrist - secondFrist;
  }

  return new Date(first.createdAt).getTime() - new Date(second.createdAt).getTime();
}
