import type { ReactNode } from "react";
import styled, { css } from "styled-components";
import type { WidgetStatus } from "../types";
import { DragHandle } from "../hooks/useSectionDragDrop";

interface WidgetCardProps {
  title: string;
  status: WidgetStatus;
  error: string | null;
  onRetry?: () => void;
  children: ReactNode;
  dragHandle?: boolean;
}

export function WidgetCard({
  title,
  status,
  error,
  onRetry,
  children,
  dragHandle,
}: WidgetCardProps) {
  return (
    <Card $status={status}>
      {dragHandle ? (
        <DragHandle>
          <Title>{title}</Title>
        </DragHandle>
      ) : (
        <Header>
          <Title>{title}</Title>
        </Header>
      )}

      <Body>
        {status === "loading" && !children ? (
          <LoadingWrap>
            <Spinner />
          </LoadingWrap>
        ) : status === "error" && !children ? (
          <ErrorWrap>
            <p>{error ?? "Something went wrong"}</p>
            {onRetry && (
              <RetryBtn type="button" onClick={onRetry}>
                Retry
              </RetryBtn>
            )}
          </ErrorWrap>
        ) : (
          children
        )}
        {status === "error" && children && (
          <StaleBanner>{error}</StaleBanner>
        )}
      </Body>
    </Card>
  );
}

const Card = styled.article<{ $status: WidgetStatus }>`
  background: transparent;
  border: none;
  min-height: 0;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  container-type: inline-size;
  ${({ $status, theme }) =>
    $status === "error" &&
    css`
      border-color: ${theme.error};
    `}
  ${({ $status, theme }) =>
    $status === "stale" &&
    css`
      border-color: ${theme.warning};
    `}
`;

const Header = styled.header`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2px;
  flex-shrink: 0;
`;

const Title = styled.h2`
  margin: 0;
  font-size: clamp(0.5rem, 2.8cqw, 0.85rem);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: ${({ theme }) => theme.textMuted};
  font-weight: 600;
`;

const Body = styled.div`
  flex: 1;
  min-height: 0;
  overflow-y: auto;

  &:has(.weather-widget),
  &:has(.weather-forecast-widget),
  &:has(.weather-weekly-widget),
  &:has(.gifs-widget),
  &:has(.clock-widget-card),
  &:has(.moon-widget),
  &:has(.lava-lamp),
  &:has(.aquarium),
  &:has(.bubble-level),
  &:has(.rolling-ball) {
    display: flex;
    justify-content: center;
    align-items: center;
  }

  &:has(.touch-ripple) {
    display: flex;
  }

  &:has(.bubble-wrap),
  &:has(.fidget-spinner),
  &:has(.bubble-pop),
  &:has(.ambient-soundboard),
  &:has(.tonal-drone),
  &:has(.gradient-shift),
  &:has(.zen-bell),
  &:has(.color-calm),
  &:has(.lights-widget),
  &:has(.vacuum-widget),
  &:has(.ai-qa-widget) {
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }
`;

const LoadingWrap = styled.div`
  flex: 1;
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100%;
  width: 100%;
`;

const Spinner = styled.div`
  width: 28px;
  height: 28px;
  border: 3px solid ${({ theme }) => theme.border};
  border-top-color: ${({ theme }) => theme.accent};
  border-radius: 50%;
  animation: spin 0.8s linear infinite;

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
`;

const ErrorWrap = styled.div`
  text-align: center;
  padding: 4px 0;
  color: ${({ theme }) => theme.error};
  font-size: 0.85rem;
  height: 100%;
  align-items: center;
  display: flex;
  justify-content: center;
  flex-direction: column;
`;

const RetryBtn = styled.button`
  margin-top: 2px;
  padding: 3px 6px;
  background: ${({ theme }) => theme.bgElevated};
  border: 1px solid ${({ theme }) => theme.border};
  cursor: pointer;
  font-size: 0.8rem;
`;

const StaleBanner = styled.div`
  margin-top: 2px;
  font-size: 0.65rem;
  color: ${({ theme }) => theme.warning};
  text-align: center;
  flex-shrink: 0;
`;
