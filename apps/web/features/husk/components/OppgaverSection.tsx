"use client";

import type { HuskFilters } from "../types";

import {
  FormEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
} from "react";
import { CalendarDays, ListTodo, MoreHorizontal, Users, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AppActionFooter,
  AppCard,
  AppField,
  AppMenuButton,
  AppSheet,
  AppTextarea,
} from "../../../components/app-ui";
import {
  SharedAudienceSelector,
  getAudienceSummary,
} from "./SharedAudienceSelector";
import { LockedFeatureState } from "../../../components/PendingAccess";
import { useFamilyAccess } from "../../../components/ProtectedFamilyRoute";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorState,
  LoadingState,
  PageContainer,
  SectionHeader,
} from "../../../components/ui";
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
  updateTask,
} from "../../../lib/api";
import {
  chooseActiveFamily,
  getUserFacingApiMessage,
  handleMissingOrInvalidAuth,
} from "../../../lib/auth-family";
import { clearActiveFamilyId } from "../../../lib/session";

type OppgaverStatus =
  | "loading"
  | "ready"
  | "pending"
  | "unauthorized"
  | "no-family"
  | "error";

export function OppgaverSection({
  detailId,
  query,
  createRequest = 0,
  filters,
}: {
  detailId?: string | null;
  query: string;
  createRequest?: number;
  filters: HuskFilters;
}) {
  const router = useRouter();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [familyDetails, setFamilyDetails] = useState<FamilyDetails | null>(
    null,
  );
  const [families, setFamilies] = useState<FamilyWithMembership[]>([]);
  const [activeFamilyId, setActiveFamilyIdState] = useState<string | null>(
    null,
  );
  const [status, setStatus] = useState<OppgaverStatus>("loading");
  const [message, setMessage] = useState("Laster oppgaver …");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [assignedMemberIds, setAssignedMemberIds] = useState<string[]>([]);
  const [dueDate, setDueDate] = useState("");
  const [pendingTaskId, setPendingTaskId] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [openTaskMenuId, setOpenTaskMenuId] = useState<string | null>(null);
  const [isTaskSheetOpen, setIsTaskSheetOpen] = useState(false);
  const [detailTask, setDetailTask] = useState<Task | null>(null);
  const familyAccess = useFamilyAccess();
  const approvedFamilyContext =
    familyAccess.status === "approved" ? familyAccess.familyContext : null;

  useEffect(() => {
    if (!approvedFamilyContext) {
      return;
    }

    setFamilies(approvedFamilyContext.families);
    setActiveFamilyIdState(approvedFamilyContext.activeFamilyId);
    void loadOppgaver(approvedFamilyContext.activeFamilyId);
  }, [approvedFamilyContext?.activeFamilyId, approvedFamilyContext]);

  const normalizedQuery = query.trim().toLocaleLowerCase("nb-NO");
  useEffect(() => {
    if (!detailId || status === "loading") {
      return;
    }

    setDetailTask(tasks.find((task) => task.id === detailId) ?? null);
  }, [detailId, status, tasks]);

  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      if (!matchesTaskPersonFilter(task, filters.person)) {
        return false;
      }

      if (!normalizedQuery) {
        return true;
      }

      return [
        task.title,
        task.description ?? "",
        formatOppgaveMeta(task, familyDetails?.members ?? []),
      ].some((value) =>
        value.toLocaleLowerCase("nb-NO").includes(normalizedQuery),
      );
    });
  }, [familyDetails?.members, filters.person, normalizedQuery, tasks]);
  const incompleteTasks = useMemo(
    () => filteredTasks.filter((task) => !task.completed),
    [filteredTasks],
  );
  const completedTasks = useMemo(
    () =>
      filters.hidePrevious
        ? []
        : filteredTasks.filter((task) => task.completed),
    [filteredTasks, filters.hidePrevious],
  );
  const incompleteCount = useMemo(
    () => tasks.filter((task) => !task.completed).length,
    [tasks],
  );
  const hasMultipleFamilies = families.length > 1;
  const members = familyDetails?.members ?? [];
  const previousCreateRequest = useRef(createRequest);

  useEffect(() => {
    if (createRequest === previousCreateRequest.current) {
      return;
    }

    previousCreateRequest.current = createRequest;
    resetTaskForm();
    setOpenTaskMenuId(null);
    setIsTaskSheetOpen(true);
    setMessage("");
  }, [createRequest]);

  async function loadOppgaver(familyId = activeFamilyId) {
    if (!familyId) {
      setStatus("no-family");
      setMessage("Velg familie før du åpner oppgaver.");
      return;
    }

    setStatus("loading");
    setMessage("Laster oppgaver …");

    try {
      const [details, taskItems] = await Promise.all([
        getFamily(familyId),
        getTasks(familyId),
      ]);
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
    setAssignedMemberIds([]);
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
            assignedMemberIds,
            assignedFamilyMemberId: assignedMemberIds[0] ?? null,
            dueDate: dueDate || null,
          })
        : await addTask(activeFamilyId, {
            title: nextTitle,
            ...(nextDescription ? { description: nextDescription } : {}),
            ...(assignedMemberIds.length > 0
              ? {
                  assignedMemberIds,
                  assignedFamilyMemberId: assignedMemberIds[0],
                }
              : {}),
            ...(dueDate ? { dueDate } : {}),
          });
      if (editingTaskId) {
        setTasks((currentOppgaver) =>
          currentOppgaver
            .map((currentTask) =>
              currentTask.id === editingTaskId ? task : currentTask,
            )
            .sort(sortTasks),
        );
        setEditingTaskId(null);
      } else {
        setTasks((currentOppgaver) =>
          [...currentOppgaver, task].sort(sortTasks),
        );
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
      setTasks((currentOppgaver) =>
        currentOppgaver
          .map((task) => (task.id === taskId ? updatedOppgave : task))
          .sort(sortTasks),
      );
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
      setTasks((currentOppgaver) =>
        currentOppgaver.filter((task) => task.id !== taskId),
      );
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
    setAssignedMemberIds(getTaskAssignedMemberIds(task));
    setDueDate(task.dueDate ? task.dueDate.slice(0, 10) : "");
    setOpenTaskMenuId(null);
    setIsTaskSheetOpen(true);
    setMessage("");
  }

  function resetTaskForm() {
    setTitle("");
    setDescription("");
    setAssignedMemberIds([]);
    setDueDate("");
    setEditingTaskId(null);
  }

  function handleLoadError(error: unknown) {
    if (error instanceof ApiError && error.status === 401) {
      handleMissingOrInvalidAuth(error, router);
      setStatus("unauthorized");
      setMessage(
        getUserFacingApiMessage(
          error,
          "Your session has expired. Logg inn på nytt.",
        ),
      );
      return;
    }

    if (error instanceof ApiError && error.status === 404) {
      clearActiveFamilyId();
      setActiveFamilyIdState(null);
      setFamilyDetails(null);
      setTasks([]);
      setStatus("error");
      setMessage(
        "Oppgavene for denne familien kunne ikke lastes for kontoen din.",
      );
      return;
    }

    setStatus("error");
    setMessage("Could not load tasks right now. Please try again.");
  }

  function handleActionError(error: unknown, fallbackMessage: string) {
    if (error instanceof ApiError && error.status === 401) {
      handleMissingOrInvalidAuth(error, router);
      setStatus("unauthorized");
      setMessage(
        getUserFacingApiMessage(
          error,
          "Your session has expired. Logg inn på nytt.",
        ),
      );
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
          <EmptyState
            title="Sjekker familietilgang"
            description="Vent litt mens vi bekrefter familietilknytningen din."
          />
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
            <select
              className="family-switcher__select"
              value={activeFamilyId ?? ""}
              onChange={handleFamilyChange}
            >
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

        {status === "unauthorized" ? (
          <OppgaverStatusCard
            message={message}
            status={status}
            onRetry={() => loadOppgaver()}
          />
        ) : null}
        {status === "no-family" ? (
          <OppgaverStatusCard
            message={message}
            status={status}
            onRetry={() => loadOppgaver()}
          />
        ) : null}
        {status === "error" ? (
          <OppgaverStatusCard
            message={message}
            status={status}
            onRetry={() => loadOppgaver()}
          />
        ) : null}

        {status !== "unauthorized" && status !== "no-family" ? (
          <>
            <TaskFormSheet
              activeFamilyId={activeFamilyId}
              assignedMemberIds={assignedMemberIds}
              description={description}
              dueDate={dueDate}
              editingTaskId={editingTaskId}
              isAdding={isAdding}
              isOpen={isTaskSheetOpen}
              members={members}
              onClose={() => {
                setIsTaskSheetOpen(false);
                resetTaskForm();
              }}
              onSubmit={handleAddOppgave}
              setAssignedMemberIds={setAssignedMemberIds}
              setDescription={setDescription}
              setDueDate={setDueDate}
              setTitle={setTitle}
              title={title}
            />
            <TaskDetailSheet
              members={members}
              onClose={() => setDetailTask(null)}
              onEdit={startEditingOppgave}
              task={detailTask}
            />
          </>
        ) : null}

        {message && status === "ready" ? (
          <p className="tasks-card__message">{message}</p>
        ) : null}

        {status === "loading" ? (
          <LoadingState
            title="Laster oppgaver"
            description="Henter familiens nyeste oppgaver."
          />
        ) : null}

        {status === "ready" && tasks.length === 0 ? (
          <EmptyState
            title="Ingen oppgaver i dag"
            description="Legg til en oppgave når noe må gjøres."
          />
        ) : null}

        {status === "ready" &&
        tasks.length > 0 &&
        incompleteTasks.length === 0 &&
        completedTasks.length === 0 ? (
          <EmptyState
            title="Ingen oppgaver matcher filteret"
            description="Endre filteret eller nullstill for å se alle oppgaver."
          />
        ) : null}

        {status === "ready" &&
        (incompleteTasks.length > 0 || completedTasks.length > 0) ? (
          <div className="tasks-sections">
            <TaskGroup
              title="Gjenstående oppgaver"
              tasks={incompleteTasks}
              members={members}
              pendingTaskId={pendingTaskId}
              openTaskMenuId={openTaskMenuId}
              onToggle={handleToggleOppgave}
              onMenuToggle={setOpenTaskMenuId}
              onEdit={startEditingOppgave}
              onOpen={setDetailTask}
              onDelete={handleSlettOppgave}
            />
            <TaskGroup
              title="Fullførte oppgaver"
              tasks={completedTasks}
              members={members}
              pendingTaskId={pendingTaskId}
              openTaskMenuId={openTaskMenuId}
              onToggle={handleToggleOppgave}
              onMenuToggle={setOpenTaskMenuId}
              onEdit={startEditingOppgave}
              onOpen={setDetailTask}
              onDelete={handleSlettOppgave}
            />
          </div>
        ) : null}
      </Card>
    </section>
  );
}

