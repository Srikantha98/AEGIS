import { useState } from 'react';

function LoginPage({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      await onLogin(username, password);
    } catch (loginError) {
      setError(loginError.message || 'Unable to sign in.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="login-shell">
      <section className="login-card" aria-labelledby="login-title">
        <div className="login-mark" aria-hidden="true">A</div>
        <p className="eyebrow">AEGIS AUTOPRO</p>
        <h1 id="login-title">Sign in</h1>
        <p className="login-copy">Use the development account assigned to your role.</p>
        <form onSubmit={submit} noValidate>
          <label className="field">
            <span>Username</span>
            <input
              autoComplete="username"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              placeholder="Enter your username"
            />
          </label>
          <label className="field">
            <span>Password</span>
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Enter your password"
            />
          </label>
          {error && <p className="form-error" role="alert">{error}</p>}
          <button className="login-submit" type="submit" disabled={isLoading}>
            {isLoading ? 'Signing in…' : 'Login'}
          </button>
        </form>
      </section>
    </main>
  );
}

export default LoginPage;
