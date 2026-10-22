import { Keyboard } from "lucide-react";
import { Fragment, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Kbd } from "@/components/ui/kbd";
import { Tooltip } from "@/components/ui/tooltip";
import { useHotkey } from "@/hooks/use-hotkey";
import { modKey } from "@/lib/platform";

type Shortcut = { keys: string[]; description: string };
type Group = { title: string; shortcuts: Shortcut[] };

const GROUPS: Record<"list" | "editor", Group[]> = {
  list: [
    {
      title: "Invoices",
      shortcuts: [
        { keys: ["/"], description: "Search invoices" },
        { keys: ["Esc"], description: "Clear the search" },
      ],
    },
  ],
  editor: [
    {
      title: "Editing",
      shortcuts: [
        { keys: [modKey, "S"], description: "Save the invoice" },
        { keys: ["Enter"], description: "Add a line, from the last unit price" },
        { keys: ["Tab"], description: "Next field" },
      ],
    },
  ],
};

const GENERAL: Group = {
  title: "General",
  shortcuts: [
    { keys: ["?"], description: "Show keyboard shortcuts" },
    { keys: ["Esc"], description: "Close a dialog or menu" },
  ],
};

export function ShortcutsButton({ page }: { page: "list" | "editor" }) {
  const [open, setOpen] = useState(false);
  useHotkey("?", () => setOpen(true));
  const groups = [...GROUPS[page], GENERAL];

  return (
    <>
      <Tooltip content="Keyboard shortcuts">
        <Button
          variant="ghost"
          size="icon"
          aria-label="Keyboard shortcuts"
          aria-keyshortcuts="?"
          onClick={() => setOpen(true)}
          className="max-sm:hidden"
        >
          <Keyboard />
        </Button>
      </Tooltip>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent title="Keyboard shortcuts" className="max-w-md">
          <div className="flex flex-col gap-5 px-6 pt-4 pb-6">
            {groups.map((group) => (
              <section key={group.title}>
                <h3 className="mb-2 text-xs font-medium text-ink-3">{group.title}</h3>
                <dl className="flex flex-col divide-y divide-line rounded-md border border-line">
                  {group.shortcuts.map((shortcut) => (
                    <div
                      key={shortcut.description}
                      className="flex items-center justify-between gap-4 px-3 py-2 text-[13px]"
                    >
                      <dt className="text-ink">{shortcut.description}</dt>
                      <dd className="flex shrink-0 items-center gap-1">
                        {shortcut.keys.map((key, i) => (
                          <Fragment key={key}>
                            {i > 0 && <span className="text-xs text-ink-4">+</span>}
                            <Kbd>{key}</Kbd>
                          </Fragment>
                        ))}
                      </dd>
                    </div>
                  ))}
                </dl>
              </section>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