function getTaskAssignedMemberIds(task: Task): string[] {
  return (
    task.assignedMemberIds ??
    (task.assignedFamilyMemberId ? [task.assignedFamilyMemberId] : [])
  );
}

function matchesTaskPersonFilter(task: Task, person: HuskFilters["person"]) {
  if (person === "all") {
    return true;
  }

  const assignedMemberIds = getTaskAssignedMemberIds(task);

  if (person === "family") {
    return assignedMemberIds.length === 0;
  }

  return assignedMemberIds.includes(person);
}

function TaskFormSheet({
  assignedMemberIds,
  description,
  dueDate,
  editingTaskId,
  isAdding,
  isOpen,
  members,
  onClose,
  onSubmit,
  setAssignedMemberIds,
  setDescription,
  setDueDate,
  setTitle,
  title,
}: {
  activeFamilyId: string | null;
  assignedMemberIds: string[];
  description: string;
  dueDate: string;
  editingTaskId: string | null;
  isAdding: boolean;
  isOpen: boolean;
  members: FamilyMember[];
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  setAssignedMemberIds: (
    value: string[] | ((currentIds: string[]) => string[]),
  ) => void;
  setDescription: (value: string) => void;
  setDueDate: (value: string) => void;
  setTitle: (value: string) => void;
  title: string;
}) {
  const [isAssigneeOpen, setIsAssigneeOpen] = useState(false);
  return (
    <AppSheet
      baseClassName="husk-school-sheet"
      className="task-edit-sheet__panel"
      isOpen={isOpen}
      labelledBy="task-edit-title"
      onClose={onClose}
      onSubmit={onSubmit}
      panelAs="form"
      wrapContent={false}
    >
      <div className="husk-school-sheet__header">
        <div className="husk-reminder-edit-sheet__heading">
          <span className="husk-reminder-edit-sheet__icon" aria-hidden="true">
            <ListTodo size={22} strokeWidth={2.35} />
          </span>
          <div>
            <p className="husk-school-sheet__eyebrow">Oppgaver</p>
            <h3 className="husk-school-sheet__title" id="task-edit-title">
              {editingTaskId ? "Rediger oppgave" : "Ny oppgave"}
            </h3>
          </div>
        </div>
        <button
          className="husk-school-sheet__close"
          type="button"
          aria-label="Lukk"
          onClick={onClose}
        >
          <X aria-hidden="true" size={18} strokeWidth={2.5} />
        </button>
      </div>
      <div className="husk-school-sheet__content husk-reminder-edit-sheet__content">
        <AppField className="husk-school-field">
          <span>Oppgave</span>
          <input
            maxLength={120}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Kjøp melk"
            required
            value={title}
          />
        </AppField>
        <AppField className="husk-school-field">
          <span>Notat</span>
          <AppTextarea
            maxLength={500}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Valgfri detalj …"
            rows={3}
            value={description}
          />
        </AppField>
        <SharedAudienceSelector
          labelledBy="task-assignee-title"
          title="Tildel"
          isOpen={isAssigneeOpen}
          members={members}
          onToggleOpen={() => setIsAssigneeOpen((open) => !open)}
          selectedMemberIds={assignedMemberIds}
          setSelectedMemberIds={setAssignedMemberIds}
        />
        <div
          className="event-form-card event-form-card--rows husk-reminder-edit-sheet__rows"
          aria-label="Oppgavefrist"
        >
          <label className="event-form-row">
            <CalendarDays aria-hidden="true" size={22} strokeWidth={2.4} />
            <span>Frist</span>
            <input
              onChange={(event) => setDueDate(event.target.value)}
              type="date"
              value={dueDate}
            />
          </label>
        </div>
      </div>
      <AppActionFooter className="husk-school-sheet__actions">
        <button
          className="husk-school-sheet__action husk-school-sheet__action--secondary"
          type="button"
          onClick={onClose}
        >
          Avbryt
        </button>
        <button
          className="husk-school-sheet__action husk-school-sheet__action--primary"
          disabled={isAdding || title.trim().length === 0}
          type="submit"
        >
          {isAdding ? "Lagrer …" : "Lagre"}
        </button>
      </AppActionFooter>
    </AppSheet>
  );
}

