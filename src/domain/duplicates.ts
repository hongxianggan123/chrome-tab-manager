import type { TabInstance } from "./types"

export function applyDuplicateCounts(instances: TabInstance[]): TabInstance[] {
  const counts = new Map<string, number>()

  for (const instance of instances) {
    counts.set(
      instance.normalizedUrl,
      (counts.get(instance.normalizedUrl) ?? 0) + 1
    )
  }

  return instances.map((instance) => ({
    ...instance,
    duplicateCount: counts.get(instance.normalizedUrl) ?? 1,
  }))
}

