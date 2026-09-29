import { useState } from 'react';
import { ownerSignIn } from '../../store';
import { Page, Phone } from '../../components/Phone';

export default function OwnerLogin() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const submit = (page) => ownerSignIn(username, password, page);
  return (
    <Page id="owner-login">
      <Phone>
        <div className="phone-content">
          <div style={{ height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", padding: "0 4px" }}>
            <div style={{ textAlign: "center", marginBottom: "26px" }}>
              <div className="h-title" style={{ fontSize: "20px", letterSpacing: "1px" }}>RAD PLAYSTATION</div>
              <div style={{ fontSize: "11.5px", color: "var(--text-faint)", marginTop: "4px" }}>Owner console</div>
            </div>
            <label>Username</label>
            <input type="text" id="owner-login-username" placeholder="owner username" autoComplete="username" value={username} onChange={(e) => setUsername(e.target.value)} />
            <label>Password</label>
            <input type="password" id="owner-login-password" placeholder="••••••••" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') submit('owner-revenue'); }} />
            <div className="btn primary" style={{ marginTop: "20px" }} onClick={() => submit('owner-revenue')}>Sign in</div>
            <div className="btn ghost" style={{ marginTop: "8px", fontSize: "12px" }} onClick={() => submit('owner-desktop')}>Open desktop console</div>
            <div style={{ fontSize: "10.5px", color: "var(--text-faint)", marginTop: "12px", textAlign: "center" }}>Owner access only · separate from the admin console</div>
          </div>
        </div>
      </Phone>
    </Page>
  );
}
