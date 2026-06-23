/**
 * @file data-table.tsx
 * @description A fully-featured, composable data table built on TanStack Table v8
 * and shadcn/ui primitives. Import only what you need - every sub-component is
 * exported individually so you can assemble your own table layout if the default
 * `<DataTable />` wrapper doesn't fit your use-case.
 *
 * @requires @tanstack/react-table   npm install @tanstack/react-table
 * @requires lucide-react            npm install lucide-react
 * @requires shadcn/ui components    Table, Button, Checkbox, Input, Select,
 *                                   DropdownMenu, Badge
 *
 * @example Basic usage
 * ```tsx
 * import { DataTable, getSelectColumn, DataTableColumnHeader } from "@/components/ui/data-table"
 *
 * const columns: ColumnDef<Payment>[] = [
 *   getSelectColumn(),
 *   {
 *     accessorKey: "email",
 *     header: ({ column }) => <DataTableColumnHeader column={column} title="Email" />,
 *   },
 * ]
 *
 * <DataTable columns={columns} data={payments} filterColumn="email" />
 * ```
 */

"use client";

import type {
  Column,
  ColumnDef,
  ColumnFiltersState,
  ColumnOrderState,
  ColumnPinningState,
  ColumnResizeMode,
  ColumnSizingState,
  ExpandedState,
  FilterFn,
  GroupingState,
  Row,
  RowPinningState,
  SortingState,
  Table as TanstackTable,
  VisibilityState,
} from "@tanstack/react-table";
import {
  flexRender,
  getCoreRowModel,
  getExpandedRowModel,
  getFacetedMinMaxValues,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getFilteredRowModel,
  getGroupedRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Bookmark,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronRight as ChevronRightSmall,
  ChevronsLeft,
  ChevronsRight,
  EyeOff,
  GripVertical,
  Pin,
  PinOff,
  Save,
  Search,
  Settings2,
  Trash2,
  X,
} from "lucide-react";
import * as React from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useDebounce } from "@/hooks/use-debounce";
import { useIsomorphicLayoutEffect } from "@/hooks/use-isomorphic-layout-effect";
import { useUndoToast } from "@/hooks/use-undo-toast";
import { cn } from "@/lib/utils";

// ─────────────────────────────────────────────────────────────────────────────
// Custom filter functions (re-exportable for use in column defs)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * A fuzzy / "contains" filter function for string columns.
 * Pass `filterFn: "fuzzy"` in your column def to use it, then register it
 * on the table via `filterFns: { fuzzy: fuzzyFilter }`.
 *
 * @example
 * ```ts
 * { accessorKey: "name", filterFn: "fuzzy" }
 * ```
 */
export const fuzzyFilter: FilterFn<unknown> = (row, columnId, value) => {
  const cellValue = String(row.getValue(columnId) ?? "").toLowerCase();
  return cellValue.includes(String(value).toLowerCase());
};

/**
 * An array-inclusion filter function. Useful for faceted / multi-select
 * filters where the filter value is an array of allowed values.
 *
 * @example
 * ```ts
 * { accessorKey: "status", filterFn: "arrIncludesSome" }
 * ```
 */
export const arrIncludesSomeFilter: FilterFn<unknown> = (row, columnId, value: string[]) => {
  if (!value?.length) return true;
  return value.includes(String(row.getValue(columnId)));
};

// ─────────────────────────────────────────────────────────────────────────────
// DataTableProps
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Props for the top-level `<DataTable />` component.
 *
 * @template TData  The shape of each data row.
 * @template TValue The value type returned by column accessors.
 */
type DataTableColumnAlignment = "left" | "center" | "right";

function normalizeColumnLabel(value: string) {
  return value
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .toLowerCase();
}

