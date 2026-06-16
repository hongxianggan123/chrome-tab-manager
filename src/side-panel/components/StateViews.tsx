import { AlertCircleIcon, CheckCircle2Icon, FolderOpenIcon } from "lucide-react"
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { Skeleton } from "@/components/ui/skeleton"
import type { EmptyReason } from "@/domain/types"

export function LoadingRows() {
  return (
    <div
      className="flex flex-col gap-2.5 p-3"
      aria-label="正在读取当前标签页"
    >
      {Array.from({ length: 6 }, (_, index) => (
        <div className="flex items-center gap-2.5" key={index}>
          <Skeleton className="size-8 rounded-lg" />
          <div className="flex flex-1 flex-col gap-1.5">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  )
}

export function ErrorView({ message }: { message: string }) {
  return (
    <Alert variant="destructive" className="mt-2.5">
      <AlertCircleIcon />
      <AlertTitle>无法读取标签页</AlertTitle>
      <AlertDescription>{message}</AlertDescription>
    </Alert>
  )
}

export function InlineFeedback({
  kind = "error",
  message,
}: {
  kind?: "error" | "success"
  message: string
}) {
  const Icon = kind === "success" ? CheckCircle2Icon : AlertCircleIcon

  return (
    <Alert className="mt-2.5">
      <Icon />
      <AlertTitle>{kind === "success" ? "操作完成" : "操作未完成"}</AlertTitle>
      <AlertDescription>{message}</AlertDescription>
    </Alert>
  )
}

export function EmptyState({ reason }: { reason: EmptyReason }) {
  const copy = getEmptyCopy(reason)

  return (
    <Empty className="px-5 py-12">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <FolderOpenIcon />
        </EmptyMedia>
        <EmptyTitle>{copy.title}</EmptyTitle>
        <EmptyDescription>{copy.description}</EmptyDescription>
      </EmptyHeader>
    </Empty>
  )
}

function getEmptyCopy(reason: EmptyReason) {
  switch (reason) {
    case "no-normal-tabs":
      return {
        title: "没有可管理的普通窗口标签页",
        description: "打开一个普通 Chrome 窗口后，标签页会显示在这里。",
      }
    case "no-archived-tabs":
      return {
        title: "还没有归档项",
        description: "归档一个普通网页后，它会出现在这里。",
      }
    case "no-search-results":
      return {
        title: "没有匹配的标签页",
        description: "试试搜索域名、标题里的关键词，或清空当前过滤。",
      }
  }
}
