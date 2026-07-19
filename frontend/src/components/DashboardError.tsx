import { useQueryClient } from "@tanstack/react-query";
import styled from "styled-components";

export function DashboardError({ error, deviceId }: { error: Error; deviceId: string }) {
  const queryClient = useQueryClient();

  return (
    <Wrapper>
      <p>{error.message}</p>
      <button
        type="button"
        onClick={() =>
          queryClient.invalidateQueries({ queryKey: ["dashboard", deviceId] })
        }
      >
        Retry
      </button>
    </Wrapper>
  );
}

const Wrapper = styled.div`
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  gap: 4px;
`;
