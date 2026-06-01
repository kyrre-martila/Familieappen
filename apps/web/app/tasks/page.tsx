"use client";

import { FormEvent, useEffect, useMemo, useState, type ChangeEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LockedFeatureState } from "../../components/PendingAccess";
import { useFamilyAccess } from "../../components/ProtectedFamilyRoute";
import { Badge, Button, Card, EmptyState, ErrorState, LoadingState, PageContainer, SectionHeader } from "../../components/ui";
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
  toggleTask
} from "../../lib/api";
import { chooseActiveFamily, getUserFacingApiMessage, handleMissingOrInvalidAuth } from "../../lib/auth-family";
import { clearActiveFamilyId } from "../../lib/session";

type TasksStatus = "loading" | "ready" | "pending" | "unauthorized" | "no-family" | "error";

export default function TasksPage() {
  const router = useRouter();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [familyDetails, setFamilyDetails] = useState<FamilyDetails | null>(null);
  const [families, setFamilies] = useState<FamilyWithMembership[]>([]);
  const [activeFamilyId, setActiveFamilyIdState] = useState<string | null>(null);
  const [status, setStatus] = useState<TasksStatus>("loading");
  const [message, setMessage] = useState("Loading tasks…");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [assignedFamilyMemberId, setAssignedFamilyMemberId] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [pendingTaskId, setPendingTaskId] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);

  const familyAccess = useFamilyAccess();
  const approvedFamilyContext = familyAccess.status === "approved" ? familyAccess.familyContext : null;

  useEffect(() => {
    if (!approvedFamilyContext) {
      return;
    }

    setFamilies(approvedFamilyContext.families);
    setActiveFamilyIdState(approvedFamilyContext.activeFamilyId);
    void loadTasks(approvedFamilyContext.activeFamilyId);
  }, [approvedFamilyContext?.activeFamilyId, approvedFamilyContext]);

  const incompleteCount = useMemo(() => tasks.filter((task) => !task.completed).length, [tasks]);
  const hasMultipleFamilies = families.length > 1;
  const members = familyDetails?.members ?? [];

  async function loadTasks(familyId = activeFamilyId) {
    if (!familyId) {
      setStatus("no-family");
      setMessage("Choose a family before opening tasks.");
      return;
    }

    setStatus("loading");
    setMessage("Loading tasks…");

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
    await loadTasks(familyId);
  }

  async function handleAddTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nextTitle = title.trim();
    const nextDescription = description.trim();

    if (!activeFamilyId || nextTitle.length === 0 || isAdding) {
      return;
    }

    setIsAdding(true);
    setMessage("");

    try {
      const task = await addTask(activeFamilyId, {
        title: nextTitle,
        ...(nextDescription ? { description: nextDescription } : {}),
        ...(assignedFamilyMemberId ? { assignedFamilyMemberId } : {}),
        ...(dueDate ? { dueDate } : {})
      });
      setTasks((currentTasks) => [...currentTasks, task].sort(sortTasks));
      setTitle("");
      setDescription("");
      setDueDate("");
      setStatus("ready");
    } catch (error) {
      handleActionError(error, "Could not add the task. Please try again.");
    } finally {
      setIsAdding(false);
    }
  }

  async function handleToggleTask(taskId: string) {
    if (!activeFamilyId || pendingTaskId) {
      return;
    }

    setPendingTaskId(taskId);
    setMessage("");

    try {
      const updatedTask = await toggleTask(activeFamilyId, taskId);
      setTasks((currentTasks) => currentTasks.map((task) => (task.id === taskId ? updatedTask : task)).sort(sortTasks));
    } catch (error) {
      handleActionError(error, "Could not update the task. Please try again.");
    } finally {
      setPendingTaskId(null);
    }
  }

  async function handleDeleteTask(taskId: string) {
    if (!activeFamilyId || pendingTaskId) {
      return;
    }

    setPendingTaskId(taskId);
    setMessage("");

    try {
      await deleteTask(activeFamilyId, taskId);
      setTasks((currentTasks) => currentTasks.filter((task) => task.id !== taskId));
    } catch (error) {
      handleActionError(error, "Could not delete the task. Please try again.");
    } finally {
      setPendingTaskId(null);
    }
  }

  function handleLoadError(error: unknown) {
    if (error instanceof ApiError && error.status === 401) {
      handleMissingOrInvalidAuth(error, router);
      setStatus("unauthorized");
      setMessage(getUserFacingApiMessage(error, "Your session has expired. Please sign in again."));
      return;
    }

    if (error instanceof ApiError && error.status === 404) {
      clearActiveFamilyId();
      setActiveFamilyIdState(null);
      setFamilyDetails(null);
      setTasks([]);
      setStatus("error");
      setMessage("That family task list could not be loaded for your account.");
      return;
    }

    setStatus("error");
    setMessage("Could not load tasks right now. Please try again.");
  }

  function handleActionError(error: unknown, fallbackMessage: string) {
    if (error instanceof ApiError && error.status === 401) {
      handleMissingOrInvalidAuth(error, router);
      setStatus("unauthorized");
      setMessage(getUserFacingApiMessage(error, "Your session has expired. Please sign in again."));
      return;
    }

    if (error instanceof ApiError && error.status === 404) {
      setStatus("error");
      setMessage("This task is no longer available in your family.");
      void loadTasks();
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
    <PageContainer>
      <section className="tasks-page" aria-labelledby="tasks-title">
        <div className="tasks-page__header">
          <div className="tasks-page__copy">
            <Badge tone="primary">Shared tasks</Badge>
            <h1 id="tasks-title" className="tasks-page__title">
              Tasks
            </h1>
            <p className="tasks-page__description">
              {status === "ready"
                ? `${formatTaskCount(incompleteCount)} for ${familyDetails?.family.name ?? "your family"}.`
                : message}
            </p>
          </div>
          {hasMultipleFamilies ? (
            <label className="family-switcher">
              <span className="family-switcher__label">Active family</span>
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
            action={<Badge tone="neutral">{tasks.length} total</Badge>}
            eyebrow="Family tasks"
            title={formatTaskCount(incompleteCount)}
          />

          {status === "unauthorized" ? <TasksStatusCard message={message} status={status} onRetry={() => loadTasks()} /> : null}
          {status === "no-family" ? <TasksStatusCard message={message} status={status} onRetry={() => loadTasks()} /> : null}
          {status === "error" ? <TasksStatusCard message={message} status={status} onRetry={() => loadTasks()} /> : null}

          {status !== "unauthorized" && status !== "no-family" ? (
            <form className="tasks-form" onSubmit={handleAddTask}>
              <label className="tasks-form__field tasks-form__field--title">
                <span className="tasks-form__label">Task</span>
                <input
                  className="tasks-form__input"
                  maxLength={120}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="Buy milk"
                  value={title}
                />
              </label>
              <label className="tasks-form__field">
                <span className="tasks-form__label">Assign</span>
                <select
                  className="tasks-form__input"
                  onChange={(event) => setAssignedFamilyMemberId(event.target.value)}
                  value={assignedFamilyMemberId}
                >
                  <option value="">Anyone</option>
                  {members.map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.displayName}
                    </option>
                  ))}
                </select>
              </label>
              <label className="tasks-form__field">
                <span className="tasks-form__label">Due</span>
                <input className="tasks-form__input" onChange={(event) => setDueDate(event.target.value)} type="date" value={dueDate} />
              </label>
              <label className="tasks-form__field tasks-form__field--description">
                <span className="tasks-form__label">Note</span>
                <input
                  className="tasks-form__input"
                  maxLength={500}
                  onChange={(event) => setDescription(event.target.value)}
                  placeholder="Optional detail"
                  value={description}
                />
              </label>
              <Button className="tasks-form__button" disabled={isAdding || title.trim().length === 0} type="submit" variant="primary">
                + Add task
              </Button>
            </form>
          ) : null}

          {message && status === "ready" ? <p className="tasks-card__message">{message}</p> : null}

          {status === "loading" ? <LoadingState title="Loading tasks" description="Fetching the latest family tasks." /> : null}

          {status === "ready" && tasks.length === 0 ? (
            <EmptyState title="No tasks today" description="Add a quick task when someone needs to remember something." />
          ) : null}

          {status === "ready" && tasks.length > 0 ? (
            <ul className="tasks-list" aria-label="Family tasks">
              {tasks.map((task) => (
                <li className={task.completed ? "tasks-list__item tasks-list__item--completed" : "tasks-list__item"} key={task.id}>
                  <button
                    aria-label={`${task.completed ? "Mark incomplete" : "Complete"} ${task.title}`}
                    className="tasks-list__toggle"
                    disabled={pendingTaskId === task.id}
                    onClick={() => handleToggleTask(task.id)}
                    type="button"
                  >
                    {task.completed ? "☑" : "☐"}
                  </button>
                  <div className="tasks-list__content">
                    <span className="tasks-list__title">{task.title}</span>
                    <span className="tasks-list__meta">{formatTaskMeta(task, members)}</span>
                    {task.description ? <span className="tasks-list__description">{task.description}</span> : null}
                  </div>
                  <button
                    aria-label={`Delete ${task.title}`}
                    className="tasks-list__delete"
                    disabled={pendingTaskId === task.id}
                    onClick={() => handleDeleteTask(task.id)}
                    type="button"
                  >
                    Delete
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </Card>
      </section>
    </PageContainer>
  );
}

function TasksStatusCard({
  message,
  onRetry,
  status
}: {
  message: string;
  onRetry: () => void;
  status: TasksStatus;
}) {
  if (status === "unauthorized") {
    return (
      <div className="tasks-status">
        <EmptyState title="Please sign in again" description={message} />
        <Link className="button button--primary" href="/login">
          Go to login
        </Link>
      </div>
    );
  }

  if (status === "no-family") {
    return (
      <div className="tasks-status">
        <EmptyState title="Create your first family" description={message} />
        <Link className="button button--primary" href="/onboarding/create-family">
          Create family
        </Link>
      </div>
    );
  }

  return (
    <div className="tasks-status">
      <ErrorState title="Tasks could not load" description={message} />
      <Button variant="primary" onClick={onRetry}>
        Try again
      </Button>
    </div>
  );
}

function formatTaskCount(count: number): string {
  return `${count} task${count === 1 ? "" : "s"} open`;
}

function formatTaskMeta(task: Task, members: FamilyMember[]): string {
  const assignee = members.find((member) => member.id === task.assignedFamilyMemberId)?.displayName ?? "Anyone";
  const due = task.dueDate ? ` · ${new Date(task.dueDate).toLocaleDateString(undefined, { month: "short", day: "numeric" })}` : "";

  return `${assignee}${due}`;
}

function sortTasks(first: Task, second: Task) {
  if (first.completed !== second.completed) {
    return first.completed ? 1 : -1;
  }

  const firstDue = first.dueDate ? new Date(first.dueDate).getTime() : Number.MAX_SAFE_INTEGER;
  const secondDue = second.dueDate ? new Date(second.dueDate).getTime() : Number.MAX_SAFE_INTEGER;

  if (firstDue !== secondDue) {
    return firstDue - secondDue;
  }

  return new Date(first.createdAt).getTime() - new Date(second.createdAt).getTime();
}
