/** Shares one save/confirmation lock across all Finish entry points. */
export function createWorkoutFinishGuard(activeClientId: () => string | undefined) {
  let saving = false;
  let confirming = false;
  return {
    async save(clientId: string, action: () => Promise<boolean>): Promise<boolean> {
      if (saving || activeClientId() !== clientId) return false;
      saving = true;
      try {
        return await action();
      } finally {
        saving = false;
      }
    },
    async confirm(
      clientId: string,
      ask: () => Promise<boolean>,
      finish: () => Promise<unknown>,
    ): Promise<void> {
      if (saving || confirming || activeClientId() !== clientId) return;
      confirming = true;
      try {
        if (await ask() && activeClientId() === clientId) await finish();
      } finally {
        confirming = false;
      }
    },
  };
}