function TaskDetailSheet({
  members,
  onClose,
  onEdit,
  task,
}: {
  members: FamilyMember[];
  onClose: () => void;
  onEdit: (task: Task) => void;
  task: Task | null;
}) {
  return (
    <AppSheet
      baseClassName="calendar-filter-sheet"
      isOpen={Boolean(task)}
      labelledBy="task-detail-title"
      onClose={onClose}
      wrapContent={false}
    >
      {task ? (
        <>
          <div className="calendar-filter-sheet__header">
            <div className="husk-reminder-detail__heading">
              <span className="husk-reminder-detail__icon" aria-hidden="true">
                <ListTodo size={24} strokeWidth={2.35} />
              </span>
              <div>
                <p className="calendar-filter-sheet__status">
                  Oppgaver • {task.completed ? "Fullført" : "Gjenstår"}
                </p>
                <h3
                  className="calendar-filter-sheet__title"
                  id="task-detail-title"
                >
                  {task.title}
                </h3>
              </div>
            </div>
            <button
              className="calendar-filter-sheet__close"
              type="button"
              aria-label="Lukk oppgave"
              onClick={onClose}
            >
              <X aria-hidden="true" size={18} strokeWidth={2.5} />
            </button>
          </div>
          <div className="husk-reminder-detail__content">
            <div className="husk-reminder-detail__row">
              <Users aria-hidden="true" size={19} strokeWidth={2.4} />
              <span>
                {getAudienceSummary(getTaskAssignedMemberIds(task), members)}
              </span>
            </div>
            {task.dueDate ? (
              <div className="husk-reminder-detail__row">
                <CalendarDays aria-hidden="true" size={19} strokeWidth={2.4} />
                <span>{task.dueDate.slice(0, 10)}</span>
              </div>
            ) : null}
            {task.description ? (
              <div className="husk-reminder-detail__row husk-reminder-detail__row--note">
                <span className="husk-reminder-detail__note">
                  {task.description}
                </span>
              </div>
            ) : null}
          </div>
          <AppActionFooter>
            <button
              className="husk-school-sheet__action husk-school-sheet__action--primary"
              type="button"
              onClick={() => onEdit(task)}
            >
              Rediger
            </button>
          </AppActionFooter>
        </>
      ) : null}
    </AppSheet>
  );
}

