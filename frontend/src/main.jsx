import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { BookOpen, CalendarDays, LayoutDashboard, LogOut, Search, Shield, UserCog, Users } from 'lucide-react';
import './styles.css';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000';

async function api(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: response.statusText }));
    throw new Error(error.error || 'Request failed');
  }
  return response.json();
}

function Badge({ children }) {
  return <span className="badge">{children}</span>;
}

function Card({ title, children, footer }) {
  return (
    <article className="card">
      <h3>{title}</h3>
      <div>{children}</div>
      {footer ? <footer>{footer}</footer> : null}
    </article>
  );
}

function Login({ onLogin }) {
  const [email, setEmail] = useState('admin@research-lifecycle-manager.local');
  const [password, setPassword] = useState('Admin@12345');
  const [error, setError] = useState('');

  async function submit(event) {
    event.preventDefault();
    setError('');
    try {
      await api('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password })
      });
      onLogin();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <main className="login-shell">
      <section className="login-panel">
        <p className="eyebrow">research-lifecycle-manager</p>
        <h1>Academic supervision and faculty workbench</h1>
        <form onSubmit={submit}>
          <label>Email<input value={email} onChange={(event) => setEmail(event.target.value)} /></label>
          <label>Password<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} /></label>
          {error ? <p className="error">{error}</p> : null}
          <button type="submit">Sign in</button>
        </form>
        <p className="hint">Seed admin: admin@research-lifecycle-manager.local / Admin@12345</p>
      </section>
    </main>
  );
}

function Shell({ user, onLogout, children, active, setActive }) {
  const items = [
    ['dashboard', LayoutDashboard, 'Dashboard'],
    ['supervision', Users, 'Supervision'],
    ['meetings', CalendarDays, 'Meetings'],
    ['workbench', BookOpen, 'Workbench'],
    ['search', Search, 'Search'],
    ['audit', Shield, 'Audit'],
    ...(user.roles.includes('ADMIN') ? [['admin', UserCog, 'Admin']] : [])
  ];
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div>
          <p className="brand">research-lifecycle-manager</p>
          <nav>
            {items.map(([id, Icon, label]) => (
              <button key={id} className={active === id ? 'active' : ''} onClick={() => setActive(id)}>
                <Icon size={18} /> {label}
              </button>
            ))}
          </nav>
        </div>
        <div className="user-box">
          <strong>{user.name}</strong>
          <div className="badges">{user.roles.map((role) => <Badge key={role}>{role}</Badge>)}</div>
          <button className="quiet" onClick={onLogout}><LogOut size={16} /> Logout</button>
        </div>
      </aside>
      <main className="content">{children}</main>
    </div>
  );
}

function Dashboard() {
  const [data, setData] = useState(null);
  useEffect(() => {
    api('/api/workbench/dashboard').then(setData).catch(console.error);
  }, []);
  if (!data) return <p>Loading dashboard...</p>;
  const cards = [
    ['Active manuscripts', data.active_manuscripts],
    ['Pending submissions', data.pending_submissions],
    ['Projects under follow-up', data.projects_under_follow_up],
    ['Upcoming consultancy', data.consultancy_engagements],
    ['MOOCs in progress', data.moocs_in_progress],
    ['Overdue items', data.overdue_items]
  ];
  return (
    <section>
      <PageTitle title="Faculty Dashboard" subtitle="Deadlines, lifecycle status, and current academic workload." />
      <div className="grid cards">
        {cards.map(([title, items]) => (
          <Card key={title} title={title} footer={`${items.length} item${items.length === 1 ? '' : 's'}`}>
            {items.slice(0, 3).map((item) => <p key={`${title}-${item.id}`}>{item.title || item.organization || item.course_title}</p>)}
            {!items.length ? <p className="muted">Nothing pending</p> : null}
          </Card>
        ))}
      </div>
    </section>
  );
}

function PageTitle({ title, subtitle }) {
  return (
    <header className="page-title">
      <p className="eyebrow">research-lifecycle-manager</p>
      <h1>{title}</h1>
      <p>{subtitle}</p>
    </header>
  );
}

