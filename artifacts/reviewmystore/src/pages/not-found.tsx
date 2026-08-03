import { Link } from "wouter";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="min-h-[100dvh] flex flex-col items-center justify-center bg-zinc-50 dark:bg-zinc-950 text-center px-4">
      <div className="w-16 h-16 rounded-full bg-zinc-100 dark:bg-zinc-900 flex items-center justify-center mb-6">
        <span className="text-2xl font-bold text-zinc-400 dark:text-zinc-600">404</span>
      </div>
      <h1 className="text-3xl font-bold text-zinc-900 dark:text-white mb-2">Page not found</h1>
      <p className="text-zinc-500 dark:text-zinc-400 mb-8 max-w-sm mx-auto">
        The page you are looking for doesn't exist or has been moved.
      </p>
      <Link href="/">
        <Button>Return Home</Button>
      </Link>
    </div>
  );
}