function TaskGroup({
  members,
  onDelete,
  onEdit,
  onMenuToggle,
  onToggle,
  onOpen,
  openTaskMenuId,
  pendingTaskId,
  tasks,
  title,
}: {
  members: FamilyMember[];
  onDelete: (taskId: string) => void;
  onEdit: (task: Task) => void;
  onMenuToggle: (
    taskId: string | null | ((currentId: string | null) => string | null),
  ) => void;
  onToggle: (taskId: string) => void;
  onOpen: (task: Task) => void;
  openTaskMenuId: string | null;
  pendingTaskId: string | null;
  tasks: Task[];
  title: string;
}) {
  return (
    <section
      className="tasks-section"
      aria-labelledby={`${title.replaceAll(" ", "-").toLowerCase()}-heading`}
    >
      <div className="husk-reminder-group__heading">
        <h2
          className="husk-reminder-group__title"
          id={`${title.replaceAll(" ", "-").toLowerCase()}-heading`}
        >
          {title}
        </h2>
        <span className="husk-reminder-group__count">{tasks.length}</span>
      </div>
      {tasks.length > 0 ? (
        <ul className="tasks-list" aria-label={title}>
          {tasks.map((task) => (
            <AppCard
              as="li"
              className={
                task.completed
                  ? "tasks-list__item tasks-list__item--completed"
                  : "tasks-list__item"
              }
              key={task.id}
            >
              <button
                aria-label={`${task.completed ? "Marker som ikke ferdig" : "Fullfør"} ${task.title}`}
                className="tasks-list__toggle"
                disabled={pendingTaskId === task.id}
                onClick={() => onToggle(task.id)}
                type="button"
              >
                {task.completed ? "☑" : "☐"}
              </button>
              <button
                className="tasks-list__content"
                type="button"
                onClick={() => onOpen(task)}
                aria-label={`Vis oppgave ${task.title}`}
              >
                <span className="tasks-list__title">{task.title}</span>
                <span className="tasks-list__meta">
                  {formatOppgaveMeta(task, members)}
                </span>
                {task.description ? (
                  <span className="tasks-list__description">
                    {task.description}
                  </span>
                ) : null}
              </button>
              <span
                className="husk-reminder-card__menu-wrap tasks-list__menu-wrap"
                onBlur={(event) => {
                  if (
                    !(
                      event.relatedTarget instanceof Node &&
                      event.currentTarget.contains(event.relatedTarget)
                    )
                  )
                    onMenuToggle(null);
                }}
              >
                <AppMenuButton
                  aria-expanded={openTaskMenuId === task.id}
                  aria-label={`Åpne meny for ${task.title}`}
                  className="husk-reminder-card__menu-button"
                  disabled={pendingTaskId === task.id}
                  onClick={() =>
                    onMenuToggle((currentId) =>
                      currentId === task.id ? null : task.id,
                    )
                  }
                  type="button"
                >
                  <MoreHorizontal aria-hidden="true" size={20} />
                </AppMenuButton>
                {openTaskMenuId === task.id ? (
                  <span
                    className="husk-reminder-card__menu tasks-list__menu-popover"
                    role="menu"
                  >
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => onEdit(task)}
                    >
                      Rediger
                    </button>
                    <button
                      className="husk-reminder-card__menu-delete"
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        onMenuToggle(null);
                        onDelete(task.id);
                      }}
                    >
                      Slett
                    </button>
                  </span>
                ) : null}
              </span>
            </AppCard>
          ))}
        </ul>
      ) : null}
    </section>
  );
}

function OppgaverStatusCard({
  message,
  onRetry,
  status,
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
        <Link
          className="button button--primary"
          href="/onboarding/create-family"
        >
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
  const assignedMemberIds = getTaskAssignedMemberIds(task);
  const assignee =
    assignedMemberIds.length > 0
      ? getAudienceSummary(assignedMemberIds, members)
      : "Alle";
  const due = task.dueDate
    ? ` · ${new Date(task.dueDate).toLocaleDateString(undefined, { month: "short", day: "numeric" })}`
    : "";

  return `${assignee}${due}`;
}

function sortTasks(first: Task, second: Task) {
  if (first.completed !== second.completed) {
    return first.completed ? 1 : -1;
  }

  const firstFrist = first.dueDate
    ? new Date(first.dueDate).getTime()
    : Number.MAX_SAFE_INTEGER;
  const secondFrist = second.dueDate
    ? new Date(second.dueDate).getTime()
    : Number.MAX_SAFE_INTEGER;

  if (firstFrist !== secondFrist) {
    return firstFrist - secondFrist;
  }

  return (
    new Date(first.createdAt).getTime() - new Date(second.createdAt).getTime()
  );
}
