import Link from "next/link";
import { AlertCircle } from "lucide-react";

export function UnavailableSurface({ title, description, actionHref = "/personal/integrations", actionLabel = "Open Integrations" }: { title: string; description: string; actionHref?: string; actionLabel?: string }) {
  return <div className="flex min-h-full items-center justify-center p-6"><div className="max-w-md rounded-2xl border border-border bg-card p-8 text-center"><AlertCircle className="mx-auto h-8 w-8 text-muted-foreground" /><h1 className="mt-4 text-xl font-bold">{title}</h1><p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p><Link href={actionHref} className="mt-6 inline-flex rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">{actionLabel}</Link></div></div>;
}
