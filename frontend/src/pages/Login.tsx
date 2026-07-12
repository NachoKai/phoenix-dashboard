import { useState } from "react";
import { useAuth } from "../auth";

interface LoginProps {
  onSuccess: () => void;
}

export function Login({ onSuccess }: LoginProps) {
  const { login } = useAuth();
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
    <div className="login">
      <form className="login__form" onSubmit={handleSubmit}>
        <h1 className="login__title">Phoenix Dashboard</h1>
        <p className="login__subtitle">Enter password to continue</p>
        <input
          className={`login__input${error ? " login__input--error" : ""}`}
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
        {error && <p className="login__error">Incorrect password</p>}
        <button className="login__btn" type="submit">
          Unlock
        </button>
      </form>
    </div>
  );
}
