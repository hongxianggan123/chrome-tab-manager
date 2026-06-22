type OverlayMessage = {
  type: "duplicatePromptOverlay:show"
  prompt: {
    newTabId: number
    title: string
    hostname: string
    defaultTargetTabId: number
    defaultTargetWindowId: number
    normalizedUrl: string
  }
}

const ROOT_ID = "chrome-tab-manager-duplicate-prompt-root"

chrome.runtime.onMessage.addListener((message: OverlayMessage) => {
  if (message.type !== "duplicatePromptOverlay:show") {
    return
  }

  mountOverlay(message.prompt)
})

function mountOverlay(prompt: OverlayMessage["prompt"]) {
  document.getElementById(ROOT_ID)?.remove()

  const host = document.createElement("div")
  host.id = ROOT_ID
  const shadow = host.attachShadow({ mode: "closed" })
  shadow.innerHTML = renderOverlay(prompt)
  document.documentElement.append(host)

  const jump = shadow.querySelector<HTMLButtonElement>("[data-action='jump']")
  const keep = shadow.querySelector<HTMLButtonElement>("[data-action='keep']")
  const view = shadow.querySelector<HTMLButtonElement>("[data-action='view']")

  jump?.addEventListener("click", () => {
    void chrome.runtime.sendMessage({
      type: "duplicatePrompt:jump",
      promptTabId: prompt.newTabId,
      targetTabId: prompt.defaultTargetTabId,
      targetWindowId: prompt.defaultTargetWindowId,
    })
    host.remove()
  })

  keep?.addEventListener("click", () => {
    void chrome.runtime.sendMessage({
      type: "duplicatePrompt:keep",
      promptTabId: prompt.newTabId,
    })
    host.remove()
  })

  view?.addEventListener("click", () => {
    void chrome.runtime.sendMessage({
      type: "duplicatePrompt:viewDuplicates",
      promptTabId: prompt.newTabId,
      normalizedUrl: prompt.normalizedUrl,
    })
    host.remove()
  })

  startCountdown(host, keep, prompt.newTabId)
}

function startCountdown(
  host: HTMLElement,
  keep: HTMLButtonElement | null,
  promptTabId: number
) {
  const startedAt = Date.now()
  const timer = window.setInterval(() => {
    const remaining = Math.max(
      0,
      30 - Math.floor((Date.now() - startedAt) / 1000)
    )

    if (keep && remaining <= 5) {
      keep.textContent = `保留 ${remaining}`
    }

    if (remaining === 0) {
      window.clearInterval(timer)
      void chrome.runtime.sendMessage({
        type: "duplicatePrompt:dismiss",
        promptTabId,
      })
      host.remove()
    }
  }, 250)
}

function renderOverlay(prompt: OverlayMessage["prompt"]) {
  return `
    <style>
      :host { all: initial; }
      .panel {
        position: fixed;
        top: 16px;
        right: 16px;
        z-index: 2147483647;
        box-sizing: border-box;
        width: min(340px, calc(100vw - 32px));
        border: 1px solid #d7d7d7;
        border-top: 3px solid #b7791f;
        border-radius: 8px;
        background: #ffffff;
        color: #18181b;
        box-shadow: 0 10px 28px rgba(0, 0, 0, 0.16);
        font: 13px/1.4 ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        padding: 10px;
      }
      @media (prefers-reduced-motion: no-preference) {
        .panel { animation: ctm-enter 120ms ease-out; }
        @keyframes ctm-enter {
          from { opacity: 0; transform: translateY(-4px); }
          to { opacity: 1; transform: translateY(0); }
        }
      }
      .title { font-weight: 650; margin: 0 0 3px; }
      .meta {
        margin: 0 0 10px;
        color: #666;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .actions { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 6px; }
      button {
        border: 1px solid #d7d7d7;
        border-radius: 6px;
        background: #fff;
        color: #18181b;
        cursor: pointer;
        font: inherit;
        min-height: 30px;
        padding: 4px 8px;
      }
      button[data-action="jump"] {
        border-color: #b7791f;
        background: #b7791f;
        color: #fff;
      }
      button:focus-visible {
        outline: 2px solid #2563eb;
        outline-offset: 2px;
      }
    </style>
    <section class="panel" role="dialog" aria-label="重复页面提示">
      <p class="title">已打开重复页面</p>
      <p class="meta">${escapeHtml(prompt.title)} · ${escapeHtml(prompt.hostname)}</p>
      <div class="actions">
        <button type="button" data-action="jump">跳转</button>
        <button type="button" data-action="keep">保留</button>
        <button type="button" data-action="view">查看重复</button>
      </div>
    </section>
  `
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (char) => {
    const replacements: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;",
    }
    return replacements[char] ?? char
  })
}
