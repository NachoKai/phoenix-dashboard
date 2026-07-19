import styled from "styled-components";
import type { ReactNode } from "react";

interface Props {
  children: ReactNode;
}

export function UnsupportedMsg({ children }: Props) {
  return (
    <Wrapper>
      <p>{children}</p>
      <SubText>Try on a mobile device with Safari/Chrome</SubText>
    </Wrapper>
  );
}

const Wrapper = styled.div`
  text-align: center;
  padding: 12px;
  color: ${({ theme }) => theme.textMuted};

  p {
    margin: 0;
    font-size: clamp(0.6rem, 3.5cqw, 0.9rem);
  }
`;

const SubText = styled.p`
  font-size: clamp(0.45rem, 2.5cqw, 0.65rem) !important;
  opacity: 0.6;
  margin-top: 4px !important;
`;
