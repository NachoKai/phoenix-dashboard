import { useState } from "react";
import styled from "styled-components";
import { useAuthStore } from "../stores/authStore";

interface LoginProps {
  onSuccess: () => void;
}

export function Login({ onSuccess }: LoginProps) {
  const login = useAuthStore(s => s.login);
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (login(password)) {
      onSuccess();
    } else {
      setError(true);
      setPassword("");
    }
  };

  return (
    <Wrapper>
      <Form onSubmit={handleSubmit}>
        <Title>Phoenix Dashboard</Title>
        <Subtitle>Enter password to continue</Subtitle>
        <Input
          $error={error}
          type="password"
          value={password}
          onChange={e => {
            setPassword(e.target.value);
            setError(false);
          }}
          placeholder="Password"
          autoFocus
          autoComplete="current-password"
        />
        {error && <ErrorMsg>Incorrect password</ErrorMsg>}
        <Btn type="submit">Unlock</Btn>
      </Form>
    </Wrapper>
  );
}

const Wrapper = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100dvh;
  min-height: 100vh;
  background: ${({ theme }) => theme.bg};
  padding: 1rem;
`;

const Form = styled.form`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  background: ${({ theme }) => theme.bgCard};
  border: 1px solid ${({ theme }) => theme.border};
  border-radius: ${({ theme }) => theme.radius};
  padding: 2.5rem 2rem;
  width: 100%;
  max-width: 340px;
`;

const Title = styled.h1`
  font-size: 1.4rem;
  font-weight: 700;
  color: ${({ theme }) => theme.text};
  margin: 0;
`;

const Subtitle = styled.p`
  font-size: 0.85rem;
  color: ${({ theme }) => theme.textMuted};
  margin: 0 0 0.5rem;
`;

const Input = styled.input<{ $error: boolean }>`
  width: 100%;
  padding: 0.75rem;
  border: 1px solid ${({ $error, theme }) => ($error ? theme.error : theme.border)};
  border-radius: calc(${({ theme }) => theme.radius} - 4px);
  background: ${({ theme }) => theme.bg};
  color: ${({ theme }) => theme.text};
  font-size: 1rem;
  text-align: center;
  outline: none;
  transition: border-color 0.2s;

  &:focus {
    border-color: ${({ theme }) => theme.accent};
  }
`;

const ErrorMsg = styled.p`
  color: ${({ theme }) => theme.error};
  font-size: 0.85rem;
  margin: 0;
`;

const Btn = styled.button`
  width: 100%;
  padding: 0.75rem;
  border: none;
  border-radius: calc(${({ theme }) => theme.radius} - 4px);
  background: ${({ theme }) => theme.accent};
  color: #fff;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s;

  &:hover {
    background: ${({ theme }) => theme.accentDim};
  }

  &:active {
    transform: scale(0.98);
  }
`;
