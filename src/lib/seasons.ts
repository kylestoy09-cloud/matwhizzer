/** Season metadata — safe to import in both server and client components. */
export const SEASONS: Record<number, { label: string; isCurrent: boolean }> = {
  1: { label: '2024-25', isCurrent: false },
  2: { label: '2025-26', isCurrent: true  },
}
