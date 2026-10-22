"use client";
import { ErrorView } from "@/components/layout/error-view";

export default function AppError(props: { error: Error & { digest?: string }; reset: () => void }) {
  return <main className="min-h-screen bg-neutral-50 px-4 py-6"><ErrorView {...props} /></main>;
}
