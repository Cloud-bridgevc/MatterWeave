const TEAM = [
  { name: 'Bello Adam', role: 'Founder & CEO', initials: 'BA', focus: 'Leads company strategy, customer partnerships and the MatterWeave product vision.' },
  { name: 'Chinedu Justice', role: 'Co-Founder & CTO', initials: 'CJ', focus: 'Leads engineering, platform security and the AI document intelligence architecture.' },
];

export function TeamSection({ alt = false }: { alt?: boolean }) {
  return (
    <section className={`section${alt ? ' alt' : ''}`} id="team">
      <div className="container">
        <div className="section-head">
          <span className="eyebrow">Our team</span>
          <h2>The people building MatterWeave</h2>
        </div>
        <div className="grid-2">
          {TEAM.map((p) => (
            <div className="card team-card" key={p.name}>
              <div className="team-avatar" aria-hidden="true">{p.initials}</div>
              <div>
                <h3 style={{ marginBottom: 2 }}>{p.name}</h3>
                <div className="role">{p.role}</div>
                <p style={{ margin: 0 }}>{p.focus}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
