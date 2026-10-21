"use client";
import * as React from "react";
import type { ActionState } from "@/lib/action-state";

export type ActionFormCtx = { state: ActionState; pending: boolean };
export const ActionFormContext = React.createContext<ActionFormCtx | null>(null);
