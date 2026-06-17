import { describe, expect, it } from "vitest"
import { batchPlanTargetCount, createBatchActionPlan } from "./batch"
import { getDuplicateCleanupTargets } from "./duplicate-cleanup"
import { filterGroups } from "./filters"
import { buildGroups } from "./grouping"
import {
  archivedRecordToItem,
  mergeInventory,
  toTabInstances,
} from "./inventory"
import { normalizeUrl } from "./normalize-url"
import { isSpecialUrl, specialUrlGroupLabel } from "./special-url"
import type { ArchivedTabRecord, TabInstanceSnapshot } from "./types"

const snapshots: TabInstanceSnapshot[] = [
  {
    tabId: 1,
    windowId: 10,
    windowLabel: "W1",
    originalUrl: "https://docs.google.com/document/d/1?tab=t#heading",
    title: "Quarterly roadmap",
    active: false,
    index: 0,
    lastAccessed: 100,
  },
  {
    tabId: 2,
    windowId: 11,
    windowLabel: "W2",
    originalUrl: "https://docs.google.com/document/d/1?tab=t#comments",
    title: "Quarterly roadmap",
    active: true,
    index: 0,
    lastAccessed: 200,
  },
  {
    tabId: 3,
    windowId: 10,
    windowLabel: "W1",
    originalUrl: "https://github.com/org/repo/pull/48",
    title: "Pull request #48",
    audible: true,
    pinned: true,
    active: false,
    index: 1,
    lastAccessed: 150,
  },
]

function archivedRecord(overrides: Partial<ArchivedTabRecord> = {}) {
  return {
    normalizedUrl: "https://example.com/archive",
    originalUrl: "https://example.com/archive#last",
    title: "Archived API notes",
    hostname: "example.com",
    archivedAt: "2026-06-15T00:00:00.000Z",
    archiveCount: 1,
    ...overrides,
  } satisfies ArchivedTabRecord
}

describe("normalizeUrl", () => {
  it("ignores fragments and keeps query strings", () => {
    expect(normalizeUrl("https://example.com/a?x=1#one")).toBe(
      "https://example.com/a?x=1"
    )
    expect(normalizeUrl("https://example.com/a?x=2#one")).toBe(
      "https://example.com/a?x=2"
    )
  })
})

describe("special URL detection", () => {
  it("marks browser and file URLs as special", () => {
    expect(isSpecialUrl("chrome://extensions")).toBe(true)
    expect(isSpecialUrl("file:///Users/emily/a.txt")).toBe(true)
    expect(isSpecialUrl("https://example.com")).toBe(false)
  })

  it("creates stable special URL group labels", () => {
    expect(specialUrlGroupLabel("chrome://extensions")).toBe("chrome")
    expect(specialUrlGroupLabel("file:///Users/emily/a.txt")).toBe("file")
  })
})

describe("inventory", () => {
  it("applies duplicate counts to active tab instances", () => {
    const instances = toTabInstances(snapshots)

    expect(instances[0].duplicateCount).toBe(2)
    expect(instances[1].duplicateCount).toBe(2)
    expect(instances[2].duplicateCount).toBe(1)
  })

  it("does not show archived records when active instances share the URL", () => {
    const instances = toTabInstances(snapshots)
    const inventory = mergeInventory(instances, [
      archivedRecord({
        normalizedUrl: instances[0].normalizedUrl,
        hostname: instances[0].hostname,
      }),
      archivedRecord(),
    ])

    expect(inventory).toHaveLength(4)
    expect(inventory.filter((item) => item.kind === "archived")).toHaveLength(1)
  })
})

describe("grouping", () => {
  it("sorts groups by item count then hostname", () => {
    const instances = toTabInstances(snapshots)
    const inventory = mergeInventory(instances, [
      archivedRecord({
        normalizedUrl: "https://github.com/archived",
        hostname: "github.com",
        archivedAt: "2026-06-16T00:00:00.000Z",
      }),
    ])
    const groups = buildGroups(inventory)

    expect(groups.map((group) => group.label)).toEqual([
      "docs.google.com",
      "github.com",
    ])
  })

  it("keeps active tab ordering stable when last accessed changes", () => {
    const instances = toTabInstances([
      {
        tabId: 1,
        windowId: 10,
        windowLabel: "W1",
        originalUrl: "https://example.com/a",
        title: "Older access first tab",
        active: false,
        index: 0,
        lastAccessed: 100,
      },
      {
        tabId: 2,
        windowId: 10,
        windowLabel: "W1",
        originalUrl: "https://example.com/b",
        title: "Recent access second tab",
        active: true,
        index: 1,
        lastAccessed: 900,
      },
    ])

    const groups = buildGroups(mergeInventory(instances, []))

    expect(groups[0].items.map((item) => item.title)).toEqual([
      "Older access first tab",
      "Recent access second tab",
    ])
  })
})

