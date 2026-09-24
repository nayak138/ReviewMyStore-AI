import { useState } from "react";
import { Check, Mail, ShieldCheck, Trash2, UserPlus, Users } from "lucide-react";
import "./_group.css";

type Permission = "No access" | "View only" | "Manage";
type Person = { id: number; name: string; email: string; access: string };

const businesses = ["Harbor & Pine", "Northstar Dental"];
const initialMembers: Person[] = [
  { id: 1, name: "Maya Chen", email: "maya@harborpine.com", access: "Campaigns: Manage · Reviews: Manage · Analytics: View" },
  { id: 2, name: "Jordan Ellis", email: "jordan@harborpine.com", access: "Reviews: View · Feedback: View · Social: Manage" },
];
const permissions = ["Campaigns", "Review Inbox", "Feedback", "Social Media", "Analytics"];

export function Current() {
  const [business, setBusiness] = useState(businesses[0]);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [members, setMembers] = useState(initialMembers);
  const [notice, setNotice] = useState("");
  const [permission, setPermission] = useState<Record<string, Permission>>({
    Campaigns: "No access", "Review Inbox": "No access", Feedback: "No access",
    "Social Media": "No access", Analytics: "No access",
  });

  const invite = () => {
    if (!email.trim()) return;
    const granted = permissions.filter((item) => permission[item] !== "No access");
    if (!granted.length) {
      setNotice("Select at least one feature permission.");
      return;
    }
    setMembers((current) => [...current, { id: Date.now(), name: name || "New teammate", email, access: granted.map((item) => `${item}: ${permission[item]}`).join(" · ") }]);
    setNotice(`Invitation created for ${email}.`);
    setEmail(""); setName("");
  };

  return (
    <main className="business-teams-mockup" style={{ minHeight: "100vh", background: "#f3f6fa", padding: "40px 20px" }}>
      <section className="bt-card" style={{ maxWidth: 1040, margin: "0 auto" }} data-testid="settings-teams-section">
        <header className="bt-header">
          <div className="bt-title-row">
            <div className="bt-icon" aria-hidden="true"><Users size={20} /></div>
            <div><h2>Business teams</h2><p className="bt-description">Invite teammates to specific businesses with the minimum access they need.</p></div>
          </div>
          <span className="bt-owner"><ShieldCheck size={14} /> Owner only</span>
        </header>
        <div className="bt-content">
          <div className="bt-business-bar">
            <label style={{ flex: 1 }}><span className="bt-label">Business</span>
              <select value={business} onChange={(event) => setBusiness(event.target.value)} aria-label="Business">
                {businesses.map((item) => <option key={item}>{item}</option>)}
              </select>
            </label>
            <div className="bt-seats">3/8 teammate seats reserved</div>
          </div>
          {notice && <div className="bt-status" role="status"><Check size={14} style={{ verticalAlign: "middle", marginRight: 7 }} />{notice}</div>}
          <div className="bt-columns">
            <section className="bt-invite">
              <div className="bt-section-heading"><UserPlus size={16} /><div><h3>Invite a teammate</h3><p className="bt-helper">They’ll receive a secure 14-day join link.</p></div></div>
              <div className="bt-fields">
                <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="teammate@example.com" aria-label="Teammate email" />
                <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Name (optional)" aria-label="Teammate name" />
                <div className="bt-permissions">
                  {permissions.map((item) => <label key={item}><span>{item}</span><select value={permission[item]} onChange={(event) => setPermission({ ...permission, [item]: event.target.value as Permission })}><option>No access</option><option>View only</option><option>Manage</option></select></label>)}
                </div>
                <button className="bt-button" type="button" onClick={invite}><Mail size={14} style={{ verticalAlign: "middle", marginRight: 7 }} />Invite teammate</button>
              </div>
            </section>
            <section className="bt-right">
              <div className="bt-subheading"><h3>Active members</h3><p>Permissions take effect on the next request.</p></div>
              <div className="bt-list">{members.map((member) => <article className="bt-member" key={member.id}>
                <div><p className="bt-member-name">{member.name}</p><p className="bt-email">{member.email}</p><p className="bt-access">{member.access}</p></div>
                <div className="bt-actions"><button className="bt-small" type="button">Edit access</button><button className="bt-small" type="button" aria-label={`Remove ${member.name}`} onClick={() => setMembers((current) => current.filter((item) => item.id !== member.id))}><Trash2 size={13} /></button></div>
              </article>)}</div>
              <div className="bt-divider"><div className="bt-subheading"><h3>Pending invitations</h3><p>Pending invitations reserve a seat until they expire or are revoked.</p></div>
                <article className="bt-member" style={{ marginTop: 13 }}><div><p className="bt-member-name">alex.morgan@example.com</p><p className="bt-email">Expires Jul 14, 2025</p><p className="bt-access">Invitation Sent on Team Member&apos;s Email ID</p><p className="bt-access">Campaigns: View · Analytics: View</p></div><div className="bt-actions"><button className="bt-small" type="button">Edit</button><button className="bt-small" type="button">Send again</button><button className="bt-small" type="button" style={{ color: "var(--rms-red)" }}>Revoke</button></div></article>
              </div>
            </section>
          </div>
        </div>
      </section>
    </main>
  );
}