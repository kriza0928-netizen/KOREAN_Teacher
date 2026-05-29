interface LoadingOverlayProps {
  message: string;
}

export function LoadingOverlay({ message }: LoadingOverlayProps) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="mx-4 rounded-2xl bg-white p-6 text-center shadow-xl">
        <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-primary/20 border-t-primary" />
        <p className="text-sm font-medium text-primary">{message}</p>
      </div>
    </div>
  );
}