function Supervision() {
  const [candidates, setCandidates] = useState([]);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    api('/api/supervision/candidates').then((data) => setCandidates(data.candidates)).catch(console.error);
  }, []);

  async function openCandidate(id) {
    setSelected(await api(`/api/supervision/candidates/${id}`));
  }

  return (
    <section>
      <PageTitle title="Candidate Dashboards" subtitle="Masters, Ph.D., and intern workspaces with confidentiality-aware summaries." />
      <div className="split">
        <div className="list">
          {candidates.map((candidate) => (
            <button key={candidate.id} className="list-row" onClick={() => openCandidate(candidate.id)}>
              <strong>{candidate.name}</strong>
              <span>{candidate.programme_type} - {candidate.status}</span>
              <Badge>{candidate.visibility}</Badge>
            </button>
          ))}
        </div>
        <div className="detail">
          {selected ? (
            <>
              <h2>{selected.candidate.name}</h2>
              <p>{selected.candidate.topic}</p>
              <div className="timeline">
                {selected.meetings.map((meeting) => (
                  <article key={meeting.id}>
                    <strong>{meeting.title}</strong>
                    <span>{meeting.phase} - {meeting.scheduled_at?.slice(0, 10)}</span>
                    <p>{meeting.discussion}</p>
                  </article>
                ))}
              </div>
              <h3>DAC / Compliance</h3>
              {selected.compliance.map((item) => (
                <p key={item.id}><Badge>{item.compliance_status}</Badge> {item.suggestion}</p>
              ))}
            </>
          ) : <p className="muted">Select a candidate to inspect lifecycle progress.</p>}
        </div>
      </div>
    </section>
  );
}

function Meetings() {
  const [meetings, setMeetings] = useState([]);
  const [status, setStatus] = useState('');
  const [visibility, setVisibility] = useState('');

  useEffect(() => {
    const query = new URLSearchParams();
    if (status) query.set('status', status);
    if (visibility) query.set('visibility', visibility);
    api(`/api/supervision/meetings?${query}`).then((data) => setMeetings(data.meetings)).catch(console.error);
  }, [status, visibility]);

  return (
    <section>
      <PageTitle title="Meeting Management" subtitle="Minutes, action items, append-only comments, and versioned admin revisions." />
      <div className="filters">
        <select value={status} onChange={(event) => setStatus(event.target.value)}>
          <option value="">Any status</option><option value="active">Active</option><option value="archived">Archived</option>
        </select>
        <select value={visibility} onChange={(event) => setVisibility(event.target.value)}>
          <option value="">Any visibility</option><option>admin-only</option><option>supervisor-only</option><option>internal-team</option><option>candidate-visible</option><option>sanitized-external</option>
        </select>
      </div>
      <div className="grid">
        {meetings.map((meeting) => (
          <Card key={meeting.id} title={meeting.title} footer={<a href={`${API_BASE}/api/system/print/meeting/${meeting.id}`} target="_blank" rel="noreferrer">PDF view</a>}>
            <p><Badge>{meeting.programme_type}</Badge> <Badge>{meeting.visibility}</Badge></p>
            <p>{meeting.candidate_name} - {meeting.phase}</p>
            <p>{meeting.discussion}</p>
          </Card>
        ))}
      </div>
    </section>
  );
}

function Workbench() {
  const [projects, setProjects] = useState([]);
  const [publications, setPublications] = useState([]);

  useEffect(() => {
    api('/api/workbench/projects').then((data) => setProjects(data.projects)).catch(console.error);
    api('/api/workbench/publications').then((data) => setPublications(data.publications)).catch(console.error);
  }, []);

  const lanes = ['idea', 'drafting', 'submitted', 'under_review', 'revision', 'accepted', 'published'];
  const projectLanes = ['idea', 'proposal', 'NOC', 'submission', 'follow-up', 'sanctioned', 'execution', 'reporting', 'completed'];
  return (
    <section>
      <PageTitle title="Faculty Academic Workbench" subtitle="Publications, books, projects, consultancy, MOOCs, and custom academic activities." />
      <h2>Publication lifecycle</h2>
      <Kanban lanes={lanes} items={publications} />
      <h2>Project lifecycle</h2>
      <Kanban lanes={projectLanes} items={projects} />
    </section>
  );
}

function Kanban({ lanes, items }) {
  return (
    <div className="kanban">
      {lanes.map((lane) => (
        <section key={lane}>
          <h3>{lane}</h3>
          {items.filter((item) => item.status === lane).map((item) => (
            <article key={`${lane}-${item.id}`}>
              <strong>{item.title}</strong>
              <p>{item.journal || item.funding_agency || item.type}</p>
              <Badge>{item.visibility}</Badge>
            </article>
          ))}
        </section>
      ))}
    </div>
  );
}