function getColumnAlignment<TData, TValue>(column: Column<TData, TValue>): DataTableColumnAlignment {
  const header = column.columnDef.header;
  const labelSource = typeof header === "string" ? header : column.id;
  const label = normalizeColumnLabel(labelSource);

  if (/\b(actions?|tools?)\b/.test(label)) return "right";
  if (/\b(status|state|active|available|confirmed|finalized|selected|enabled)\b/.test(label)) return "center";
  if (
    /\b(amount|total|balance|cost|price|debit|credit|due|paid|payment|rate|percent|percentage|qty|quantity|units?)\b/.test(
      label
    )
  )
    return "right";
  if (/\b(id|ids|record|number|no|#)\b/.test(label)) return "right";

  return "left";
}

function getColumnAlignmentClass(alignment: DataTableColumnAlignment) {
  if (alignment === "right") return "text-right tabular-nums";
  if (alignment === "center") return "text-center";
  return undefined;
}

export interface DataTableMobileCardField<TData> {
  key: Extract<keyof TData, string> | string;
  label: string;
  render?: (row: TData) => React.ReactNode;
}

export interface DataTableProps<TData, TValue> {
  // ── Data ──────────────────────────────────────────────────────────────────

  /** Column definitions array. Build with `ColumnDef<TData, TValue>[]`. */
  columns: ColumnDef<TData, TValue>[];

  /** The dataset to render. */
  data: TData[];

  // ── Filtering ─────────────────────────────────────────────────────────────

  /**
   * Column `id` (or `accessorKey`) to expose as a quick filter input in the
   * toolbar. Omit to hide the filter input entirely.
   * @example "email"
   */
  filterColumn?: string;

  /** Placeholder text shown in the quick filter input. @default "Filter..." */
  filterPlaceholder?: string;

  /**
   * When `true`, a global search input is shown that filters across ALL
   * columns simultaneously. If `filterColumn` is also set, both controls
   * are rendered. @default false
   */
  enableGlobalFilter?: boolean;

  /** Placeholder text for the global search input. @default "Search..." */
  globalFilterPlaceholder?: string;

  // ── Sorting ───────────────────────────────────────────────────────────────

  /**
   * Allow multiple columns to be sorted at the same time (hold Shift to
   * add a secondary sort). @default false
   */
  enableMultiSort?: boolean;

  // ── Pagination ────────────────────────────────────────────────────────────

  /** Show pagination controls at the bottom of the table. @default true */
  showPagination?: boolean;

  /**
   * Available page-size choices rendered in the "Rows per page" dropdown.
   * @default [10, 20, 30, 50]
   */
  pageSizeOptions?: number[];

  /**
   * Initial number of rows per page. Must be a value present in
   * `pageSizeOptions` (or at least a positive integer). @default 10
   */
  initialPageSize?: number;

  /**
   * Controlled pagination state. Use this with `manualPagination` when the
   * selected rows-per-page value must drive API request parameters.
   */
  paginationState?: { pageIndex: number; pageSize: number };

  // ── Row selection ─────────────────────────────────────────────────────────

  /**
   * Show the "N of M row(s) selected" count in the pagination bar.
   * Requires at least one column using `getSelectColumn()`. @default true
   */
  showSelectionCount?: boolean;

  /**
   * Callback fired whenever the set of selected rows changes.
   *
   * @param rows The currently selected `Row<TData>` objects.
   */
  onRowSelectionChange?: (rows: Row<TData>[]) => void;

  /**
   * Callback fired when a non-interactive area of a row is double-clicked.
   * Use this for Access-style grids where double-click opens row detail.
   */
  onRowDoubleClick?: (row: Row<TData>) => void;

  // ── Row expansion ─────────────────────────────────────────────────────────

  /**
   * Render function for the expanded sub-row content. When provided,
   * an expand/collapse chevron is prepended to every row.
   *
   * @example
   * ```tsx
   * renderSubComponent={({ row }) => (
   *   <pre>{JSON.stringify(row.original, null, 2)}</pre>
   * )}
   * ```
   */
  renderSubComponent?: (props: { row: Row<TData> }) => React.ReactNode;

  /**
   * Optional mobile-first row renderer. When provided, screens below `lg`
   * render these cards instead of the dense table while `lg+` keeps the table.
   */
  renderMobileCard?: (props: { row: Row<TData> }) => React.ReactNode;

  /**
   * Declarative mobile card fields. When provided without `renderMobileCard`,
   * screens below `md` render compact stacked cards instead of the dense table.
   */
  mobileCardFields?: DataTableMobileCardField<TData>[];

  /** Optional title renderer for declarative mobile cards. */
  mobileCardTitle?: (row: TData) => React.ReactNode;

  /** Optional subtitle renderer for declarative mobile cards. */
  mobileCardSubtitle?: (row: TData) => React.ReactNode;

  /** Optional action area renderer for declarative mobile cards. */
  mobileCardActions?: (props: { row: Row<TData> }) => React.ReactNode;

  // ── Row pinning ───────────────────────────────────────────────────────────

  /**
   * Enable row pinning. When `true`, rows can be pinned to the top or
   * bottom of the table via the context menu on each row (not shown by
   * default - wire it up in a custom actions column).
   * You can also pin rows programmatically via the exposed `table` ref.
   * @default false
   */
  enableRowPinning?: boolean;

  // ── Column visibility ─────────────────────────────────────────────────────

  /** Show the "View" column-visibility toggle in the toolbar. @default true */
  showColumnToggle?: boolean;

  /**
   * Extra content rendered at the start of the toolbar, before the filter
   * input and View button. Use this to co-locate a page-level search (e.g.
   * an API-driven input) with the View toggle so they always share one row.
   */
  toolbarStart?: React.ReactNode;

  /** Controlled server/API search text rendered in the toolbar. */
  searchValue?: string;

  /** Callback for the controlled server/API search box. */
  onSearchChange?: (value: string) => void;

  /** Placeholder text for the controlled server/API search box. */
  searchPlaceholder?: string;

  /** Debounce delay for the controlled server/API search box. @default 300 */
  searchDebounceMs?: number;

  /** Custom filter controls rendered in the toolbar. */
  filters?: React.ReactNode;

  /** Custom action controls rendered at the end of the toolbar. */
  toolbarActions?: React.ReactNode;

  /** Additional end-aligned toolbar content. */
  toolbarEnd?: React.ReactNode;

  /** Additional CSS class names applied to the toolbar wrapper. */
  toolbarClassName?: string;

  // ── Column resizing ───────────────────────────────────────────────────────

  /**
   * Show a drag handle on the right edge of each header cell to resize
   * column widths. @default true
   */
  enableColumnResizing?: boolean;

  /**
   * Controls when the column width state is updated during a drag.
   * - `"onChange"` - updates live as the user drags (smooth but more renders).
   * - `"onEnd"`    - updates only when the drag is released (fewer renders).
   * @default "onChange"
   */
  columnResizeMode?: ColumnResizeMode;

  /**
   * Controls how resizing one column affects the others.
   * - `"isolated"` (default) — only the dragged column changes width; the table
   *   grows wider and a horizontal scrollbar appears if needed. Behaves like Excel.
   * - `"linked"` — the table stays at container width; adjacent columns absorb
   *   the delta so the total width never changes.
   * @default "isolated"
   */
  columnResizeBehavior?: "isolated" | "linked";

  // ── Column pinning ────────────────────────────────────────────────────────

  /**
   * Enable column pinning. Columns can be pinned left or right via the
   * column header dropdown. @default false
   */
  enableColumnPinning?: boolean;

  /**
   * Initial pinning state. Pinned columns are rendered with a sticky
   * background so they stay visible during horizontal scroll.
   *
   * @example { left: ["select", "id"], right: ["actions"] }
   */
  initialColumnPinning?: ColumnPinningState;

  // ── Column ordering ───────────────────────────────────────────────────────

  /**
   * Show a `GripVertical` drag handle on each header cell. Dragging it
   * reorders columns via TanStack's `columnOrder` state.
   * Works alongside `enableColumnPinning` - pinned columns remain in place.
   * @default false
   */
  enableColumnOrdering?: boolean;

  /**
   * Initial column order. Provide an array of column `id`s in the desired
   * render order. Unspecified columns are appended in their definition order.
   */
  initialColumnOrder?: ColumnOrderState;

  // ── Row grouping ──────────────────────────────────────────────────────────

  /**
   * Column `id`s to group rows by. Grouped rows can be expanded/collapsed.
   * Requires the relevant columns to have `enableGrouping: true`.
   */
  grouping?: GroupingState;

  // ── Display variants ──────────────────────────────────────────────────────

  /**
   * Visual density of table rows.
   * - `"default"` - standard row height.
   * - `"compact"`  - tighter padding for dense data.
   * - `"relaxed"`  - more breathing room, easier to scan.
   * @default "default"
   */
  density?: "default" | "compact" | "relaxed";

  /** Render alternating row background colours (zebra stripes). @default false */
  striped?: boolean;

  /** Render borders between every cell. @default false */
  bordered?: boolean;

  /**
   * Text to render inside the table body when `data` is empty.
   * @default "Empty results."
   */
  emptyMessage?: string;

  /**
   * Rich empty state rendered inside the table body when `data` is empty.
   * When omitted, `emptyMessage` is used.
   */
  emptyState?: React.ReactNode;

  /**
   * When `true`, the table body shows a skeleton loading state instead of
   * rows. Use while fetching data server-side. @default false
   */
  loading?: boolean;

  /**
   * Number of skeleton rows to display while `loading` is `true`.
   * @default 5
   */
  loadingRowCount?: number;

  /**
   * When `true`, the table body shows an error row instead of empty content.
   * Use this for failed API-backed lists.
   * @default false
   */
  error?: boolean;

  /**
   * Text to render inside the error row when `error` is true.
   * @default "Unable to load records."
   */
  errorMessage?: string;

  // ── Server-side (manual) mode ─────────────────────────────────────────────

  /**
   * When `true`, sorting is handled externally (e.g. API call). The table
   * will NOT sort rows itself - instead use `onSortingChange` to trigger
   * your own fetch. @default false
   */
  manualSorting?: boolean;

  /**
   * When `true`, filtering is handled externally. The table will NOT filter
   * rows itself. Use `onColumnFiltersChange` / `onGlobalFilterChange` to
   * trigger your own fetch. @default false
   */
  manualFiltering?: boolean;

  /**
   * When `true`, pagination is handled externally. You must also supply
   * `rowCount` so the table knows how many total rows exist.
   * Use `onPaginationChange` to trigger your own fetch. @default false
   */
  manualPagination?: boolean;

  /**
   * Total number of rows in the dataset (used for server-side pagination).
   * Ignored unless `manualPagination` is `true`.
   */
  rowCount?: number;

  /**
   * Callback fired when sorting state changes. Useful in server-side mode
   * to trigger a new fetch with the updated sort parameters.
   */
  onSortingChange?: (sorting: SortingState) => void;

  /**
   * Callback fired when column filter state changes. Useful in server-side
   * mode to trigger a new fetch with the updated filter parameters.
   */
  onColumnFiltersChange?: (filters: ColumnFiltersState) => void;

  /**
   * Callback fired when the global filter string changes.
   */
  onGlobalFilterChange?: (value: string) => void;

  /**
   * Callback fired when pagination state changes (page index or page size).
   * Useful in server-side mode. Receives `{ pageIndex, pageSize }`.
   */
  onPaginationChange?: (pagination: { pageIndex: number; pageSize: number }) => void;

  /**
   * Renders a bulk action bar when one or more rows are selected.
   */
  bulkActions?: (rows: Row<TData>[]) => React.ReactNode;

  /**
   * localStorage key used to persist sorting, filters, visibility, and page size.
   */
  persistedStateKey?: string;

  /**
   * Show a named local filter preset menu. Defaults to true when
   * `persistedStateKey` is provided.
   */
  enableFilterPresets?: boolean;

  // ── Misc ──────────────────────────────────────────────────────────────────

  /** Additional CSS class names applied to the outermost wrapper `<div>`. */
  className?: string;
}

function getMobileCardValue<TData>(row: TData, key: string) {
  if (typeof row !== "object" || row === null) return undefined;
  return (row as Record<string, unknown>)[key];
}

function renderMobileCardValue(value: unknown): React.ReactNode {
  if (value == null || value === "") return "-";
  if (React.isValidElement(value)) return value;
  if (value instanceof Date) return value.toLocaleDateString();
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "string" || typeof value === "number" || typeof value === "bigint") return String(value);
  return String(value);
}

interface PersistedTableState {
  sorting?: SortingState;
  columnFilters?: ColumnFiltersState;
  columnVisibility?: VisibilityState;
  globalFilter?: string;
  searchValue?: string;
  pageSize?: number;
}

interface PersistedTablePreset {
  id: string;
  name: string;
  state: PersistedTableState;
  savedAt: number;
}

function readPersistedTableState(key?: string): PersistedTableState {
  if (!key || typeof window === "undefined") return {};
  try {
    const parsed = JSON.parse(window.localStorage.getItem(key) ?? "{}");
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function presetStorageKey(key: string) {
  return `nds:data-table-presets:${key}`;
}

function readPersistedTablePresets(key?: string): PersistedTablePreset[] {
  if (!key || typeof window === "undefined") return [];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(presetStorageKey(key)) ?? "[]");
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (preset): preset is PersistedTablePreset =>
          preset &&
          typeof preset === "object" &&
          typeof preset.id === "string" &&
          typeof preset.name === "string" &&
          preset.state &&
          typeof preset.state === "object" &&
          typeof preset.savedAt === "number"
      )
      .sort((a, b) => b.savedAt - a.savedAt);
  } catch {
    return [];
  }
}