describe("filterGroups", () => {
  it("filters duplicate active tabs", () => {
    const groups = buildGroups(mergeInventory(toTabInstances(snapshots), []))
    const result = filterGroups(groups, "", "duplicate")

    expect(result.totalCounts.duplicate).toBe(2)
    expect(result.visibleGroups).toHaveLength(1)
    expect(result.visibleGroups[0].items).toHaveLength(2)
  })

  it("searches active and archived items", () => {
    const groups = buildGroups(
      mergeInventory(toTabInstances(snapshots), [archivedRecord()])
    )

    expect(filterGroups(groups, "api", "all").visibleGroups).toHaveLength(1)
    expect(filterGroups(groups, "pull", "all").visibleGroups).toHaveLength(1)
  })

  it("returns no archived empty state for archived filter without archived items", () => {
    const groups = buildGroups(mergeInventory(toTabInstances(snapshots), []))
    const result = filterGroups(groups, "", "archived")

    expect(result.emptyReason).toBe("no-archived-tabs")
  })
})

describe("duplicate cleanup selection", () => {
  it("selects visible duplicate instances except the retained recent instance", () => {
    const groups = buildGroups(mergeInventory(toTabInstances(snapshots), []))

    const targets = getDuplicateCleanupTargets(groups)

    expect(targets.map((item) => item.tabId)).toEqual([1])
  })

  it("keeps the current active instance when access time is unavailable", () => {
    const groups = buildGroups(
      mergeInventory(
        toTabInstances([
          {
            tabId: 1,
            windowId: 10,
            windowLabel: "W1",
            originalUrl: "https://example.com/a",
            title: "First duplicate",
            active: false,
            index: 0,
          },
          {
            tabId: 2,
            windowId: 10,
            windowLabel: "W1",
            originalUrl: "https://example.com/a#two",
            title: "Current duplicate",
            active: true,
            index: 1,
          },
        ]),
        []
      )
    )

    const targets = getDuplicateCleanupTargets(groups)

    expect(targets.map((item) => item.tabId)).toEqual([1])
  })

  it("does not select a duplicate row when its duplicate group is not visible", () => {
    const groups = buildGroups(mergeInventory(toTabInstances(snapshots), []))
    const visibleGroups = [
      {
        ...groups[0],
        items: [groups[0].items[0]],
      },
    ]

    const targets = getDuplicateCleanupTargets(visibleGroups)

    expect(targets).toEqual([])
  })
})

describe("batch action plans", () => {
  it("archives only ordinary active tabs and skips special URLs", () => {
    const special = toTabInstances([
      {
        tabId: 9,
        windowId: 10,
        windowLabel: "W1",
        originalUrl: "chrome://extensions",
        title: "Extensions",
        active: false,
        index: 2,
      },
    ])
    const items = [
      ...toTabInstances(snapshots),
      ...special,
      archivedRecordToItem(archivedRecord()),
    ]
    const plan = createBatchActionPlan("archive", items, 200)

    expect(plan.targetTabIds).toEqual([1, 2, 3])
    expect(plan.skipped.special).toBe(1)
    expect(plan.skipped.archived).toBe(1)
    expect(batchPlanTargetCount(plan)).toBe(3)
  })

  it("deletes only archived records and skips selected active tabs", () => {
    const items = [
      ...toTabInstances(snapshots),
      archivedRecordToItem(archivedRecord()),
    ]
    const plan = createBatchActionPlan("deleteArchive", items)

    expect(plan.targetNormalizedUrls).toEqual(["https://example.com/archive"])
    expect(plan.skipped.active).toBe(3)
    expect(batchPlanTargetCount(plan)).toBe(1)
  })

  it("keeps risky close targets in the plan summary", () => {
    const items = toTabInstances([
      {
        tabId: 4,
        windowId: 10,
        windowLabel: "W1",
        originalUrl: "chrome://extensions",
        title: "Extensions",
        active: false,
        index: 0,
        pinned: true,
        audible: true,
        lastAccessed: 1_000,
      },
    ])
    const plan = createBatchActionPlan("close", items, 2_000)

    expect(plan.targetTabIds).toEqual([4])
    expect(plan.risk).toEqual({
      special: 1,
      audible: 1,
      pinned: 1,
      recent: 1,
    })
  })
})
