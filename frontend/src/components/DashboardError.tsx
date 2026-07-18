import { useQueryClient } from "@tanstack/react-query";

export function DashboardError({ error, deviceId }: { error: Error; deviceId: string }) {
  const queryClient = useQueryClient();

  return (
    <div className="dashboard dashboard--error">
      <p>{error.message}</p>
      <button
        type="button"
        onClick={() =>
          queryClient.invalidateQueries({ queryKey: ["dashboard", deviceId] })
        }
      >
        Retry
      </button>
    </div>
  );
}