function GlobalSearch() {
  const [q, setQ] = useState('');
  const [results, setResults] = useState([]);

  async function submit(event) {
    event.preventDefault();
    const data = await api(`/api/system/search?q=${encodeURIComponent(q)}`);
    setResults(data.results);
  }

  return (
    <section>
      <PageTitle title="Search and Filters" subtitle="Search candidates, meetings, publications, projects, consultancy, and MOOCs." />
      <form className="searchbar" onSubmit={submit}>
        <input value={q} onChange={(event) => setQ(event.target.value)} placeholder="Search by title, status, or visibility" />
        <button>Search</button>
      </form>
      <div className="grid">
        {results.map((result) => (
          <Card key={`${result.result_type}-${result.id}`} title={result.result_title}>
            <p><Badge>{result.result_type}</Badge> <Badge>{result.visibility}</Badge></p>
            <p>{result.topic || result.discussion || result.notes || result.deliverables || result.proposal || result.status}</p>
          </Card>
        ))}
      </div>
    </section>
  );
}

function Audit() {
  const [logs, setLogs] = useState([]);
  const [error, setError] = useState('');
  useEffect(() => {
    api('/api/system/audit-logs').then((data) => setLogs(data.audit_logs)).catch((err) => setError(err.message));
  }, []);
  return (
    <section>
      <PageTitle title="Audit Logs" subtitle="Admin-visible trail for authentication, edits, appends, exports, and archives." />
      {error ? <p className="error">{error}</p> : null}
      <div className="table-wrap">
        <table>
          <thead><tr><th>When</th><th>Actor</th><th>Action</th><th>Entity</th></tr></thead>
          <tbody>
            {logs.map((log) => (
              <tr key={log.id}><td>{log.created_at}</td><td>{log.actor_name || 'System'}</td><td>{log.action}</td><td>{log.entity_type} #{log.entity_id || '-'}</td></tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function AdminPanel() {
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState({ name: '', email: '', password: '', roles: 'VIEWER' });
  const [message, setMessage] = useState('');

  async function loadUsers() {
    const data = await api('/api/admin/users');
    setUsers(data.users);
  }

  useEffect(() => {
    loadUsers().catch((err) => setMessage(err.message));
  }, []);

  async function createUser(event) {
    event.preventDefault();
    setMessage('');
    try {
      await api('/api/admin/users', {
        method: 'POST',
        body: JSON.stringify({ ...form, roles: form.roles.split(',').map((role) => role.trim()).filter(Boolean) })
      });
      setForm({ name: '', email: '', password: '', roles: 'VIEWER' });
      await loadUsers();
      setMessage('User created');
    } catch (err) {
      setMessage(err.message);
    }
  }

  return (
    <section>
      <PageTitle title="Admin Control" subtitle="User creation, role visibility, password reset endpoints, and soft archive APIs are backed by audit logs." />
      {message ? <p className={message.includes('created') ? 'hint' : 'error'}>{message}</p> : null}
      <form className="admin-form" onSubmit={createUser}>
        <input placeholder="Name" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
        <input placeholder="Email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} />
        <input placeholder="Temporary password" type="password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} />
        <select value={form.roles} onChange={(event) => setForm({ ...form, roles: event.target.value })}>
          <option>ADMIN</option><option>WRITER</option><option>VIEWER</option><option>RESTRICTED_EXTERNAL</option>
        </select>
        <button>Create user</button>
      </form>
      <div className="table-wrap">
        <table>
          <thead><tr><th>User</th><th>Email</th><th>Status</th><th>Roles</th></tr></thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id}>
                <td>{user.name}</td><td>{user.email}</td><td>{user.status}</td>
                <td>{user.roles.map((role) => <Badge key={role}>{role}</Badge>)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function App() {
  const [user, setUser] = useState(null);
  const [active, setActive] = useState('dashboard');
  const [loading, setLoading] = useState(true);

  async function loadMe() {
    setLoading(true);
    try {
      const data = await api('/api/auth/me');
      setUser(data.user);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadMe(); }, []);

  async function logout() {
    await api('/api/auth/logout', { method: 'POST' });
    setUser(null);
  }

  const page = useMemo(() => ({
    dashboard: <Dashboard />,
    supervision: <Supervision />,
    meetings: <Meetings />,
    workbench: <Workbench />,
    search: <GlobalSearch />,
    audit: <Audit />,
    admin: <AdminPanel />
  })[active], [active]);

  if (loading) return <p className="boot">Starting research-lifecycle-manager...</p>;
  if (!user) return <Login onLogin={loadMe} />;
  return <Shell user={user} onLogout={logout} active={active} setActive={setActive}>{page}</Shell>;
}

createRoot(document.getElementById('root')).render(<App />);
