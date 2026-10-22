import { Search } from "lucide-react";
import { useEffect, useRef, useState, type Ref } from "react";
import { Input } from "@/components/ui/input";
import { Kbd } from "@/components/ui/kbd";

const DEBOUNCE_MS = 300;

type Props = {
  /** The committed search, as the URL has it. */
  value: string;
  /** Called once typing settles. */
  onCommit: (q: string, options: { replace: boolean }) => void;
  inputRef?: Ref<HTMLInputElement>;
};

/** Responds to every keystroke, commits to the URL after a pause, and follows Back/Forward. */
export function SearchField({ value, onCommit, inputRef }: Props) {
  const [text, setText] = useState(value);
  // What we last asked the URL to hold, and the URL value we last reconciled with.
  const [pending, setPending] = useState<string | null>(null);
  const [seen, setSeen] = useState(value);
  const timer = useRef<number | undefined>(undefined);

  if (value !== seen) {
    setSeen(value);
    // Our own commit coming back: keep whatever has been typed since.
    if (value !== pending) setText(value);
    setPending(null);
  }

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const commit = (next: string) => {
    window.clearTimeout(timer.current);
    const q = next.trim();
    if (q === value) return;
    setPending(q);
    // Starting a search adds a history entry; refining it replaces that entry.
    onCommit(q, { replace: value !== "" && q !== "" });
  };

  return (
    <div className="relative">
      <Search
        aria-hidden
        className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-ink-3"
      />
      <Input
        ref={inputRef}
        type="search"
        value={text}
        onChange={(event) => {
          const next = event.target.value;
          setText(next);
          window.clearTimeout(timer.current);
          timer.current = window.setTimeout(() => commit(next), DEBOUNCE_MS);
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter") commit(text);
          if (event.key === "Escape" && text) {
            event.preventDefault();
            setText("");
            commit("");
          }
        }}
        placeholder="Search invoices"
        aria-label="Search invoices by number, customer or email"
        maxLength={100}
        className="pr-9 pl-8"
      />
      <Kbd className="pointer-events-none absolute top-1/2 right-2 -translate-y-1/2 max-sm:hidden">
        /
      </Kbd>
    </div>
  );
}