function writePersistedTablePresets(key: string | undefined, presets: PersistedTablePreset[]) {
  if (!key || typeof window === "undefined") return;
  window.localStorage.setItem(presetStorageKey(key), JSON.stringify(presets.slice(0, 12)));
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. DataTableColumnHeader
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Props for `<DataTableColumnHeader />`.
 * @template TData  Row data type.
 * @template TValue Accessor value type.
 */
interface DataTableColumnHeaderProps<TData, TValue> extends React.HTMLAttributes<HTMLDivElement> {
  /** The TanStack `Column` instance for this header. */
  column: Column<TData, TValue>;
  /** Human-readable column label displayed in the header. */
  title: string;
}

/**
 * A column header button that exposes sorting (asc / desc / clear) and
 * hiding actions via a dropdown menu. Also displays a pin toggle when
 * column pinning is enabled on the table.
 *
 * Renders a plain `<div>` with just the title when neither sorting nor
 * hiding is available for the column.
 *
 * @example
 * ```tsx
 * {
 *   accessorKey: "email",
 *   header: ({ column }) => (
 *     <DataTableColumnHeader column={column} title="Email" />
 *   ),
 * }
 * ```
 */
export function DataTableColumnHeader<TData, TValue>({
  column,
  title,
  className,
}: DataTableColumnHeaderProps<TData, TValue>) {
  const canSort = column.getCanSort();
  const canHide = column.getCanHide();
  const canPin = column.getCanPin();

  if (!canSort && !canHide && !canPin) {
    return <div className={cn(className)}>{title}</div>;
  }

  const sorted = column.getIsSorted();
  const pinned = column.getIsPinned();

  return (
    <div className={cn("flex items-center gap-1", className)}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="data-[state=open]:bg-accent -ml-3 h-8">
            <span>{title}</span>
            {sorted === "desc" ? (
              <ArrowDown className="ml-2 h-4 w-4" />
            ) : sorted === "asc" ? (
              <ArrowUp className="ml-2 h-4 w-4" />
            ) : (
              <ArrowUpDown className="ml-2 h-4 w-4 opacity-50" />
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          {canSort && (
            <>
              <DropdownMenuItem onClick={() => column.toggleSorting(false)}>
                <ArrowUp className="text-muted-foreground/70 mr-2 h-3.5 w-3.5" />
                Asc
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => column.toggleSorting(true)}>
                <ArrowDown className="text-muted-foreground/70 mr-2 h-3.5 w-3.5" />
                Desc
              </DropdownMenuItem>
              {sorted && (
                <DropdownMenuItem onClick={() => column.clearSorting()}>
                  <X className="text-muted-foreground/70 mr-2 h-3.5 w-3.5" />
                  Clear sort
                </DropdownMenuItem>
              )}
              {(canHide || canPin) && <DropdownMenuSeparator />}
            </>
          )}
          {canPin && (
            <>
              {pinned !== "left" && (
                <DropdownMenuItem onClick={() => column.pin("left")}>
                  <Pin className="text-muted-foreground/70 mr-2 h-3.5 w-3.5" />
                  Pin left
                </DropdownMenuItem>
              )}
              {pinned !== "right" && (
                <DropdownMenuItem onClick={() => column.pin("right")}>
                  <Pin className="text-muted-foreground/70 mr-2 h-3.5 w-3.5 rotate-90" />
                  Pin right
                </DropdownMenuItem>
              )}
              {pinned && (
                <DropdownMenuItem onClick={() => column.pin(false)}>
                  <PinOff className="text-muted-foreground/70 mr-2 h-3.5 w-3.5" />
                  Unpin
                </DropdownMenuItem>
              )}
              {canHide && <DropdownMenuSeparator />}
            </>
          )}
          {canHide && (
            <DropdownMenuItem onClick={() => column.toggleVisibility(false)}>
              <EyeOff className="text-muted-foreground/70 mr-2 h-3.5 w-3.5" />
              Hide
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. DataTableViewOptions
// ─────────────────────────────────────────────────────────────────────────────

/** Props for `<DataTableViewOptions />`. */
interface DataTableViewOptionsProps<TData> {
  /** The TanStack table instance. */
  table: TanstackTable<TData>;
}

/**
 * A toolbar dropdown that lets users toggle the visibility of each column.
 * Only shows columns whose `accessorFn` is defined (i.e. data columns) and
 * that have `enableHiding` set to `true` (the default).
 *
 * @example
 * ```tsx
 * <DataTableViewOptions table={table} />
 * ```
 */
export function DataTableViewOptions<TData>({ table }: DataTableViewOptionsProps<TData>) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="ml-auto flex h-8">
          <Settings2 className="mr-2 h-4 w-4" />
          View
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[160px]">
        <DropdownMenuLabel>Toggle columns</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {table
          .getAllColumns()
          .filter(col => typeof col.accessorFn !== "undefined" && col.getCanHide())
          .map((col, index) => (
            <DropdownMenuCheckboxItem
              key={index}
              className="capitalize"
              checked={col.getIsVisible()}
              onCheckedChange={value => col.toggleVisibility(!!value)}
            >
              {col.id}
            </DropdownMenuCheckboxItem>
          ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. DataTablePagination
// ─────────────────────────────────────────────────────────────────────────────

/** Props for `<DataTablePagination />`. */
interface DataTablePaginationProps<TData> {
  /** The TanStack table instance. */
  table: TanstackTable<TData>;
  /**
   * Available page-size options in the "Rows per page" dropdown.
   * @default [10, 20, 30, 50]
   */
  pageSizeOptions?: number[];
  /**
   * Show the "N of M row(s) selected" count on the left side.
   * @default true
   */
  showSelectionCount?: boolean;
}

/**
 * A fully-featured pagination bar including:
 * - "N of M row(s) selected" count (optional)
 * - "Rows per page" dropdown
 * - Current page / total pages indicator
 * - First, previous, next, last page buttons
 *
 * @example
 * ```tsx
 * <DataTablePagination table={table} pageSizeOptions={[5, 10, 25]} />
 * ```
 */
export function DataTablePagination<TData>({
  table,
  pageSizeOptions = [10, 20, 30, 50],
  showSelectionCount = true,
}: DataTablePaginationProps<TData>) {
  return (
    <div className="flex flex-col gap-3 px-2 py-4 sm:flex-row sm:items-center sm:justify-between">
      {showSelectionCount ? (
        <div className="text-muted-foreground min-w-0 flex-1 text-sm">
          {table.getFilteredSelectedRowModel().rows.length} of {table.getFilteredRowModel().rows.length} row(s)
          selected.
        </div>
      ) : (
        <div className="flex-1" />
      )}

      <div className="flex flex-wrap items-center gap-3 sm:justify-end lg:gap-8">
        {/* Page size */}
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium">Rows per page</p>
          <Select
            value={`${table.getState().pagination.pageSize}`}
            onValueChange={value => table.setPageSize(Number(value))}
          >
            <SelectTrigger className="h-8 w-[70px]">
              <SelectValue placeholder={table.getState().pagination.pageSize} />
            </SelectTrigger>
            <SelectContent side="top">
              {pageSizeOptions.map((size, index) => (
                <SelectItem key={index} value={`${size}`}>
                  {size}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Page indicator */}
        <div className="flex min-w-[96px] items-center justify-center text-sm font-medium">
          Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
        </div>

        {/* Navigation buttons */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            className="hidden h-8 w-8 p-0 lg:flex"
            onClick={() => table.setPageIndex(0)}
            disabled={!table.getCanPreviousPage()}
            aria-label="Go to first page"
          >
            <ChevronsLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            className="h-8 w-8 p-0"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
            aria-label="Go to previous page"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            className="h-8 w-8 p-0"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
            aria-label="Go to next page"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            className="hidden h-8 w-8 p-0 lg:flex"
            onClick={() => table.setPageIndex(table.getPageCount() - 1)}
            disabled={!table.getCanNextPage()}
            aria-label="Go to last page"
          >
            <ChevronsRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. DataTableFacetedFilter
// ─────────────────────────────────────────────────────────────────────────────

/** A single option displayed inside `<DataTableFacetedFilter />`. */
export interface FacetedFilterOption {
  /** The raw value to match against the column's cell values. */
  value: string;
  /** Human-readable label shown in the dropdown. */
  label: string;
  /** Optional icon rendered to the left of the label. */
  icon?: React.ComponentType<{ className?: string }>;
}

/** Props for `<DataTableFacetedFilter />`. */
interface DataTableFacetedFilterProps<TData, TValue> {
  /** The TanStack `Column` to filter. */
  column?: Column<TData, TValue>;
  /** Label shown on the filter trigger button. */
  title?: string;
  /** The list of selectable filter options. */
  options: FacetedFilterOption[];
}

/**
 * A multi-select filter dropdown that shows unique value counts next to each
 * option (powered by TanStack's faceted row model). Active filters are shown
 * as `<Badge />` pills on the trigger button. Clearing all selections removes
 * the filter entirely.
 *
 * Requires `getFacetedRowModel()` and `getFacetedUniqueValues()` on the table.
 *
 * @example
 * ```tsx
 * <DataTableFacetedFilter
 *   column={table.getColumn("status")}
 *   title="Status"
 *   options={[
 *     { value: "pending",    label: "Pending" },
 *     { value: "processing", label: "Processing" },
 *     { value: "success",    label: "Success" },
 *     { value: "failed",     label: "Failed" },
 *   ]}
 * />
 * ```
 */
export function DataTableFacetedFilter<TData, TValue>({
  column,
  title,
  options,
}: DataTableFacetedFilterProps<TData, TValue>) {
  const facets = column?.getFacetedUniqueValues();
  const selectedValues = new Set((column?.getFilterValue() as string[]) ?? []);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 border-dashed">
          <Search className="mr-2 h-4 w-4" />
          {title}
          {selectedValues.size > 0 && (
            <>
              <span className="text-muted-foreground mx-1">|</span>
              {selectedValues.size > 2 ? (
                <Badge variant="secondary" className="rounded-sm px-1 font-normal">
                  {selectedValues.size} selected
                </Badge>
              ) : (
                Array.from(selectedValues).map((val, index) => (
                  <Badge key={index} variant="secondary" className="rounded-sm px-1 font-normal">
                    {options.find(o => o.value === val)?.label ?? val}
                  </Badge>
                ))
              )}
            </>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-[200px]" align="start">
        <DropdownMenuLabel>{title}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {options.map((option, index) => {
          const isSelected = selectedValues.has(option.value);
          return (
            <DropdownMenuCheckboxItem
              key={index}
              checked={isSelected}
              onCheckedChange={checked => {
                if (checked) {
                  selectedValues.add(option.value);
                } else {
                  selectedValues.delete(option.value);
                }
                const filterValues = Array.from(selectedValues);
                column?.setFilterValue(filterValues.length ? filterValues : undefined);
              }}
            >
              {option.icon && <option.icon className="text-muted-foreground mr-2 h-4 w-4" />}
              {option.label}
              {facets?.get(option.value) !== undefined && (
                <span className="text-muted-foreground ml-auto text-xs">{facets.get(option.value)}</span>
              )}
            </DropdownMenuCheckboxItem>
          );
        })}
        {selectedValues.size > 0 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="justify-center text-center text-sm"
              onClick={() => column?.setFilterValue(undefined)}
            >
              Clear filters
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. DataTableActiveFilters
// ─────────────────────────────────────────────────────────────────────────────

/** Props for `<DataTableActiveFilters />`. */
interface DataTableActiveFiltersProps<TData> {
  /** The TanStack table instance. */
  table: TanstackTable<TData>;
}

/**
 * Renders the currently active column filters as dismissible `<Badge />` pills.
 * Includes a "Reset all" button when more than one filter is active.
 * Renders nothing when Empty filters are active.
 *
 * @example
 * ```tsx
 * <DataTableActiveFilters table={table} />
 * ```
 */
export function DataTableActiveFilters<TData>({ table }: DataTableActiveFiltersProps<TData>) {
  const filters = table.getState().columnFilters;
  if (!filters.length) return null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {filters.map(filter => {
        const values = Array.isArray(filter.value) ? (filter.value as string[]) : [String(filter.value)];
        return values.map((val, index) => (
          <Badge key={index} variant="secondary" className="flex items-center gap-1 rounded-sm font-normal">
            <span className="text-muted-foreground capitalize">{filter.id}:</span> {val}
            <button
              onClick={() => {
                const col = table.getColumn(filter.id);
                if (Array.isArray(filter.value)) {
                  const next = (filter.value as string[]).filter(v => v !== val);
                  col?.setFilterValue(next.length ? next : undefined);
                } else {
                  col?.setFilterValue(undefined);
                }
              }}
              className="hover:text-foreground ml-1 rounded-full outline-none"
              aria-label={`Remove filter ${filter.id}: ${val}`}
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </Badge>
        ));
      })}
      {filters.length > 1 && (
        <Button variant="ghost" size="sm" className="h-8 px-2 text-xs" onClick={() => table.resetColumnFilters()}>
          Reset all
        </Button>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. getSelectColumn
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns a pre-built checkbox `ColumnDef` for row selection. Place it as the
 * first element in your `columns` array.
 *
 * - The header checkbox selects / deselects all rows on the current page.
 * - Individual checkboxes select / deselect their respective rows.
 * - Sorting and hiding are disabled for this column.
 *
 * @template TData Row data type.
 *
 * @example
 * ```ts
 * const columns: ColumnDef<Payment>[] = [
 *   getSelectColumn<Payment>(),
 *   { accessorKey: "email", ... },
 * ]
 * ```
 */
export function getSelectColumn<TData>(): ColumnDef<TData> {
  return {
    id: "select",
    size: 40,
    minSize: 40,
    maxSize: 40,
    header: ({ table }) => (
      <Checkbox
        checked={table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && "indeterminate")}
        onCheckedChange={value => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Select all rows on this page"
        className="translate-y-[2px]"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={value => row.toggleSelected(!!value)}
        aria-label="Select row"
        className="translate-y-[2px]"
        disabled={!row.getCanSelect()}
      />
    ),
    enableSorting: false,
    enableHiding: false,
    enableResizing: false,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 7. DataTableSkeleton
// ─────────────────────────────────────────────────────────────────────────────

/** Props for `<DataTableSkeleton />`. */
interface DataTableSkeletonProps {
  /** Number of columns to render skeleton cells for. */
  columnCount: number;
  /** Number of skeleton rows to render. @default 5 */
  rowCount?: number;
}

/**
 * A pure-CSS skeleton loading state that mirrors the shape of the real table.
 * Rendered automatically by `<DataTable />` when `loading` is `true`.
 *
 * @example
 * ```tsx
 * <DataTableSkeleton columnCount={5} rowCount={8} />
 * ```
 */
export function DataTableSkeleton({ columnCount, rowCount = 5 }: DataTableSkeletonProps) {
  return (
    <>
      {Array.from({ length: rowCount }).map((_, rowIdx) => (
        <TableRow key={rowIdx}>
          {Array.from({ length: columnCount }).map((_, colIdx) => (
            <TableCell key={colIdx}>
              <Skeleton className="h-4 w-full" />
            </TableCell>
          ))}
        </TableRow>
      ))}
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 8. DataTable  (main component)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * A fully-featured data table component that composes all the building blocks
 * above. Supports:
 *
 * - Sorting (single & multi-column)
 * - Column filtering (per-column quick filter + faceted multi-select)
 * - Global search across all columns
 * - Active-filter badge pills with individual dismissal
 * - Pagination (client-side & server-side)
 * - Row selection with select-all checkbox
 * - Row expansion with a custom sub-row renderer
 * - Row pinning (top / bottom)
 * - Column visibility toggle
 * - Column resizing (drag handles)
 * - Column pinning (left / right sticky)
 * - Column grouping & aggregation
 * - Faceted row model for unique value counts
 * - Skeleton loading state
 * - Dense / relaxed density variants
 * - Striped & bordered display variants
 * - Server-side (manual) sorting, filtering, and pagination
 *
 * @template TData  Row data type.
 * @template TValue Accessor value type.
 *
 * @example Client-side, all features
 * ```tsx
 * <DataTable
 *   columns={columns}
 *   data={payments}
 *   filterColumn="email"
 *   enableGlobalFilter
 *   enableColumnPinning
 *   enableColumnResizing
 *   striped
 *   density="compact"
 *   renderSubComponent={({ row }) => <PaymentDetail row={row} />}
 *   onRowSelectionChange={(rows) => console.log(rows)}
 * />
 * ```
 *
 * @example Server-side pagination + sorting
 * ```tsx
 * <DataTable
 *   columns={columns}
 *   data={serverRows}
 *   rowCount={totalCount}
 *   manualPagination
 *   manualSorting
 *   onPaginationChange={({ pageIndex, pageSize }) => fetchPage(pageIndex, pageSize)}
 *   onSortingChange={(sorting) => fetchSorted(sorting)}
 * />
 * ```
 */
export function DataTable<TData, TValue>({
  columns,
  data,
  // Filtering
  filterColumn,
  filterPlaceholder = "Filter...",
  enableGlobalFilter = false,
  globalFilterPlaceholder = "Search...",
  // Sorting
  enableMultiSort = false,
  // Pagination
  showPagination = true,
  pageSizeOptions = [10, 20, 30, 50],
  initialPageSize = 10,
  paginationState,
  // Row selection
  showSelectionCount = true,
  onRowSelectionChange,
  onRowDoubleClick,
  // Row expansion
  renderSubComponent,
  renderMobileCard,
  mobileCardFields,
  mobileCardTitle,
  mobileCardSubtitle,
  mobileCardActions,
  // Row pinning
  enableRowPinning = false,
  // Column visibility
  showColumnToggle = true,
  // Column resizing
  enableColumnResizing = true,
  columnResizeMode = "onChange",
  columnResizeBehavior = "isolated",
  // Column pinning
  enableColumnPinning = false,
  initialColumnPinning,
  // Column ordering
  enableColumnOrdering = false,
  initialColumnOrder,
  // Grouping
  grouping: groupingProp,
  // Display variants
  density = "default",
  striped = false,
  bordered = false,
  emptyMessage = "Empty results.",
  emptyState,
  loading = false,
  loadingRowCount = 5,
  error = false,
  errorMessage = "Unable to load records.",
  // Server-side
  manualSorting = false,
  manualFiltering = false,
  manualPagination = false,
  rowCount,
  onSortingChange: onSortingChangeProp,
  onColumnFiltersChange: onColumnFiltersChangeProp,
  onGlobalFilterChange: onGlobalFilterChangeProp,
  onPaginationChange: onPaginationChangeProp,
  bulkActions,
  persistedStateKey,
  enableFilterPresets,
  toolbarStart,
  searchValue = "",
  onSearchChange,
  searchPlaceholder = "Search...",
  searchDebounceMs = 300,
  filters,
  toolbarActions,
  toolbarEnd,
  toolbarClassName,
  className,
}: DataTableProps<TData, TValue>) {
  const persistedState = React.useMemo(() => readPersistedTableState(persistedStateKey), [persistedStateKey]);

  // ── State ──────────────────────────────────────────────────────────────────
  const [sorting, setSorting] = React.useState<SortingState>(persistedState.sorting ?? []);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(persistedState.columnFilters ?? []);
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>(
    persistedState.columnVisibility ?? {}
  );
  const [rowSelection, setRowSelection] = React.useState({});
  const [columnSizing, setColumnSizing] = React.useState<ColumnSizingState>({});
  const shellRef = React.useRef<HTMLDivElement>(null);
  const hasScaledColumnsRef = React.useRef(false);
  const [columnPinning, setColumnPinning] = React.useState<ColumnPinningState>(initialColumnPinning ?? {});
  const [columnOrder, setColumnOrder] = React.useState<ColumnOrderState>(initialColumnOrder ?? []);
  const [globalFilter, setGlobalFilter] = React.useState(persistedState.globalFilter ?? "");
  const [expanded, setExpanded] = React.useState<ExpandedState>({});
  const [grouping, setGrouping] = React.useState<GroupingState>(groupingProp ?? []);
  const [rowPinning, setRowPinning] = React.useState<RowPinningState>({
    top: [],
    bottom: [],
  });
  const [internalPagination, setInternalPagination] = React.useState({
    pageIndex: 0,
    pageSize: persistedState.pageSize ?? initialPageSize,
  });
  const pagination = paginationState ?? internalPagination;
  const [localSearchValue, setLocalSearchValue] = React.useState(searchValue);
  const debouncedSearchValue = useDebounce(localSearchValue, searchDebounceMs);
  const onSearchChangeRef = React.useRef(onSearchChange);
  const lastEmittedSearchValueRef = React.useRef(searchValue);
  const [presets, setPresets] = React.useState<PersistedTablePreset[]>(() =>
    readPersistedTablePresets(persistedStateKey)
  );
  const [presetName, setPresetName] = React.useState("");
  const shouldShowFilterPresets = enableFilterPresets ?? Boolean(persistedStateKey);
  const showUndoToast = useUndoToast();
  onSearchChangeRef.current = onSearchChange;

  // ── Forward external callbacks ─────────────────────────────────────────────
  const handleSortingChange: React.Dispatch<React.SetStateAction<SortingState>> = React.useCallback(
    updater => {
      setSorting(prev => {
        const next = typeof updater === "function" ? updater(prev) : updater;
        onSortingChangeProp?.(next);
        return next;
      });
    },
    [onSortingChangeProp]
  );

  const handleColumnFiltersChange: React.Dispatch<React.SetStateAction<ColumnFiltersState>> = React.useCallback(
    updater => {
      setColumnFilters(prev => {
        const next = typeof updater === "function" ? updater(prev) : updater;
        onColumnFiltersChangeProp?.(next);
        return next;
      });
    },
    [onColumnFiltersChangeProp]
  );

  const handleColumnVisibilityChange: React.Dispatch<React.SetStateAction<VisibilityState>> = React.useCallback(
    updater => {
      setColumnVisibility(prev => {
        const next = typeof updater === "function" ? updater(prev) : updater;
        if (JSON.stringify(next) !== JSON.stringify(prev)) {
          showUndoToast("Column view updated.", () => setColumnVisibility(prev));
        }
        return next;
      });
    },
    [showUndoToast]
  );

  const handleGlobalFilterChange = React.useCallback(
    (value: string) => {
      setGlobalFilter(value);
      onGlobalFilterChangeProp?.(value);
    },
    [onGlobalFilterChangeProp]
  );

  const handlePaginationChange: React.Dispatch<React.SetStateAction<{ pageIndex: number; pageSize: number }>> =
    React.useCallback(
      updater => {
        const resolveNext = (prev: { pageIndex: number; pageSize: number }) => {
          const rawNext = typeof updater === "function" ? updater(prev) : updater;
          return rawNext.pageSize !== prev.pageSize ? { ...rawNext, pageIndex: 0 } : rawNext;
        };

        if (paginationState) {
          const next = resolveNext(paginationState);
          onPaginationChangeProp?.(next);
          return;
        }

        setInternalPagination(prev => {
          const next = resolveNext(prev);
          onPaginationChangeProp?.(next);
          return next;
        });
      },
      [onPaginationChangeProp, paginationState]
    );

  React.useEffect(() => {
    setPresets(readPersistedTablePresets(persistedStateKey));
  }, [persistedStateKey]);

  const getCurrentPresetState = React.useCallback(
    (): PersistedTableState => ({
      sorting,
      columnFilters,
      columnVisibility,
      globalFilter,
      searchValue: localSearchValue,
      pageSize: pagination.pageSize,
    }),
    [columnFilters, columnVisibility, globalFilter, localSearchValue, pagination.pageSize, sorting]
  );

  const applyPresetState = React.useCallback(
    (state: PersistedTableState) => {
      handleSortingChange(state.sorting ?? []);
      handleColumnFiltersChange(state.columnFilters ?? []);
      setColumnVisibility(state.columnVisibility ?? {});
      handleGlobalFilterChange(state.globalFilter ?? "");

      if (typeof state.searchValue === "string") {
        setLocalSearchValue(state.searchValue);
        lastEmittedSearchValueRef.current = state.searchValue;
        onSearchChangeRef.current?.(state.searchValue);
      }

      if (typeof state.pageSize === "number" && Number.isFinite(state.pageSize) && state.pageSize > 0) {
        handlePaginationChange({ pageIndex: 0, pageSize: state.pageSize });
      }
    },
    [handleColumnFiltersChange, handleGlobalFilterChange, handlePaginationChange, handleSortingChange]
  );

  const savePreset = React.useCallback(() => {
    if (!persistedStateKey) return;
    const name = presetName.trim();
    if (!name) return;

    const nextPreset: PersistedTablePreset = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name,
      state: getCurrentPresetState(),
      savedAt: Date.now(),
    };

    const next = [nextPreset, ...presets.filter(preset => preset.name.toLowerCase() !== name.toLowerCase())];
    const previousPresets = presets;
    setPresets(next);
    writePersistedTablePresets(persistedStateKey, next);
    setPresetName("");
    showUndoToast("Filter preset saved.", () => {
      setPresets(previousPresets);
      writePersistedTablePresets(persistedStateKey, previousPresets);
    });
  }, [getCurrentPresetState, persistedStateKey, presetName, presets, showUndoToast]);

  const deletePreset = React.useCallback(
    (id: string) => {
      if (!persistedStateKey) return;
      const previousPresets = presets;
      const next = presets.filter(preset => preset.id !== id);
      setPresets(next);
      writePersistedTablePresets(persistedStateKey, next);
      showUndoToast("Filter preset deleted.", () => {
        setPresets(previousPresets);
        writePersistedTablePresets(persistedStateKey, previousPresets);
      });
    },
    [persistedStateKey, presets, showUndoToast]
  );

  /** Stable boolean - avoids treating the function reference itself as truthy in JSX ternaries */
  const hasSubRow = renderSubComponent !== undefined;
  const hasRowDoubleClick = onRowDoubleClick !== undefined;

  // ── Table instance ─────────────────────────────────────────────────────────
  const table = useReactTable({
    data,
    columns,
    // Row models
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
    getGroupedRowModel: getGroupedRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
    getFacetedMinMaxValues: getFacetedMinMaxValues(),
    // Manual (server-side) modes
    manualSorting,
    manualFiltering,
    manualPagination,
    rowCount: manualPagination ? rowCount : undefined,
    // State
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
      columnSizing,
      columnPinning,
      columnOrder,
      globalFilter,
      expanded,
      grouping,
      rowPinning,
      pagination,
    },
    // Updaters
    onSortingChange: handleSortingChange,
    onColumnFiltersChange: handleColumnFiltersChange,
    onColumnVisibilityChange: handleColumnVisibilityChange,
    onRowSelectionChange: setRowSelection,
    onColumnSizingChange: setColumnSizing,
    onColumnPinningChange: setColumnPinning,
    onColumnOrderChange: setColumnOrder,
    onGlobalFilterChange: handleGlobalFilterChange,
    onExpandedChange: setExpanded,
    onGroupingChange: setGrouping,
    onRowPinningChange: setRowPinning,
    onPaginationChange: handlePaginationChange,
    // Feature flags
    enableMultiSort,
    enableColumnResizing,
    columnResizeMode: enableColumnResizing ? columnResizeMode : undefined,
    enableColumnPinning,
    enableRowPinning,
    enableGlobalFilter,
    getRowCanExpand: hasSubRow ? () => true : undefined,
    // Custom filter functions
    filterFns: {
      fuzzy: fuzzyFilter,
      arrIncludesSome: arrIncludesSomeFilter,
    },
  });

  // ── Notify parent of selection changes ────────────────────────────────────
  const onRowSelectionChangeRef = React.useRef(onRowSelectionChange);
  onRowSelectionChangeRef.current = onRowSelectionChange;
  React.useEffect(() => {
    onRowSelectionChangeRef.current?.(table.getFilteredSelectedRowModel().rows);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rowSelection]);

  React.useEffect(() => {
    if (!persistedStateKey) return;
    window.localStorage.setItem(
      persistedStateKey,
      JSON.stringify({
        sorting,
        columnFilters,
        columnVisibility,
        globalFilter,
        searchValue: localSearchValue,
        pageSize: pagination.pageSize,
      })
    );
  }, [
    columnFilters,
    columnVisibility,
    globalFilter,
    localSearchValue,
    pagination.pageSize,
    persistedStateKey,
    sorting,
  ]);

  React.useEffect(() => {
    setLocalSearchValue(searchValue);
    lastEmittedSearchValueRef.current = searchValue;
  }, [searchValue]);

  React.useEffect(() => {
    if (!onSearchChangeRef.current) return;
    if (debouncedSearchValue === lastEmittedSearchValueRef.current) return;

    lastEmittedSearchValueRef.current = debouncedSearchValue;
    onSearchChangeRef.current?.(debouncedSearchValue);
  }, [debouncedSearchValue]);

  // ── Scale columns to fill container on first mount (isolated mode only) ───
  useIsomorphicLayoutEffect(() => {
    if (
      hasScaledColumnsRef.current ||
      !shellRef.current ||
      !enableColumnResizing ||
      columnResizeBehavior !== "isolated"
    )
      return;

    hasScaledColumnsRef.current = true;
    const containerWidth = shellRef.current.getBoundingClientRect().width;
    if (!containerWidth) return;

    const leafColumns = table.getAllLeafColumns().filter(c => c.getCanResize());
    const totalSize = leafColumns.reduce((sum, c) => sum + c.getSize(), 0);
    if (!totalSize || containerWidth <= totalSize) return;

    const scale = containerWidth / totalSize;
    const sizing: ColumnSizingState = {};
    leafColumns.forEach(c => {
      sizing[c.id] = Math.floor(c.getSize() * scale);
    });
    setColumnSizing(sizing);
  }, []);

  // ── Density class map ─────────────────────────────────────────────────────
  const densityClass = {
    default: "",
    compact: "[&_td]:py-1 [&_th]:py-1",
    relaxed: "[&_td]:py-4 [&_th]:py-4",
  }[density];

  // ── Helpers ────────────────────────────────────────────────────────────────
  const hasControlledSearch = onSearchChange !== undefined;
  const hasToolbar =
    toolbarStart ||
    filters ||
    hasControlledSearch ||
    filterColumn ||
    enableGlobalFilter ||
    showColumnToggle ||
    toolbarActions ||
    toolbarEnd;
  const selectedRows = table.getFilteredSelectedRowModel().rows;
  const tableRows = table.getRowModel().rows;
  const [keyboardRowIndex, setKeyboardRowIndex] = React.useState<number | null>(null);
  const rowRefs = React.useRef<Array<HTMLTableRowElement | null>>([]);
  const shouldReplaceRowsWithSkeleton = loading && manualPagination;
  const visibleTableRows = shouldReplaceRowsWithSkeleton ? [] : tableRows;
  const skeletonColumnCount = columns.length + (hasSubRow ? 1 : 0);
  const serverSkeletonRowCount = manualPagination ? pagination.pageSize : loadingRowCount;
  const loadingSkeletonRowCount =
    visibleTableRows.length === 0 && manualPagination ? pagination.pageSize : serverSkeletonRowCount;
  const shouldRenderSkeletonRows = loading && loadingSkeletonRowCount > 0;

  const pinnedLeftBg =
    "sticky left-0 z-10 bg-background after:absolute after:right-0 after:top-0 after:h-full after:w-px after:bg-border";
  const pinnedRightBg =
    "sticky right-0 z-10 bg-background before:absolute before:left-0 before:top-0 before:h-full before:w-px before:bg-border";

  React.useEffect(() => {
    if (keyboardRowIndex !== null && keyboardRowIndex >= visibleTableRows.length) {
      setKeyboardRowIndex(visibleTableRows.length > 0 ? visibleTableRows.length - 1 : null);
    }
  }, [keyboardRowIndex, visibleTableRows.length]);

  function moveKeyboardFocus(currentIndex: number, offset: number) {
    if (visibleTableRows.length === 0) return;
    const nextIndex = Math.min(Math.max(currentIndex + offset, 0), visibleTableRows.length - 1);
    setKeyboardRowIndex(nextIndex);
    window.requestAnimationFrame(() => rowRefs.current[nextIndex]?.focus());
  }

  function handleDataRowKeyDown(event: React.KeyboardEvent<HTMLTableRowElement>, row: Row<TData>, rowIndex: number) {
    const target = event.target as HTMLElement;
    if (target.closest("button,a,input,select,textarea,[role='button'],[contenteditable='true']")) return;

    if (event.key === "ArrowDown" || event.key.toLowerCase() === "j") {
      event.preventDefault();
      moveKeyboardFocus(rowIndex, 1);
      return;
    }

    if (event.key === "ArrowUp" || event.key.toLowerCase() === "k") {
      event.preventDefault();
      moveKeyboardFocus(rowIndex, -1);
      return;
    }

    if (event.key === " " && (bulkActions || onRowSelectionChange) && row.getCanSelect()) {
      event.preventDefault();
      row.toggleSelected();
      return;
    }

    if (event.key === "Enter" && onRowDoubleClick) {
      event.preventDefault();
      onRowDoubleClick(row);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  const hasGeneratedMobileCards = Boolean(mobileCardFields?.length && !renderMobileCard);
  const hasMobileCards = Boolean(renderMobileCard || hasGeneratedMobileCards);
  const [bulkActionsOpen, setBulkActionsOpen] = React.useState(false);

  React.useEffect(() => {
    if (selectedRows.length === 0) setBulkActionsOpen(false);
  }, [selectedRows.length]);

  function renderGeneratedMobileCard(row: Row<TData>) {
    const original = row.original;
    const title = mobileCardTitle?.(original);
    const subtitle = mobileCardSubtitle?.(original);

    return (
      <div className="bg-card text-card-foreground space-y-3 rounded-md border p-3 shadow-sm">
        {(title || subtitle) && (
          <div className="space-y-1">
            {title && <div className="text-sm font-semibold">{title}</div>}
            {subtitle && <div className="text-muted-foreground text-xs">{subtitle}</div>}
          </div>
        )}
        <dl className="space-y-2">
          {(mobileCardFields ?? []).map(field => (
            <div key={field.key} className="grid grid-cols-[110px_minmax(0,1fr)] gap-3 text-sm">
              <dt className="text-muted-foreground text-xs font-medium">{field.label}</dt>
              <dd className="min-w-0 break-words">
                {field.render ? field.render(original) : renderMobileCardValue(getMobileCardValue(original, field.key))}
              </dd>
            </div>
          ))}
        </dl>
        {mobileCardActions && (
          <div className="flex flex-wrap justify-end gap-2 border-t pt-3">{mobileCardActions({ row })}</div>
        )}
      </div>
    );
  }

  return (
    <div className={cn("nds-data-table space-y-3", className)}>
      {/* ── Toolbar ── */}
      {hasToolbar && (
        <div className={cn("nds-toolbar", toolbarClassName)}>
          {hasControlledSearch && (
            <div className="relative w-full sm:w-auto">
              <Search className="text-muted-foreground absolute top-2 left-2.5 h-4 w-4" />
              <Input
                placeholder={searchPlaceholder}
                value={localSearchValue}
                onChange={e => setLocalSearchValue(e.target.value)}
                className="h-8 w-full pl-8 sm:w-[220px]"
              />
              {localSearchValue && (
                <button
                  type="button"
                  onClick={() => setLocalSearchValue("")}
                  className="text-muted-foreground hover:text-foreground absolute top-2 right-2"
                  aria-label="Clear search"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          )}
          {enableGlobalFilter && (
            <div className="relative w-full sm:w-auto">
              <Search className="text-muted-foreground absolute top-2 left-2.5 h-4 w-4" />
              <Input
                placeholder={globalFilterPlaceholder}
                value={globalFilter}
                onChange={e => handleGlobalFilterChange(e.target.value)}
                className="h-8 w-full pl-8 sm:w-[220px]"
              />
              {globalFilter && (
                <button
                  type="button"
                  onClick={() => handleGlobalFilterChange("")}
                  className="text-muted-foreground hover:text-foreground absolute top-2 right-2"
                  aria-label="Clear search"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          )}
          {/* toolbarStart, filterColumn, and View toggle always share one row —
              the inner flex prevents them wrapping to separate lines on small screens */}
          {(toolbarStart || filters || filterColumn || showColumnToggle || toolbarActions || toolbarEnd) && (
            <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
              {toolbarStart}
              {filters}
              {filterColumn && (
                <Input
                  placeholder={filterPlaceholder}
                  value={(table.getColumn(filterColumn)?.getFilterValue() as string) ?? ""}
                  onChange={e => table.getColumn(filterColumn)?.setFilterValue(e.target.value)}
                  className="h-8 min-w-0 flex-1 sm:w-[220px] sm:flex-none"
                />
              )}
              {shouldShowFilterPresets && persistedStateKey && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="h-8">
                      <Bookmark className="mr-2 h-4 w-4" />
                      Presets
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-72">
                    <DropdownMenuLabel>Filter presets</DropdownMenuLabel>
                    <div className="space-y-2 px-2 py-2">
                      <Input
                        value={presetName}
                        onChange={event => setPresetName(event.target.value)}
                        onKeyDown={event => event.stopPropagation()}
                        placeholder="Preset name"
                        className="h-8"
                      />
                      <Button
                        type="button"
                        size="sm"
                        className="h-8 w-full"
                        disabled={!presetName.trim()}
                        onClick={savePreset}
                      >
                        <Save className="mr-2 h-3.5 w-3.5" />
                        Save current view
                      </Button>
                    </div>
                    <DropdownMenuSeparator />
                    {presets.length > 0 ? (
                      presets.map(preset => (
                        <DropdownMenuItem
                          key={preset.id}
                          className="gap-2"
                          onSelect={event => {
                            const target = event.target as HTMLElement;
                            if (target.closest("[data-delete-preset]")) {
                              event.preventDefault();
                              return;
                            }
                            const previousState = getCurrentPresetState();
                            applyPresetState(preset.state);
                            showUndoToast("Filter preset applied.", () => applyPresetState(previousState));
                          }}
                        >
                          <span className="min-w-0 flex-1 truncate">{preset.name}</span>
                          <button
                            type="button"
                            data-delete-preset
                            className="text-muted-foreground hover:bg-muted hover:text-foreground rounded p-1"
                            onClick={event => {
                              event.preventDefault();
                              event.stopPropagation();
                              deletePreset(preset.id);
                            }}
                            aria-label={`Delete ${preset.name} preset`}
                            title={`Delete ${preset.name}`}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </DropdownMenuItem>
                      ))
                    ) : (
                      <DropdownMenuItem disabled>Empty saved presets</DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
              {showColumnToggle && <DataTableViewOptions table={table} />}
              {toolbarActions}
              {toolbarEnd}
            </div>
          )}
        </div>
      )}

      {/* ── Active filter badges ── */}
      <DataTableActiveFilters table={table} />

      {bulkActions && selectedRows.length > 0 && (
        <>
          <div
            className={cn(
              "nds-toolbar border-border bg-muted/40 rounded-md border px-3 py-2 text-sm",
              hasMobileCards && "hidden lg:flex"
            )}
          >
            <span className="text-muted-foreground">{selectedRows.length} selected</span>
            <div className="nds-toolbar-end">{bulkActions(selectedRows)}</div>
          </div>
          {hasMobileCards && (
            <div className="border-border bg-muted/40 flex items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm lg:hidden">
              <span className="text-muted-foreground">{selectedRows.length} selected</span>
              <Button type="button" size="sm" variant="outline" onClick={() => setBulkActionsOpen(true)}>
                Actions
              </Button>
            </div>
          )}
          <Dialog open={bulkActionsOpen} onOpenChange={setBulkActionsOpen}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>{selectedRows.length} selected</DialogTitle>
                <DialogDescription>Run actions for the selected rows.</DialogDescription>
              </DialogHeader>
              <div className="nds-toolbar">{bulkActions(selectedRows)}</div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setBulkActionsOpen(false)}>
                  Close
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </>
      )}

      {/* ── Table ── */}
      {hasMobileCards && (
        <div className={cn("space-y-2", renderMobileCard ? "lg:hidden" : "md:hidden")}>
          {error ? (
            <div className="border-destructive/30 bg-destructive/5 text-destructive rounded-md border p-4 text-center text-sm">
              {errorMessage}
            </div>
          ) : visibleTableRows.length || shouldRenderSkeletonRows ? (
            <>
              {visibleTableRows.map(row => (
                <React.Fragment key={row.id}>
                  {renderMobileCard ? renderMobileCard({ row }) : renderGeneratedMobileCard(row)}
                  {row.getIsExpanded() && hasSubRow && (
                    <div className="bg-muted/30 rounded-md border p-4">{renderSubComponent({ row })}</div>
                  )}
                </React.Fragment>
              ))}
              {shouldRenderSkeletonRows && (
                <div className="space-y-2">
                  {Array.from({ length: loadingSkeletonRowCount }).map((_, index) => (
                    <div key={index} className="space-y-3 rounded-md border p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-2">
                          <Skeleton className="h-4 w-24" />
                          <Skeleton className="h-3 w-40" />
                        </div>
                        <Skeleton className="h-6 w-20" />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <Skeleton className="h-3 w-full" />
                        <Skeleton className="h-3 w-full" />
                        <Skeleton className="h-3 w-full" />
                        <Skeleton className="h-3 w-full" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="rounded-md border p-4">{renderEmptyState(emptyState, emptyMessage)}</div>
          )}
        </div>
      )}

      <div
        ref={shellRef}
        className={cn(
          "nds-table-shell",
          renderMobileCard && "hidden lg:block",
          hasGeneratedMobileCards && "hidden md:block"
        )}
      >
        <Table
          aria-busy={loading}
          style={
            enableColumnResizing
              ? {
                  width: table.getTotalSize(),
                  tableLayout: "fixed",
                  ...(columnResizeBehavior === "isolated" ? { minWidth: 0 } : {}),
                }
              : undefined
          }
          className={cn(
            densityClass,
            striped && "[&_tbody_tr:nth-child(even)]:bg-muted/40",
            bordered && "[&_td]:border [&_th]:border"
          )}
        >
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup, index) => (
              <TableRow key={index}>
                {/* Expand column */}
                {hasSubRow && <TableHead className="w-8 p-0" />}
                {headerGroup.headers.map((header, index) => {
                  const isPinnedLeft = header.column.getIsPinned() === "left";
                  const isPinnedRight = header.column.getIsPinned() === "right";
                  const alignment = getColumnAlignment(header.column);
                  return (
                    <TableHead
                      key={index}
                      colSpan={header.colSpan}
                      style={enableColumnResizing ? { width: header.getSize(), position: "relative" } : undefined}
                      className={cn(
                        "group/head",
                        getColumnAlignmentClass(alignment),
                        enableColumnPinning && isPinnedLeft && pinnedLeftBg,
                        enableColumnPinning && isPinnedRight && pinnedRightBg
                      )}
                    >
                      {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                      {/* Column resize handle */}
                      {enableColumnResizing && header.column.getCanResize() && (
                        <div
                          onMouseDown={header.getResizeHandler()}
                          onTouchStart={header.getResizeHandler()}
                          className={cn(
                            "absolute top-0 right-[2px] z-10 h-full w-[2px] cursor-col-resize touch-none transition-colors select-none",
                            header.column.getIsResizing() ? "bg-primary" : "bg-border hover:bg-primary"
                          )}
                        />
                      )}
                      {/* Column drag-to-reorder handle */}
                      {enableColumnOrdering && (
                        <div
                          draggable
                          onDragStart={e => {
                            e.dataTransfer.setData("columnId", header.column.id);
                            e.dataTransfer.effectAllowed = "move";
                          }}
                          onDragOver={e => e.preventDefault()}
                          onDrop={e => {
                            e.preventDefault();
                            const draggedId = e.dataTransfer.getData("columnId");
                            if (draggedId === header.column.id) return;
                            const currentOrder = table.getState().columnOrder.length
                              ? table.getState().columnOrder
                              : table.getAllLeafColumns().map(c => c.id);
                            const from = currentOrder.indexOf(draggedId);
                            const to = currentOrder.indexOf(header.column.id);
                            if (from === -1 || to === -1) return;
                            const next = [...currentOrder];
                            next.splice(from, 1);
                            next.splice(to, 0, draggedId);
                            table.setColumnOrder(next);
                          }}
                          className="absolute top-0 left-0 flex h-full w-5 cursor-grab items-center justify-center opacity-0 transition-opacity group-hover/head:opacity-100 active:cursor-grabbing"
                          aria-label="Drag to reorder column"
                        >
                          <GripVertical className="text-muted-foreground h-3.5 w-3.5" />
                        </div>
                      )}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {error ? (
              <TableRow>
                <TableCell colSpan={skeletonColumnCount} className="text-destructive h-24 text-center text-sm">
                  {errorMessage}
                </TableCell>
              </TableRow>
            ) : visibleTableRows.length || shouldRenderSkeletonRows ? (
              <>
                {visibleTableRows.map((row, index) => (
                  <React.Fragment key={index}>
                    <TableRow
                      ref={element => {
                        rowRefs.current[index] = element;
                      }}
                      tabIndex={0}
                      aria-selected={row.getIsSelected()}
                      data-state={row.getIsSelected() && "selected"}
                      data-pinned={row.getIsPinned() || undefined}
                      onFocus={() => setKeyboardRowIndex(index)}
                      onKeyDown={event => handleDataRowKeyDown(event, row, index)}
                      onDoubleClick={event => {
                        if (!onRowDoubleClick) return;
                        const target = event.target as HTMLElement;
                        if (
                          target.closest(
                            "button,a,input,select,textarea,[role='button'],[data-no-row-double-click='true']"
                          )
                        ) {
                          return;
                        }
                        onRowDoubleClick(row);
                      }}
                      className={cn(
                        hasRowDoubleClick && "cursor-pointer",
                        keyboardRowIndex === index && "ring-ring ring-1 outline-none",
                        row.getIsPinned() === "top" && "bg-background sticky top-0 z-10 shadow-sm",
                        row.getIsPinned() === "bottom" && "bg-background sticky bottom-0 z-10 shadow-sm"
                      )}
                    >
                      {/* Expand toggle cell */}
                      {hasSubRow && (
                        <TableCell className="w-10 p-0 pl-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => row.toggleExpanded()}
                            aria-label={row.getIsExpanded() ? "Collapse row" : "Expand row"}
                          >
                            {row.getIsExpanded() ? (
                              <ChevronDown className="h-4 w-4" />
                            ) : (
                              <ChevronRightSmall className="h-4 w-4" />
                            )}
                          </Button>
                        </TableCell>
                      )}
                      {row.getVisibleCells().map((cell, index) => {
                        const isPinnedLeft = cell.column.getIsPinned() === "left";
                        const isPinnedRight = cell.column.getIsPinned() === "right";
                        const alignment = getColumnAlignment(cell.column);
                        return (
                          <TableCell
                            key={index}
                            style={enableColumnResizing ? { width: cell.column.getSize() } : undefined}
                            className={cn(
                              enableColumnResizing && "truncate",
                              getColumnAlignmentClass(alignment),
                              enableColumnPinning && isPinnedLeft && pinnedLeftBg,
                              enableColumnPinning && isPinnedRight && pinnedRightBg
                            )}
                          >
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </TableCell>
                        );
                      })}
                    </TableRow>
                    {/* Sub-row (expanded detail) */}
                    {row.getIsExpanded() && hasSubRow && (
                      <TableRow>
                        <TableCell colSpan={skeletonColumnCount} className="bg-muted/30 p-4">
                          {renderSubComponent({ row })}
                        </TableCell>
                      </TableRow>
                    )}
                  </React.Fragment>
                ))}
                {shouldRenderSkeletonRows && (
                  <DataTableSkeleton columnCount={skeletonColumnCount} rowCount={loadingSkeletonRowCount} />
                )}
              </>
            ) : (
              <TableRow>
                <TableCell colSpan={skeletonColumnCount} className="text-muted-foreground h-24 text-center">
                  {renderEmptyState(emptyState, emptyMessage)}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* ── Pagination ── */}
      {showPagination && (
        <DataTablePagination table={table} pageSizeOptions={pageSizeOptions} showSelectionCount={showSelectionCount} />
      )}
    </div>
  );
}

function renderEmptyState(emptyState: React.ReactNode | undefined, emptyMessage: string) {
  if (emptyState === undefined || typeof emptyState === "string") {
    return (
      <EmptyState
        title={emptyState || emptyMessage}
        description="Try changing search, filters, or the selected date range."
      />
    );
  }

  return emptyState;
}
