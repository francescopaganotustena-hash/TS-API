import type { ReactNode } from "react";

export type ExplorerStatus = "active" | "warning" | "suspended" | "neutral" | "error";

export type DetailTone = "default" | "muted" | "success" | "warning" | "danger";

export interface ExplorerResource {
  id: string;
  label: string;
  sublabel?: string;
  count?: number;
  status?: string;
  statusTone?: ExplorerStatus;
  href?: string;
  icon?: ReactNode;
}

export interface DetailField {
  label: string;
  value: ReactNode;
  mono?: boolean;
  tone?: DetailTone;
}

export interface TreeNode {
  id: string;
  label: string;
  sublabel?: string;
  rightMeta?: string;
  amount?: string;
  status?: string;
  statusTone?: ExplorerStatus;
  badge?: string;
  badgeTone?: ExplorerStatus;
  count?: number;
  icon?: ReactNode;
  details?: DetailField[];
  raw?: unknown;
  children?: TreeNode[];
}

export interface ExplorerShellMeta {
  title: string;
  description?: string;
  meta?: string;
}
