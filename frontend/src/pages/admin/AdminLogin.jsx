import { useState } from 'react';
import { useStore, adminSignIn, notify } from '../../store';
import { Page } from '../../components/Phone';
import OperatorLayout from '../../components/OperatorNav';

export default function AdminLogin() {
  const S = useStore();
  const [password, setPassword] = useState('');
  const names = S.operatorNames;
  return (
    <Page id="admin-login">
      <OperatorLayout active="admin-login">
        <div className="desktop-page" style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", background: "radial-gradient(ellipse 900px 500px at 50% 30%, #0E1A2E 0%, var(--bg) 60%)" }}>
          <div style={{ width: "380px", background: "var(--bg-panel)", border: "1px solid var(--border)", borderRadius: "14px", padding: "30px" }}>
            <div style={{ textAlign: "center", marginBottom: "22px" }}>
              <div className="h-title" style={{ fontSize: "18px", letterSpacing: "1px" }}>RAD PLAYSTATION</div>
              <div style={{ fontSize: "11.5px", color: "var(--text-faint)", marginTop: "4px" }}>Admin console</div>
            </div>
            <label>Operator</label>
            <select id="admin-login-operator" value={S.adminLoginOperator || names[0] || ''} onChange={(e) => { S.adminLoginOperator = e.target.value; notify(); }}>
              {names.map((n) => <option key={n}>{n}</option>)}
            </select>
            <label>Password</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') adminSignIn(password); }} />
            <div className="btn primary" style={{ marginTop: "18px" }} onClick={() => adminSignIn(password)}>Start shift</div>
            <div style={{ fontSize: "10.5px", color: "var(--text-faint)", marginTop: "10px", textAlign: "center" }}>You'll be shown as the active operator on the customer page</div>
          </div>
        </div>
      </OperatorLayout>
    </Page>
  );
}
