import s from "./landing-tablet.module.css";

const points = [[40,143],[76,121],[112,108],[148,115],[184,100],[220,119],[256,102],[292,99],[328,88],[364,101],[400,83],[436,93],[472,82],[508,75]];

export function LandingTabletShowcase() {
  return <div className={s.scene} aria-label="Illustrative Zetro analytics dashboard">
    <div className={s.halo} aria-hidden="true" />
    <div className={s.reflection} aria-hidden="true" />
    <div className={s.device}>
      <div className={s.screen}>
        <aside className={s.sidebar}>
          <div className={s.brand}><b>Z</b><span>Zetro</span></div>
          <div className={s.selected}>▦ <span>Dashboard</span></div>
          <div>♧ <span>Calls</span></div>
          <div>▥ <span>Leaderboard</span></div>
          <div>▤ <span>Documents</span></div>
          <div>⚙ <span>Settings</span></div>
        </aside>
        <div className={s.dashboard}>
          <div className={s.heading}><h2>Dashboard</h2><span>Last 30 days⌄</span></div>
          <div className={s.metrics}>
            {[['94.8%','Avg QA Score','↑ +2.1%'],['12,480','Calls Analysed','↑ +12%'],['92%','Compliance Rate','↑ +1.8%']].map(([value,label,change])=><div key={label}><strong>{value}</strong><span>{label}</span><small>{change}</small></div>)}
          </div>
          <div className={s.chart}>
            <div className={s.chartTitle}><strong>Agent Performance</strong><span><i/> Your Team <i/> Target</span></div>
            <svg viewBox="0 0 550 220" role="img" aria-label="Example quality performance trend increasing over a month">
              <defs><linearGradient id="tablet-area" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#0063ff" stopOpacity=".13"/><stop offset="100%" stopColor="#0063ff" stopOpacity="0"/></linearGradient></defs>
              {[50,85,120,155,190].map((y,i)=><g key={y}><line x1="38" y1={y} x2="520" y2={y} stroke="#e8eef9"/><text x="3" y={y+4} fill="#7183a1" fontSize="10">{100-i*10}%</text></g>)}
              {[76,184,292,400,508].map(x=><line key={x} x1={x} x2={x} y1="40" y2="190" stroke="#f0f4fa"/>)}
              <path d={`M${points.map(p=>p.join(',')).join(' L')} L508,190 L40,190 Z`} fill="url(#tablet-area)"/>
              <polyline points={points.map(p=>p.join(',')).join(' ')} fill="none" stroke="#0063ff" strokeWidth="2" strokeLinejoin="round"/>
              {points.map(([x,y])=><circle key={x} cx={x} cy={y} r="3.2" fill="#0063ff"/>)}
              <rect x="421" y="47" width="76" height="29" rx="9" fill="#0a2145"/><text x="459" y="67" textAnchor="middle" fill="white" fontWeight="700" fontSize="17">94.8%</text>
              {['Apr 1','Apr 8','Apr 15','Apr 22','Apr 30'].map((label,i)=><text key={label} x={40+i*117} y="213" fontSize="10" fill="#7183a1">{label}</text>)}
            </svg>
          </div>
          <span className={s.example}>Illustrative dashboard · sample data</span>
        </div>
      </div>
    </div>
    <div className={s.badge}><span>✓</span><div><strong>94.8%</strong><small>Quality Score</small></div></div>
  </div>;
}
