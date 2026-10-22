import { LoaderCircle } from "lucide-react";
import { Brand } from "@/components/app/brand";
import { Button } from "@/components/ui/button";

type Props = {
  title: string;
  description?: string;
  loading?: boolean;
  action?: { label: string; onClick: () => void };
};

export function PageMessage({ title, description, loading, action }: Props) {
  return (
    <div className="flex min-h-dvh flex-col">
      <div className="flex h-12 items-center border-b border-line bg-surface px-4">
        <Brand />
      </div>
      <main className="grid flex-1 place-items-center px-6">
        <div className="flex max-w-sm flex-col items-center gap-3 text-center" role="status">
          {loading && <LoaderCircle className="size-5 animate-spin text-ink-3" aria-hidden />}
          <h1 className="text-[15px] font-semibold">{title}</h1>
          {description && <p className="text-[13px] text-ink-3">{description}</p>}
          {action && (
            <Button onClick={action.onClick} className="mt-1">
              {action.label}
            </Button>
          )}
        </div>
      </main>
    </div>
  );
}
