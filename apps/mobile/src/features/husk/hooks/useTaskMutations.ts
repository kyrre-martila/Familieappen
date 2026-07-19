import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { Task } from "@familieappen/shared";
import { useActiveFamily } from "../../family/useActiveFamily";
import { ApiError } from "../../../lib/api/client";
import { createTask, deleteTask, toggleTask, updateTask } from "../api";
import { huskQueryKeys } from "../queryKeys";
import { mergeCreatedTask, removeTask, replaceTask, type TaskPayload } from "../taskModel";

const message = (error: unknown) => error instanceof ApiError ? error.message : "Kunne ikke lagre oppgaven akkurat nå. Prøv igjen.";

export function useTaskMutations() {
  const { accessToken, familyId } = useActiveFamily();
  const client = useQueryClient();
  const key = familyId ? huskQueryKeys.tasks(familyId) : null;
  const setTasks = (updater: (current: Task[] | undefined) => Task[] | undefined) => {
    if (key) client.setQueryData(key, updater);
  };
  const createMutation = useMutation({ mutationFn: (input: TaskPayload) => createTask(accessToken!, familyId!, input), onSuccess: (task) => setTasks((current) => mergeCreatedTask(current, task)) });
  const updateMutation = useMutation({ mutationFn: ({ id, input }: { id: string; input: TaskPayload }) => updateTask(accessToken!, familyId!, id, input), onSuccess: (task) => setTasks((current) => replaceTask(current, task)) });
  const toggleMutation = useMutation({ mutationFn: (id: string) => toggleTask(accessToken!, familyId!, id), onSuccess: (task) => setTasks((current) => replaceTask(current, task)) });
  const deleteMutation = useMutation({ mutationFn: (id: string) => deleteTask(accessToken!, familyId!, id), onSuccess: (_task, id) => setTasks((current) => removeTask(current, id)) });
  const error = createMutation.error ?? updateMutation.error ?? toggleMutation.error ?? deleteMutation.error;
  return {
    create: createMutation.mutateAsync,
    update: updateMutation.mutateAsync,
    toggle: toggleMutation.mutateAsync,
    remove: deleteMutation.mutateAsync,
    saving: createMutation.isPending || updateMutation.isPending || toggleMutation.isPending || deleteMutation.isPending,
    error: error ? message(error) : null,
    resetError: () => { createMutation.reset(); updateMutation.reset(); toggleMutation.reset(); deleteMutation.reset(); },
  };
}
