"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Command } from "cmdk";
import { Dialog } from "radix-ui";
import { PhoneCall, Search, UserRound } from "lucide-react";
import { useDebouncedValue } from "@/features/filters/use-dashboard-filters";
import { useGlobalSearchQuery } from "@/features/search/api/queries";
import { ScoreBadge } from "@/components/dashboard/primitives";

export function GlobalCommandPalette({
  open,
  onOpenChange,
  onSelectCall,
  onSelectAgent,
  placeholder,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectCall?: (callId: string) => void;
  onSelectAgent?: (agentId: string) => void;
  placeholder: string;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const debounced = useDebouncedValue(query, 220);

  const searchQuery = useGlobalSearchQuery(debounced, open);

  // Global Cmd/Ctrl + K keyboard binding
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        onOpenChange(!open);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onOpenChange]);

  const calls = searchQuery.data?.calls ?? [];
  const agents = searchQuery.data?.agents ?? [];

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-[rgba(10,26,63,0.45)] backdrop-blur-[1px]" />
        <Dialog.Content
          aria-describedby={undefined}
          className="fixed left-1/2 top-[14vh] z-50 w-[min(92vw,600px)] -translate-x-1/2 z-panel overflow-hidden outline-none"
        >
          <Dialog.Title className="sr-only">Global Workspace Search</Dialog.Title>
          <Command shouldFilter={false} className="flex flex-col">
            <div className="flex items-center gap-2.5 border-b border-[var(--z-border)] px-4 py-3">
              <Search className="h-4 w-4 text-[var(--z-ink-muted)] shrink-0" aria-hidden="true" />
              <Command.Input
                autoFocus
                value={query}
                onValueChange={setQuery}
                placeholder={placeholder}
                className="w-full bg-transparent text-[13.5px] text-[var(--z-ink)] placeholder:text-[var(--z-ink-muted)] outline-none"
              />
              <kbd className="rounded-[6px] border border-[var(--z-border)] bg-[var(--z-surface-muted)] px-1.5 py-0.5 text-[10.5px] font-semibold text-[var(--z-ink-muted)]">
                ESC
              </kbd>
            </div>

            <Command.List className="max-h-[360px] overflow-y-auto p-2 space-y-2">
              {searchQuery.isPending ? (
                <div className="px-3 py-6 text-center text-[12.5px] text-[var(--z-ink-muted)]">
                  Searching workspace records…
                </div>
              ) : searchQuery.isError ? (
                <div className="px-3 py-6 text-center text-[12.5px] text-[var(--z-fail)]">
                  {searchQuery.error instanceof Error
                    ? searchQuery.error.message
                    : "Search unavailable."}
                </div>
              ) : calls.length === 0 && agents.length === 0 ? (
                <Command.Empty className="px-3 py-8 text-center text-[12.5px] text-[var(--z-ink-muted)]">
                  No matching calls or agents in this workspace.
                </Command.Empty>
              ) : null}

              {calls.length > 0 ? (
                <Command.Group
                  heading="Calls"
                  className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1 [&_[cmdk-group-heading]]:text-[11px] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group-heading]]:text-[var(--z-ink-muted)]"
                >
                  {calls.map((c) => (
                    <Command.Item
                      key={c.id}
                      value={`call-${c.id}`}
                      onSelect={() => {
                        onOpenChange(false);
                        if (onSelectCall) {
                          onSelectCall(c.id);
                        } else {
                          router.push(`/upload/score/${c.id}`);
                        }
                      }}
                      className="flex items-center justify-between gap-3 rounded-[var(--z-radius-control)] px-2.5 py-2 text-[13px] cursor-pointer aria-selected:bg-[var(--z-accent-tint)]"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <PhoneCall className="h-4 w-4 shrink-0 text-[var(--z-ink-muted)]" />
                        <div className="min-w-0">
                          <div className="font-medium text-[var(--z-ink)] truncate">
                            {c.title}
                          </div>
                          <div className="text-[11.5px] text-[var(--z-ink-muted)] truncate">
                            {c.agentName}
                          </div>
                        </div>
                      </div>
                      <ScoreBadge score={c.overallScore} />
                    </Command.Item>
                  ))}
                </Command.Group>
              ) : null}

              {agents.length > 0 ? (
                <Command.Group
                  heading="Agents"
                  className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1 [&_[cmdk-group-heading]]:text-[11px] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group-heading]]:text-[var(--z-ink-muted)]"
                >
                  {agents.map((a) => (
                    <Command.Item
                      key={a.id}
                      value={`agent-${a.id}`}
                      onSelect={() => {
                        onOpenChange(false);
                        if (onSelectAgent) {
                          onSelectAgent(a.id);
                        } else {
                          router.push(`/dashboard?agentId=${encodeURIComponent(a.id)}`);
                        }
                      }}
                      className="flex items-center gap-2.5 rounded-[var(--z-radius-control)] px-2.5 py-2 text-[13px] text-[var(--z-ink)] cursor-pointer aria-selected:bg-[var(--z-accent-tint)]"
                    >
                      <UserRound className="h-4 w-4 text-[var(--z-ink-muted)]" />
                      <span className="font-medium truncate">{a.name}</span>
                    </Command.Item>
                  ))}
                </Command.Group>
              ) : null}
            </Command.List>
          </Command>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

