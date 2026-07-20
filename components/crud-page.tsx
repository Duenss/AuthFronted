"use client";

import { FormEvent, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { Plus, Search, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/dashboard-shell";
import { Badge, Button, Field } from "@/components/ui";

type Column<T> = {
  key: keyof T | string;
  label: string;
  render?: (row: T) => React.ReactNode;
};

type FieldConfig = {
  name: string;
  label: string;
  placeholder?: string;
  type?: string;
};

export function CrudPage<T extends Record<string, any>>({
  title,
  description,
  rows,
  columns,
  fields,
  createLabel,
  onCreate,
  onDelete,
  bulkActions
}: {
  title: string;
  description: string;
  rows: T[];
  columns: Column<T>[];
  fields: FieldConfig[];
  createLabel: string;
  onCreate?: (data: Record<string, FormDataEntryValue>) => Promise<void> | void;
  onDelete?: (row: T) => Promise<void> | void;
  bulkActions?: string[];
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const filtered = useMemo(
    () => rows.filter((row) => JSON.stringify(row).toLowerCase().includes(query.toLowerCase())),
    [rows, query]
  );

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(event.currentTarget).entries());
    await onCreate?.(data);
    toast.success(`${createLabel} procesado`);
    setOpen(false);
  }

  return (
    <>
      <PageHeader
        title={title}
        description={description}
        action={
          <Button onClick={() => setOpen((value) => !value)}>
            <Plus className="h-4 w-4" />
            {createLabel}
          </Button>
        }
      />

      {open ? (
        <section className="card mb-6">
          <h2 className="mb-4 text-lg font-semibold">{createLabel}</h2>
          <form className="grid gap-4 md:grid-cols-2" onSubmit={submit}>
            {fields.map((field) => (
              <Field key={field.name} label={field.label} name={field.name} placeholder={field.placeholder} type={field.type} required />
            ))}
            <div className="flex items-end">
              <Button className="w-full" type="submit">
                Guardar
              </Button>
            </div>
          </form>
        </section>
      ) : null}

      {bulkActions?.length ? (
        <section className="card mb-6">
          <p className="mb-3 text-sm font-medium text-muted-foreground">Acciones Masivas</p>
          <div className="flex flex-wrap gap-2">
            {bulkActions.map((action) => (
              <Button key={action} variant="secondary" onClick={() => toast(`${action} listo para conectar`)}>
                {action}
              </Button>
            ))}
          </div>
        </section>
      ) : null}

      <section className="card">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-lg font-semibold">Registros</h2>
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <input className="input pl-10" placeholder="Buscar..." value={query} onChange={(event) => setQuery(event.target.value)} />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border text-xs uppercase tracking-wider text-muted">
              <tr>
                {columns.map((column) => (
                  <th key={String(column.key)} className="px-3 py-3 font-medium">
                    {column.label}
                  </th>
                ))}
                <th className="px-3 py-3 text-right font-medium">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((row, index) => (
                <tr key={row._id || row.key || row.name || index} className="border-b border-border/50 transition hover:bg-surface-2/50">
                  {columns.map((column) => (
                    <td key={String(column.key)} className="px-3 py-4">
                      {column.render ? column.render(row) : String(row[column.key] ?? "-")}
                    </td>
                  ))}
                  <td className="px-3 py-4 text-right">
                    {onDelete ? (
                      <Button
                        variant="ghost"
                        className="px-2 text-danger"
                        onClick={async () => {
                          await onDelete(row);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    ) : (
                      <Button variant="ghost" className="px-2 text-danger" onClick={() => toast("Accion pendiente de conectar")}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}

export function StatusBadge({ value }: { value?: string }) {
  const normalized = (value || "").toLowerCase();
  const tone = normalized.includes("active") || normalized.includes("unused") ? "success" : normalized.includes("expired") || normalized.includes("paused") ? "warning" : normalized.includes("ban") ? "danger" : "default";
  return <Badge tone={tone}>{value || "unknown"}</Badge>;
}
