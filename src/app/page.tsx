import { Suspense } from "react";
import Dashboard from "@/components/Dashboard";
import { ToastProvider } from "@/components/ToastContainer";
import LoadingSpinner from "@/components/LoadingSpinner";

export default function Home() {
  return (
    <ToastProvider>
      <Suspense fallback={
        <div className="flex min-h-screen items-center justify-center">
          <LoadingSpinner size="lg" message="Loading application..." />
        </div>
      }>
        <Dashboard />
      </Suspense>
    </ToastProvider>
  );
}
