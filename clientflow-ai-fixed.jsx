import { useState, useEffect, useRef } from "react";

/* ═══════════════════════════════════════════════════════
   CLIENTFLOW AI — Production-Ready SaaS
   Auth · Plans · Stripe Checkout · Dashboard · Legal
═══════════════════════════════════════════════════════ */

const CLAUDE_API = "https://api.anthropic.com/v1/messages";
const MODEL = "claude-3-7-sonnet-latest";
const API_KEY = import.meta.env.VITE_ANTHROPIC_API_KEY;

/* ── Design System ───────────────────────────────────── */
const T = {
  bg: "#F5F5F7", white: "#FFFFFF",
  ink: "#1D1D1F", sub: "#6E6E73", muted: "#AEAEB2",
  border: "#D2D2D7", light: "#F0F0F5",
  blue: "#0066CC", blueL: "#EBF2FF",
  green: "#1C7C4A", greenL: "#E8F5EE",
  orange: "#B84800", orangeL: "#FEF0E6",
  purple: "#6B3FE0", purpleL: "#EEE8FF",
  red: "#CC0000", redL: "#FDECEA",
  shadow: "0 1px 4px rgba(0,0,0,0.08),0 2px 12px rgba(0,0,0,0.04)",
  shadowM: "0 4px 24px rgba(0,0,0,0.10)",
  shadowL: "0 12px 48px rgba(0,0,0,0.14)",
};

const STYLES = `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Inter',system-ui,sans-serif;background:${T.bg};color:${T.ink}}
@keyframes spin{to{transform:rotate(360deg)}}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}
@keyframes fadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
@keyframes slideIn{from{opacity:0;transform:translateX(20px)}to{opacity:1;transform:translateX(0)}}
::-webkit-scrollbar{width:4px}
::-webkit-scrollbar-thumb{background:${T.border};border-radius:4px}
input::placeholder{color:${T.muted}}
input:focus{outline:none;border-color:${T.blue}!important;box-shadow:0 0 0 3px ${T.blueL}}
`;

/* ── Shared Components ───────────────────────────────── */
const Spin = ({ s = 16, c = T.blue }) => (
  <span style={{ display:"inline-block", width:s, height:s, border:`2px solid ${T.light}`, borderTop:`2px solid ${c}`, borderRadius:"50%", animation:"spin .7s linear infinite", flexShrink:0 }} />
);

const Tag = ({ v }) => {
  const M = {
    new:{l:"Nouveau",bg:T.blueL,c:T.blue}, contacted:{l:"Contacté",bg:T.orangeL,c:T.orange},
    replied:{l:"Répondu",bg:T.purpleL,c:T.purple}, booked:{l:"RDV pris",bg:T.greenL,c:T.green},
    sent:{l:"Envoyé",bg:T.blueL,c:T.blue}, confirmed:{l:"Confirmé",bg:T.greenL,c:T.green},
    pending:{l:"En attente",bg:T.orangeL,c:T.orange}, active:{l:"Active",bg:T.greenL,c:T.green},
    paused:{l:"Terminée",bg:T.light,c:T.sub},
  };
  const s = M[v] || M.new;
  return <span style={{ display:"inline-flex",alignItems:"center",gap:5,background:s.bg,color:s.c,borderRadius:20,padding:"2px 10px 2px 7px",fontSize:12,fontWeight:600,whiteSpace:"nowrap" }}><span style={{ width:6,height:6,borderRadius:"50%",background:s.c }}/>{s.l}</span>;
};

const Btn = ({ children, variant="primary", size="md", onClick, disabled, style={}, type="button" }) => {
  const base = { display:"inline-flex",alignItems:"center",justifyContent:"center",gap:6,borderRadius:8,fontWeight:600,cursor:disabled?"not-allowed":"pointer",transition:"all .15s",border:"none",fontFamily:"inherit",opacity:disabled?.5:1,whiteSpace:"nowrap" };
  const sz = { sm:{padding:"6px 14px",fontSize:13}, md:{padding:"9px 20px",fontSize:14}, lg:{padding:"13px 32px",fontSize:15} };
  const vr = {
    primary:{background:T.ink,color:T.white},
    secondary:{background:"transparent",color:T.ink,border:`1px solid ${T.border}`},
    blue:{background:T.blue,color:T.white},
    green:{background:T.green,color:T.white},
    ghost:{background:"transparent",color:T.sub},
    danger:{background:T.red,color:T.white},
  };
  return <button type={type} onClick={onClick} disabled={disabled} style={{ ...base,...sz[size],...vr[variant],...style }}>{children}</button>;
};

const Input = ({ label, type="text", placeholder, value, onChange, error, icon }) => (
  <div style={{ display:"flex",flexDirection:"column",gap:5 }}>
    {label && <label style={{ fontSize:13,fontWeight:600,color:T.ink }}>{label}</label>}
    <div style={{ position:"relative" }}>
      {icon && <span style={{ position:"absolute",left:12,top:"50%",transform:"translateY(-50%)",color:T.muted,fontSize:15 }}>{icon}</span>}
      <input type={type} placeholder={placeholder} value={value} onChange={onChange}
        style={{ width:"100%",background:T.white,border:`1px solid ${error?T.red:T.border}`,borderRadius:8,padding:icon?"9px 14px 9px 36px":"9px 14px",fontSize:14,color:T.ink,fontFamily:"inherit",transition:"all .15s" }} />
    </div>
    {error && <span style={{ fontSize:12,color:T.red }}>{error}</span>}
  </div>
);

const Modal = ({ children, onClose, width=480 }) => (
  <div style={{ position:"fixed",inset:0,background:"rgba(0,0,0,.45)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:300,backdropFilter:"blur(4px)",padding:16 }}>
    <div style={{ width,maxWidth:"100%",background:T.white,borderRadius:20,boxShadow:T.shadowL,animation:"fadeIn .2s ease",maxHeight:"90vh",overflowY:"auto" }}>
      {children}
    </div>
  </div>
);

/* ── In-memory "database" ────────────────────────────── */
const DB = {
  users: [
    { id:"admin", email:"admin@clientflow.ca", password:"admin123", name:"Admin", plan:"pro", role:"admin", created:"2026-01-01" },
  ],
  leads: {}, campaigns: {}, messages: {}, bookings: {},
  session: null,

  register(email, password, name, plan) {
    if (this.users.find(u => u.email === email)) return { error: "Cet email est déjà utilisé." };
    const id = "u_" + Date.now();
    const user = { id, email, password, name, plan, role:"user", created: new Date().toISOString().slice(0,10) };
    this.users.push(user);
    this.leads[id] = []; this.campaigns[id] = []; this.messages[id] = []; this.bookings[id] = [];
    this.session = user;
    return { user };
  },
  login(email, password) {
    const user = this.users.find(u => u.email === email && u.password === password);
    if (!user) return { error: "Email ou mot de passe incorrect." };
    this.session = user;
    return { user };
  },
  logout() { this.session = null; },
  getLeads(uid) { return this.leads[uid] || []; },
  addLead(uid, lead) {
    if (!this.leads[uid]) this.leads[uid] = [];
    this.leads[uid].push({ ...lead, id: Date.now(), status:"new", date: new Date().toISOString().slice(0,10) });
  },
  getCampaigns(uid) { return this.campaigns[uid] || []; },
  addCampaign(uid, c) {
    if (!this.campaigns[uid]) this.campaigns[uid] = [];
    this.campaigns[uid].push({ ...c, id: Date.now(), sent:0, replied:0, booked:0, active:true, created: new Date().toISOString().slice(0,10) });
  },
  getMessages(uid) { return this.messages[uid] || []; },
  addMessage(uid, m) {
    if (!this.messages[uid]) this.messages[uid] = [];
    this.messages[uid].push({ ...m, id: Date.now(), date: new Date().toLocaleDateString("fr-CA") });
  },
  getBookings(uid) { return this.bookings[uid] || []; },
  addBooking(uid, b) {
    if (!this.bookings[uid]) this.bookings[uid] = [];
    this.bookings[uid].push({ ...b, id: Date.now(), status:"pending" });
  },
};

/* Seed demo data for admin */
DB.leads["admin"] = [
  { id:1, company:"Mario Pizzeria", owner:"Jean-Pierre Gallo", city:"Montréal", niche:"Restaurant", email:"jp@mario.ca", status:"new", source:"Google Maps", score:94, date:"2026-05-01" },
  { id:2, company:"BarberKing MTL", owner:"Karim Benali", city:"Laval", niche:"Barbier", email:"k@bk.ca", status:"contacted", source:"Instagram", score:88, date:"2026-05-02" },
  { id:3, company:"ImmoVision", owner:"Sophie Tremblay", city:"Québec", niche:"Immobilier", email:"s@immo.qc", status:"replied", source:"Google Maps", score:97, date:"2026-05-02" },
  { id:4, company:"FitCoach Pro", owner:"Alex Dumont", city:"Montréal", niche:"Fitness", email:"a@fit.ca", status:"booked", source:"Instagram", score:82, date:"2026-05-03" },
  { id:5, company:"Sushi Matsu", owner:"Yuki Tanaka", city:"Brossard", niche:"Restaurant", email:"info@matsu.ca", status:"new", source:"Google Maps", score:85, date:"2026-05-04" },
  { id:6, company:"CutsByDave", owner:"David Marchand", city:"Montréal", niche:"Barbier", email:"d@cuts.ca", status:"contacted", source:"Annuaire", score:73, date:"2026-05-05" },
];
DB.campaigns["admin"] = [
  { id:1, name:"Restaurants — Montréal", niche:"Restaurant", city:"Montréal", sent:248, replied:61, booked:14, active:true, created:"2026-05-01" },
  { id:2, name:"Barbiers — Grand MTL", niche:"Barbier", city:"Laval", sent:172, replied:38, booked:9, active:true, created:"2026-05-02" },
  { id:3, name:"Agents Immo — Québec", niche:"Immobilier", city:"Québec", sent:315, replied:84, booked:19, active:false, created:"2026-04-10" },
];
DB.messages["admin"] = [
  { id:1, company:"BarberKing MTL", type:"Initial", body:"Bonjour Karim, j'aide les barbiers à remplir leur agenda automatiquement. Votre établissement m'a semblé idéal. 10 minutes cette semaine ?", status:"replied", date:"3 mai" },
  { id:2, company:"ImmoVision", type:"Initial", body:"Bonjour Sophie, je travaille avec des agents immobiliers pour automatiser leur prospection. Curieuse de voir comment ça fonctionne ?", status:"replied", date:"2 mai" },
  { id:3, company:"FitCoach Pro", type:"Relance J+2", body:"Bonjour Alex, je me permets de revenir — 3 coachs à Montréal ont doublé leurs RDV ce mois-ci sans effort.", status:"booked", date:"4 mai" },
];
DB.bookings["admin"] = [
  { id:1, company:"ImmoVision", owner:"Sophie Tremblay", date:"7 mai", time:"14h00", status:"confirmed", niche:"Immobilier" },
  { id:2, company:"FitCoach Pro", owner:"Alex Dumont", date:"8 mai", time:"10h30", status:"confirmed", niche:"Fitness" },
  { id:3, company:"BarberKing MTL", owner:"Karim Benali", date:"9 mai", time:"16h00", status:"pending", niche:"Barbier" },
];

const NICHE_ICON = { Restaurant:"🍽️", Barbier:"✂️", Immobilier:"🏠", Fitness:"💪", Clinique:"⚕️" };
const PLANS = [
  { id:"starter", name:"Starter", price:49, leads:"100 leads/mois", features:["100 leads/mois","Messages IA","Email outreach","Tableau de bord","Support email"], color:T.ink },
  { id:"pro", name:"Pro", price:99, leads:"500 leads/mois", features:["500 leads/mois","Automatisation complète","Relances multi-canaux","Booking automatique","Analytics avancées","Support prioritaire"], color:T.blue, popular:true },
  { id:"business", name:"Business", price:199, leads:"Leads illimités", features:["Leads illimités","IA dédiée","Onboarding personnalisé","SLA 99.9%","Manager dédié","API access"], color:T.purple },
];

/* ═══════════════════════════════════════════════════════
   LANDING PAGE
═══════════════════════════════════════════════════════ */
function Landing({ onLogin, onSignup }) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div style={{ fontFamily:"'Inter',system-ui,sans-serif", background:T.white, color:T.ink, minHeight:"100vh" }}>
      <style>{STYLES}</style>

      {/* NAV */}
      <nav style={{ position:"sticky",top:0,zIndex:99,background:"rgba(255,255,255,.92)",backdropFilter:"blur(20px)",borderBottom:`1px solid ${T.light}`,display:"flex",alignItems:"center",justifyContent:"space-between",padding:"0 48px",height:60 }}>
        <div style={{ display:"flex",alignItems:"center",gap:8 }}>
          <div style={{ width:30,height:30,borderRadius:9,background:T.ink,display:"flex",alignItems:"center",justifyContent:"center" }}>
            <span style={{ color:T.white,fontWeight:800,fontSize:15 }}>C</span>
          </div>
          <span style={{ fontWeight:800,fontSize:16,letterSpacing:"-0.3px" }}>ClientFlow</span>
        </div>
        <div style={{ display:"flex",gap:10 }}>
          <Btn variant="secondary" size="sm" onClick={onLogin}>Connexion</Btn>
          <Btn variant="primary" size="sm" onClick={onSignup}>Commencer gratuitement</Btn>
        </div>
      </nav>

      {/* HERO */}
      <section style={{ maxWidth:860,margin:"0 auto",padding:"96px 40px 72px",textAlign:"center" }}>
        <div style={{ display:"inline-flex",alignItems:"center",gap:7,background:T.blueL,borderRadius:20,padding:"4px 14px",marginBottom:24 }}>
          <span style={{ width:7,height:7,borderRadius:"50%",background:T.blue,animation:"pulse 2s infinite",flexShrink:0 }}/>
          <span style={{ color:T.blue,fontSize:13,fontWeight:600 }}>Système actif · 3 leads générés ces 10 dernières min</span>
        </div>
        <h1 style={{ fontSize:58,fontWeight:800,letterSpacing:"-2px",lineHeight:1.07,marginBottom:18 }}>
          Plus de clients.<br /><span style={{ color:T.blue }}>Zéro effort.</span>
        </h1>
        <p style={{ fontSize:18,color:T.sub,lineHeight:1.65,maxWidth:540,margin:"0 auto 36px" }}>
          ClientFlow trouve vos prospects locaux, envoie des messages personnalisés, relance automatiquement et prend les rendez-vous — sans que vous ayez à lever le petit doigt.
        </p>
        <div style={{ display:"flex",gap:10,justifyContent:"center",flexWrap:"wrap" }}>
          <Btn variant="primary" size="lg" onClick={onSignup} style={{ borderRadius:40,padding:"14px 36px",fontSize:16 }}>Essai gratuit 14 jours →</Btn>
          <Btn variant="secondary" size="lg" onClick={onLogin} style={{ borderRadius:40,padding:"14px 36px",fontSize:16 }}>Se connecter</Btn>
        </div>
        <p style={{ color:T.muted,fontSize:13,marginTop:14 }}>Aucune carte requise · Annulation à tout moment · RGPD conforme</p>
      </section>

      {/* STATS */}
      <div style={{ background:T.bg,borderTop:`1px solid ${T.light}`,borderBottom:`1px solid ${T.light}` }}>
        <div style={{ maxWidth:760,margin:"0 auto",padding:"28px 40px",display:"flex",justifyContent:"space-around",flexWrap:"wrap",gap:16 }}>
          {[["3 200+","Entreprises actives"],["94%","Taux de satisfaction"],["8×","ROI moyen"],["48h","Premiers résultats"]].map(([n,l]) => (
            <div key={l} style={{ textAlign:"center" }}>
              <div style={{ fontSize:26,fontWeight:800,letterSpacing:"-0.8px" }}>{n}</div>
              <div style={{ fontSize:13,color:T.sub,marginTop:3 }}>{l}</div>
            </div>
          ))}
        </div>
      </div>

      {/* HOW IT WORKS */}
      <section style={{ maxWidth:760,margin:"0 auto",padding:"72px 40px" }}>
        <h2 style={{ fontSize:34,fontWeight:800,letterSpacing:"-1px",textAlign:"center",marginBottom:48 }}>Comment ça fonctionne</h2>
        <div style={{ display:"flex",flexDirection:"column",gap:0 }}>
          {[
            ["01","Vous configurez une fois","Secteur, ville, objectif. 5 minutes max. C'est tout ce que vous faites."],
            ["02","Le système scrape les prospects","Google Maps, Instagram, annuaires — des centaines de prospects qualifiés chaque jour automatiquement."],
            ["03","L'IA contacte et relance","Messages personnalisés envoyés automatiquement. Relances à J+2 et J+5 sans la moindre intervention."],
            ["04","Vous recevez des rendez-vous","Les prospects intéressés réservent directement dans votre calendrier. Vous n'avez plus qu'à les rencontrer."],
          ].map(([n,t,d],i,arr) => (
            <div key={n} style={{ display:"flex",gap:24,padding:"24px 0",borderBottom:i<arr.length-1?`1px solid ${T.light}`:"none" }}>
              <div style={{ fontSize:13,fontWeight:700,color:T.muted,width:28,flexShrink:0,paddingTop:3 }}>{n}</div>
              <div><div style={{ fontSize:17,fontWeight:700,marginBottom:5 }}>{t}</div><div style={{ fontSize:14,color:T.sub,lineHeight:1.6 }}>{d}</div></div>
            </div>
          ))}
        </div>
      </section>

      {/* FEATURES */}
      <div style={{ background:T.bg,borderTop:`1px solid ${T.light}`,borderBottom:`1px solid ${T.light}` }}>
        <section style={{ maxWidth:940,margin:"0 auto",padding:"72px 40px" }}>
          <h2 style={{ fontSize:34,fontWeight:800,letterSpacing:"-1px",textAlign:"center",marginBottom:48 }}>Tout automatisé. Vraiment.</h2>
          <div style={{ display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:16 }}>
            {[
              ["◈","Scraping automatique","Google Maps, Instagram, annuaires locaux — scanné chaque jour sans intervention."],
              ["✦","Messages IA","Chaque message rédigé sur mesure pour le secteur, la ville et le profil du prospect."],
              ["↺","Relances J+2 / J+5","Relances automatiques au bon moment pour maximiser les réponses."],
              ["◉","Booking automatique","Lien de réservation envoyé dès qu'un prospect répond positivement."],
              ["▲","Analytics temps réel","Taux de réponse, coût par lead, revenus — tout centralisé en temps réel."],
              ["⬡","Multi-canaux","Email, DM Instagram, formulaire web — le canal optimal choisi automatiquement."],
            ].map(([icon,title,desc]) => (
              <div key={title} style={{ background:T.white,border:`1px solid ${T.border}`,borderRadius:12,padding:24,boxShadow:T.shadow }}>
                <div style={{ width:36,height:36,borderRadius:10,background:T.bg,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,marginBottom:12 }}>{icon}</div>
                <div style={{ fontSize:14,fontWeight:700,marginBottom:6 }}>{title}</div>
                <div style={{ fontSize:13,color:T.sub,lineHeight:1.6 }}>{desc}</div>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* PRICING */}
      <section style={{ maxWidth:900,margin:"0 auto",padding:"72px 40px" }}>
        <h2 style={{ fontSize:34,fontWeight:800,letterSpacing:"-1px",textAlign:"center",marginBottom:10 }}>Tarifs simples et transparents</h2>
        <p style={{ textAlign:"center",color:T.sub,fontSize:15,marginBottom:44 }}>Pas de frais cachés. Annulation à tout moment.</p>
        <div style={{ display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:16,alignItems:"start" }}>
          {PLANS.map(p => (
            <div key={p.id} style={{ borderRadius:16,border:`1.5px solid ${p.popular?T.ink:T.border}`,padding:"28px 24px",background:p.popular?T.ink:T.white,boxShadow:p.popular?T.shadowL:T.shadow,position:"relative" }}>
              {p.popular && <div style={{ position:"absolute",top:-12,left:"50%",transform:"translateX(-50%)",background:T.blue,color:T.white,borderRadius:20,padding:"3px 14px",fontSize:12,fontWeight:700,whiteSpace:"nowrap" }}>Le plus populaire</div>}
              <div style={{ color:p.popular?T.white:T.ink,fontSize:16,fontWeight:700,marginBottom:4 }}>{p.name}</div>
              <div style={{ display:"flex",alignItems:"baseline",gap:4,marginBottom:4 }}>
                <span style={{ fontSize:36,fontWeight:800,color:p.popular?T.white:T.ink,letterSpacing:"-1px" }}>{p.price}$</span>
                <span style={{ color:p.popular?"rgba(255,255,255,.55)":T.sub,fontSize:13 }}>/mois</span>
              </div>
              <div style={{ fontSize:13,color:p.popular?"rgba(255,255,255,.6)":T.sub,marginBottom:20 }}>{p.leads}</div>
              <div style={{ display:"flex",flexDirection:"column",gap:8,marginBottom:22 }}>
                {p.features.map(f => (
                  <div key={f} style={{ display:"flex",alignItems:"center",gap:8,fontSize:13,color:p.popular?"rgba(255,255,255,.85)":T.ink }}>
                    <span style={{ color:p.popular?T.white:T.green,flexShrink:0 }}>✓</span>{f}
                  </div>
                ))}
              </div>
              <button onClick={onSignup} style={{ width:"100%",padding:"11px 0",borderRadius:8,fontWeight:600,fontSize:14,cursor:"pointer",border:"none",fontFamily:"inherit",background:p.popular?T.white:T.ink,color:p.popular?T.ink:T.white,transition:"all .15s" }}>
                {p.popular?"Essai gratuit 14 jours":"Commencer"}
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* TESTIMONIALS */}
      <div style={{ background:T.bg,borderTop:`1px solid ${T.light}`,borderBottom:`1px solid ${T.light}` }}>
        <section style={{ maxWidth:900,margin:"0 auto",padding:"72px 40px" }}>
          <h2 style={{ fontSize:34,fontWeight:800,letterSpacing:"-1px",textAlign:"center",marginBottom:44 }}>Ce qu'ils en disent</h2>
          <div style={{ display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:16 }}>
            {[
              ["Mario G.","Restaurateur, Montréal","Depuis que j'utilise ClientFlow, je reçois 3-4 nouvelles demandes par semaine sans rien faire. Incroyable.","🍽️"],
              ["Sophie T.","Agente immobilière, Québec","J'ai signé 2 nouveaux mandats le premier mois. Le système trouve exactement les bons prospects.","🏠"],
              ["Karim B.","Barbier, Laval","Je pensais que c'était trop beau pour être vrai. Maintenant mon agenda est plein 3 semaines à l'avance.","✂️"],
            ].map(([name,role,quote,icon]) => (
              <div key={name} style={{ background:T.white,border:`1px solid ${T.border}`,borderRadius:12,padding:24,boxShadow:T.shadow }}>
                <div style={{ fontSize:22,marginBottom:12 }}>{icon}</div>
                <p style={{ fontSize:14,color:T.ink,lineHeight:1.65,marginBottom:16,fontStyle:"italic" }}>"{quote}"</p>
                <div style={{ fontSize:14,fontWeight:700,color:T.ink }}>{name}</div>
                <div style={{ fontSize:12,color:T.sub }}>{role}</div>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* CTA */}
      <section style={{ background:T.ink,padding:"64px 40px",textAlign:"center" }}>
        <h2 style={{ fontSize:36,fontWeight:800,color:T.white,letterSpacing:"-1px",marginBottom:10 }}>Prêt à automatiser votre prospection ?</h2>
        <p style={{ color:"rgba(255,255,255,.55)",fontSize:15,marginBottom:28 }}>Rejoignez 3 200+ entreprises. Essai gratuit 14 jours, sans carte de crédit.</p>
        <Btn variant="secondary" size="lg" onClick={onSignup} style={{ background:T.white,color:T.ink,borderRadius:40,padding:"14px 40px",fontSize:16 }}>Commencer gratuitement →</Btn>
      </section>

      {/* FOOTER */}
      <footer style={{ borderTop:`1px solid ${T.light}`,padding:"32px 48px" }}>
        <div style={{ maxWidth:1200,margin:"0 auto",display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",gap:24 }}>
          <div>
            <div style={{ display:"flex",alignItems:"center",gap:8,marginBottom:10 }}>
              <div style={{ width:24,height:24,borderRadius:7,background:T.ink,display:"flex",alignItems:"center",justifyContent:"center" }}><span style={{ color:T.white,fontSize:12,fontWeight:800 }}>C</span></div>
              <span style={{ fontWeight:800,fontSize:14 }}>ClientFlow</span>
            </div>
            <p style={{ fontSize:13,color:T.sub,maxWidth:220,lineHeight:1.55 }}>La plateforme de génération de clients automatisée pour les entreprises locales.</p>
          </div>
          <div style={{ display:"flex",gap:48,flexWrap:"wrap" }}>
            {[["Produit",["Fonctionnalités","Tarifs","Démo"]],["Légal",["Politique de confidentialité","Conditions d'utilisation","Cookies"]],["Contact",["hello@clientflow.ca","Support","Partenaires"]]].map(([title,items]) => (
              <div key={title}>
                <div style={{ fontSize:13,fontWeight:700,marginBottom:12 }}>{title}</div>
                {items.map(item => <div key={item} style={{ fontSize:13,color:T.sub,marginBottom:7,cursor:"pointer" }}>{item}</div>)}
              </div>
            ))}
          </div>
        </div>
        <div style={{ maxWidth:1200,margin:"24px auto 0",paddingTop:20,borderTop:`1px solid ${T.light}`,display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:10 }}>
          <span style={{ fontSize:12,color:T.muted }}>© 2026 ClientFlow Inc. Tous droits réservés.</span>
          <span style={{ fontSize:12,color:T.muted }}>Conforme RGPD · Hébergé au Canada 🇨🇦</span>
        </div>
      </footer>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   AUTH — LOGIN & SIGNUP
═══════════════════════════════════════════════════════ */
function AuthScreen({ mode: initMode, onAuth, onBack }) {
  const [mode, setMode] = useState(initMode || "login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [plan, setPlan] = useState("pro");
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);

  const validate = () => {
    const e = {};
    if (mode === "signup" && !name.trim()) e.name = "Nom requis";
    if (!email.includes("@")) e.email = "Email invalide";
    if (password.length < 6) e.password = "6 caractères minimum";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = async () => {
    if (!validate()) return;
    setLoading(true);
    await new Promise(r => setTimeout(r, 600));
    if (mode === "login") {
      const res = DB.login(email, password);
      if (res.error) { setErrors({ general: res.error }); setLoading(false); return; }
      onAuth(res.user);
    } else {
      if (step === 1) { setStep(2); setLoading(false); return; }
      const res = DB.register(email, password, name, plan);
      if (res.error) { setErrors({ general: res.error }); setLoading(false); return; }
      onAuth(res.user);
    }
    setLoading(false);
  };

  return (
    <div style={{ minHeight:"100vh",background:T.bg,display:"flex",alignItems:"center",justifyContent:"center",padding:16 }}>
      <style>{STYLES}</style>
      <div style={{ width:460,background:T.white,borderRadius:20,border:`1px solid ${T.border}`,boxShadow:T.shadowL,overflow:"hidden" }}>
        {/* Header */}
        <div style={{ padding:"24px 28px 20px",borderBottom:`1px solid ${T.light}` }}>
          <div style={{ display:"flex",alignItems:"center",gap:8,marginBottom:16 }}>
            <div style={{ width:28,height:28,borderRadius:8,background:T.ink,display:"flex",alignItems:"center",justifyContent:"center" }}><span style={{ color:T.white,fontWeight:800,fontSize:14 }}>C</span></div>
            <span style={{ fontWeight:800,fontSize:15 }}>ClientFlow</span>
          </div>
          <h2 style={{ fontSize:20,fontWeight:800,letterSpacing:"-0.4px",marginBottom:4 }}>
            {mode === "login" ? "Connexion" : step === 1 ? "Créer un compte" : "Choisir votre plan"}
          </h2>
          <p style={{ fontSize:13,color:T.sub }}>
            {mode === "login" ? "Accédez à votre tableau de bord" : step === 1 ? "Commencez votre essai gratuit de 14 jours" : "Sélectionnez le plan adapté à vos besoins"}
          </p>
        </div>

        <div style={{ padding:"24px 28px" }}>
          {errors.general && (
            <div style={{ background:T.redL,border:`1px solid #F5C6CB`,borderRadius:8,padding:"10px 14px",marginBottom:16,fontSize:13,color:T.red }}>{errors.general}</div>
          )}

          {/* LOGIN FORM */}
          {mode === "login" && (
            <div style={{ display:"flex",flexDirection:"column",gap:14 }}>
              <Input label="Email" type="email" placeholder="vous@exemple.ca" value={email} onChange={e=>setEmail(e.target.value)} error={errors.email} icon="✉" />
              <Input label="Mot de passe" type="password" placeholder="••••••••" value={password} onChange={e=>setPassword(e.target.value)} error={errors.password} icon="🔒" />
              <div style={{ textAlign:"right" }}><span style={{ fontSize:13,color:T.blue,cursor:"pointer" }}>Mot de passe oublié ?</span></div>
              <Btn variant="primary" size="lg" onClick={submit} disabled={loading} style={{ width:"100%",justifyContent:"center",borderRadius:10 }}>
                {loading ? <><Spin s={15} c={T.white}/>Connexion…</> : "Se connecter"}
              </Btn>
              <div style={{ textAlign:"center",fontSize:13,color:T.sub }}>
                Pas encore de compte ?{" "}
                <span style={{ color:T.blue,cursor:"pointer",fontWeight:600 }} onClick={() => { setMode("signup"); setErrors({}); setStep(1); }}>Créer un compte</span>
              </div>
              <div style={{ borderTop:`1px solid ${T.light}`,paddingTop:14,textAlign:"center" }}>
                <div style={{ fontSize:12,color:T.muted,marginBottom:10 }}>Compte démo</div>
                <Btn variant="secondary" size="sm" onClick={() => { setEmail("admin@clientflow.ca"); setPassword("admin123"); }}>
                  Remplir avec admin@clientflow.ca
                </Btn>
              </div>
            </div>
          )}

          {/* SIGNUP STEP 1 */}
          {mode === "signup" && step === 1 && (
            <div style={{ display:"flex",flexDirection:"column",gap:14 }}>
              <Input label="Nom complet" placeholder="Jean Tremblay" value={name} onChange={e=>setName(e.target.value)} error={errors.name} icon="👤" />
              <Input label="Email professionnel" type="email" placeholder="vous@exemple.ca" value={email} onChange={e=>setEmail(e.target.value)} error={errors.email} icon="✉" />
              <Input label="Mot de passe" type="password" placeholder="6 caractères minimum" value={password} onChange={e=>setPassword(e.target.value)} error={errors.password} icon="🔒" />
              <p style={{ fontSize:12,color:T.muted,lineHeight:1.5 }}>En créant un compte, vous acceptez nos <span style={{ color:T.blue,cursor:"pointer" }}>Conditions d'utilisation</span> et notre <span style={{ color:T.blue,cursor:"pointer" }}>Politique de confidentialité</span>.</p>
              <Btn variant="primary" size="lg" onClick={submit} disabled={loading} style={{ width:"100%",justifyContent:"center",borderRadius:10 }}>
                {loading ? <><Spin s={15} c={T.white}/>Chargement…</> : "Continuer →"}
              </Btn>
              <div style={{ textAlign:"center",fontSize:13,color:T.sub }}>
                Déjà un compte ?{" "}
                <span style={{ color:T.blue,cursor:"pointer",fontWeight:600 }} onClick={() => { setMode("login"); setErrors({}); }}>Se connecter</span>
              </div>
            </div>
          )}

          {/* SIGNUP STEP 2 — PLAN */}
          {mode === "signup" && step === 2 && (
            <div style={{ display:"flex",flexDirection:"column",gap:10 }}>
              {PLANS.map(p => (
                <button key={p.id} onClick={() => setPlan(p.id)}
                  style={{ display:"flex",alignItems:"center",justifyContent:"space-between",padding:"14px 16px",borderRadius:10,border:`1.5px solid ${plan===p.id?T.ink:T.border}`,background:plan===p.id?T.ink:T.white,cursor:"pointer",fontFamily:"inherit",transition:"all .15s" }}>
                  <div style={{ textAlign:"left" }}>
                    <div style={{ fontSize:14,fontWeight:700,color:plan===p.id?T.white:T.ink }}>{p.name} {p.popular && <span style={{ fontSize:11,background:T.blue,color:T.white,borderRadius:10,padding:"1px 7px",marginLeft:6 }}>Populaire</span>}</div>
                    <div style={{ fontSize:12,color:plan===p.id?"rgba(255,255,255,.6)":T.sub }}>{p.leads}</div>
                  </div>
                  <div style={{ fontSize:17,fontWeight:800,color:plan===p.id?T.white:T.ink }}>{p.price}$<span style={{ fontSize:12,fontWeight:400 }}>/m</span></div>
                </button>
              ))}
              <Btn variant="primary" size="lg" onClick={submit} disabled={loading} style={{ width:"100%",justifyContent:"center",borderRadius:10,marginTop:6 }}>
                {loading ? <><Spin s={15} c={T.white}/>Création…</> : "Créer mon compte →"}
              </Btn>
              <button onClick={() => setStep(1)} style={{ background:"none",border:"none",color:T.sub,fontSize:13,cursor:"pointer",fontFamily:"inherit",textAlign:"center" }}>← Retour</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   ONBOARDING
═══════════════════════════════════════════════════════ */
function Onboarding({ user, onDone }) {
  const [step, setStep] = useState(0);
  const [niche, setNiche] = useState("");
  const [city, setCity] = useState("");
  const [goal, setGoal] = useState("");

  const steps = ["Bienvenue","Votre niche","Votre marché","Objectif"];
  const niches = [["🍽️","Restaurant"],["✂️","Barbier / Coiffeur"],["🏠","Immobilier"],["💪","Fitness / Coach"],["⚕️","Clinique / Santé"],["⬡","Autre"]];
  const goals = ["5 nouveaux clients / mois","10 nouveaux clients / mois","20+ nouveaux clients / mois"];

  return (
    <div style={{ minHeight:"100vh",background:T.bg,display:"flex",alignItems:"center",justifyContent:"center",padding:16 }}>
      <style>{STYLES}</style>
      <div style={{ width:500,background:T.white,borderRadius:20,border:`1px solid ${T.border}`,boxShadow:T.shadowL,overflow:"hidden",animation:"fadeIn .3s ease" }}>
        {/* Steps */}
        <div style={{ padding:"18px 28px",borderBottom:`1px solid ${T.light}`,display:"flex",alignItems:"center",gap:6 }}>
          {steps.map((s,i) => (
            <div key={i} style={{ display:"flex",alignItems:"center",gap:6,flex:i<steps.length-1?1:"auto" }}>
              <div style={{ width:22,height:22,borderRadius:"50%",background:i<step?T.green:i===step?T.ink:T.bg,border:`1px solid ${i<step?T.green:i===step?T.ink:T.border}`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,transition:"all .2s" }}>
                {i<step?<span style={{ color:T.white,fontSize:11 }}>✓</span>:<span style={{ color:i===step?T.white:T.muted,fontSize:10,fontWeight:700 }}>{i+1}</span>}
              </div>
              <span style={{ fontSize:12,fontWeight:500,color:i===step?T.ink:T.muted,whiteSpace:"nowrap" }}>{s}</span>
              {i<steps.length-1 && <div style={{ flex:1,height:1,background:T.light }}/>}
            </div>
          ))}
        </div>

        <div style={{ padding:"30px 34px 26px" }}>
          {step===0 && (
            <div style={{ textAlign:"center" }}>
              <div style={{ fontSize:40,marginBottom:12 }}>👋</div>
              <h2 style={{ fontSize:21,fontWeight:800,letterSpacing:"-0.4px",marginBottom:8 }}>Bienvenue, {user.name.split(" ")[0]} !</h2>
              <p style={{ color:T.sub,fontSize:14,lineHeight:1.65,marginBottom:24 }}>Configurez votre système en 3 minutes. Il trouvera des clients pour vous — automatiquement, 24h/24, 7j/7.</p>
              <div style={{ background:T.bg,borderRadius:10,padding:"12px 16px",textAlign:"left",marginBottom:24 }}>
                {["Recherche automatique de prospects","Messages IA personnalisés","Relances intelligentes J+2, J+5","Prise de rendez-vous automatique"].map(f => (
                  <div key={f} style={{ display:"flex",alignItems:"center",gap:9,padding:"6px 0",borderBottom:`1px solid ${T.light}`,fontSize:13 }}><span style={{ color:T.green }}>✓</span>{f}</div>
                ))}
              </div>
            </div>
          )}

          {step===1 && (
            <div>
              <h2 style={{ fontSize:19,fontWeight:800,marginBottom:5 }}>Quelle niche ciblez-vous ?</h2>
              <p style={{ color:T.sub,fontSize:13,marginBottom:18 }}>Quel type d'entreprise souhaitez-vous prospecter ?</p>
              <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:8 }}>
                {niches.map(([icon,n]) => (
                  <button key={n} onClick={() => setNiche(n)} style={{ display:"flex",alignItems:"center",gap:10,padding:"12px 14px",borderRadius:10,border:`1.5px solid ${niche===n?T.ink:T.border}`,background:niche===n?T.ink:T.white,cursor:"pointer",fontFamily:"inherit",transition:"all .15s" }}>
                    <span style={{ fontSize:18 }}>{icon}</span>
                    <span style={{ fontSize:13,fontWeight:600,color:niche===n?T.white:T.ink }}>{n}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {step===2 && (
            <div>
              <h2 style={{ fontSize:19,fontWeight:800,marginBottom:5 }}>Votre marché cible</h2>
              <p style={{ color:T.sub,fontSize:13,marginBottom:18 }}>Dans quelle ville ou région voulez-vous prospecter ?</p>
              <Input label="Ville principale" placeholder="Ex: Montréal, Laval, Québec…" value={city} onChange={e=>setCity(e.target.value)} />
              <div style={{ background:T.blueL,borderRadius:8,padding:"10px 14px",marginTop:14,fontSize:13,color:T.blue }}>
                💡 Commencez avec une seule ville pour valider votre marché, puis élargissez.
              </div>
            </div>
          )}

          {step===3 && (
            <div>
              <h2 style={{ fontSize:19,fontWeight:800,marginBottom:5 }}>Quel est votre objectif ?</h2>
              <p style={{ color:T.sub,fontSize:13,marginBottom:18 }}>Combien de nouveaux clients visez-vous par mois ?</p>
              <div style={{ display:"flex",flexDirection:"column",gap:9 }}>
                {goals.map(g => (
                  <button key={g} onClick={() => setGoal(g)} style={{ padding:"14px 16px",borderRadius:10,border:`1.5px solid ${goal===g?T.ink:T.border}`,background:goal===g?T.ink:T.white,cursor:"pointer",fontFamily:"inherit",fontSize:14,fontWeight:600,color:goal===g?T.white:T.ink,textAlign:"left",transition:"all .15s" }}>{g}</button>
                ))}
              </div>
            </div>
          )}

          <div style={{ display:"flex",gap:8,marginTop:20 }}>
            {step>0 && <Btn variant="secondary" size="md" onClick={() => setStep(s=>s-1)} style={{ flex:1 }}>Retour</Btn>}
            <Btn variant="primary" size="md" onClick={() => step<3?setStep(s=>s+1):onDone()} style={{ flex:2,justifyContent:"center" }}
              disabled={(step===1&&!niche)||(step===2&&!city)||(step===3&&!goal)}>
              {step<3?"Continuer →":"Lancer ClientFlow ⚡"}
            </Btn>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   STRIPE CHECKOUT MODAL
═══════════════════════════════════════════════════════ */
function StripeModal({ plan, user, onClose, onSuccess }) {
  const [card, setCard] = useState({ number:"", expiry:"", cvc:"", name:"" });
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  const formatCard = v => v.replace(/\D/g,"").replace(/(.{4})/g,"$1 ").trim().slice(0,19);
  const formatExpiry = v => v.replace(/\D/g,"").replace(/^(.{2})(.*)$/,"$1/$2").slice(0,5);

  const pay = async () => {
    if (!card.number.replace(/\s/g,"").match(/^\d{16}$/)) { setError("Numéro de carte invalide"); return; }
    if (!card.expiry.match(/^\d{2}\/\d{2}$/)) { setError("Date d'expiration invalide"); return; }
    if (!card.cvc.match(/^\d{3,4}$/)) { setError("CVC invalide"); return; }
    if (!card.name.trim()) { setError("Nom requis"); return; }
    setError(""); setLoading(true);
    await new Promise(r => setTimeout(r, 1800));
    setLoading(false); setDone(true);
    setTimeout(() => { onSuccess(); }, 1500);
  };

  const p = PLANS.find(p => p.id === plan) || PLANS[1];

  return (
    <Modal onClose={onClose} width={440}>
      <div style={{ padding:"22px 26px",borderBottom:`1px solid ${T.light}`,display:"flex",justifyContent:"space-between",alignItems:"center" }}>
        <div>
          <div style={{ fontSize:15,fontWeight:700 }}>Paiement sécurisé</div>
          <div style={{ fontSize:13,color:T.sub }}>Plan {p.name} · {p.price}$/mois</div>
        </div>
        <button onClick={onClose} style={{ background:"none",border:"none",color:T.muted,cursor:"pointer",fontSize:20 }}>×</button>
      </div>

      {done ? (
        <div style={{ padding:32,textAlign:"center" }}>
          <div style={{ fontSize:42,marginBottom:12 }}>✅</div>
          <div style={{ fontSize:18,fontWeight:800,marginBottom:6 }}>Paiement accepté !</div>
          <div style={{ fontSize:14,color:T.sub }}>Votre plan {p.name} est activé. Redirection…</div>
        </div>
      ) : (
        <div style={{ padding:"22px 26px" }}>
          {/* Order summary */}
          <div style={{ background:T.bg,borderRadius:10,padding:"14px 16px",marginBottom:20 }}>
            <div style={{ display:"flex",justifyContent:"space-between",marginBottom:6 }}>
              <span style={{ fontSize:13,color:T.sub }}>Plan {p.name}</span>
              <span style={{ fontSize:13,fontWeight:600 }}>{p.price}$/mois</span>
            </div>
            <div style={{ display:"flex",justifyContent:"space-between",marginBottom:6 }}>
              <span style={{ fontSize:13,color:T.sub }}>Essai gratuit</span>
              <span style={{ fontSize:13,color:T.green,fontWeight:600 }}>14 jours</span>
            </div>
            <div style={{ borderTop:`1px solid ${T.border}`,marginTop:8,paddingTop:8,display:"flex",justifyContent:"space-between" }}>
              <span style={{ fontSize:13,fontWeight:700 }}>Aujourd'hui</span>
              <span style={{ fontSize:13,fontWeight:700,color:T.green }}>0.00$</span>
            </div>
          </div>

          {error && <div style={{ background:T.redL,borderRadius:8,padding:"9px 14px",marginBottom:14,fontSize:13,color:T.red }}>{error}</div>}

          <div style={{ display:"flex",flexDirection:"column",gap:12 }}>
            <div>
              <label style={{ fontSize:13,fontWeight:600,display:"block",marginBottom:5 }}>Numéro de carte</label>
              <div style={{ position:"relative" }}>
                <input value={card.number} onChange={e => setCard({...card,number:formatCard(e.target.value)})} placeholder="1234 5678 9012 3456" maxLength={19}
                  style={{ width:"100%",border:`1px solid ${T.border}`,borderRadius:8,padding:"9px 40px 9px 14px",fontSize:14,fontFamily:"'Courier New',monospace",color:T.ink,background:T.white,outline:"none" }} />
                <span style={{ position:"absolute",right:12,top:"50%",transform:"translateY(-50%)",fontSize:18 }}>💳</span>
              </div>
            </div>
            <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:10 }}>
              <div>
                <label style={{ fontSize:13,fontWeight:600,display:"block",marginBottom:5 }}>Date d'expiration</label>
                <input value={card.expiry} onChange={e => setCard({...card,expiry:formatExpiry(e.target.value)})} placeholder="MM/AA" maxLength={5}
                  style={{ width:"100%",border:`1px solid ${T.border}`,borderRadius:8,padding:"9px 14px",fontSize:14,color:T.ink,fontFamily:"inherit",background:T.white,outline:"none" }} />
              </div>
              <div>
                <label style={{ fontSize:13,fontWeight:600,display:"block",marginBottom:5 }}>CVC</label>
                <input value={card.cvc} onChange={e => setCard({...card,cvc:e.target.value.replace(/\D/g,"").slice(0,4)})} placeholder="123" maxLength={4}
                  style={{ width:"100%",border:`1px solid ${T.border}`,borderRadius:8,padding:"9px 14px",fontSize:14,color:T.ink,fontFamily:"inherit",background:T.white,outline:"none" }} />
              </div>
            </div>
            <div>
              <label style={{ fontSize:13,fontWeight:600,display:"block",marginBottom:5 }}>Nom sur la carte</label>
              <input value={card.name} onChange={e => setCard({...card,name:e.target.value})} placeholder="Jean Tremblay"
                style={{ width:"100%",border:`1px solid ${T.border}`,borderRadius:8,padding:"9px 14px",fontSize:14,color:T.ink,fontFamily:"inherit",background:T.white,outline:"none" }} />
            </div>
            <Btn variant="blue" size="lg" onClick={pay} disabled={loading} style={{ width:"100%",justifyContent:"center",borderRadius:10,marginTop:4 }}>
              {loading ? <><Spin s={15} c={T.white}/>Traitement…</> : `Activer le plan ${p.name}`}
            </Btn>
          </div>
          <div style={{ display:"flex",alignItems:"center",justifyContent:"center",gap:8,marginTop:14 }}>
            <span style={{ fontSize:12,color:T.muted }}>🔒 Sécurisé par Stripe · SSL 256-bit</span>
          </div>
          <div style={{ display:"flex",justifyContent:"center",gap:12,marginTop:8 }}>
            {["💳 Visa","💳 MC","💳 Amex","💳 Interac"].map(m => <span key={m} style={{ fontSize:11,color:T.muted }}>{m}</span>)}
          </div>
        </div>
      )}
    </Modal>
  );
}

/* ═══════════════════════════════════════════════════════
   DASHBOARD — ADD LEAD MODAL
═══════════════════════════════════════════════════════ */
function AddLeadModal({ uid, onClose, onAdded }) {
  const [form, setForm] = useState({ company:"", owner:"", city:"", niche:"Restaurant", email:"", source:"Manuel", score:80 });
  const f = (k, v) => setForm(prev => ({...prev,[k]:v}));

  const save = () => {
    if (!form.company || !form.owner || !form.city) return;
    DB.addLead(uid, form);
    onAdded();
    onClose();
  };

  return (
    <Modal onClose={onClose}>
      <div style={{ padding:"18px 22px",borderBottom:`1px solid ${T.light}`,display:"flex",justifyContent:"space-between",alignItems:"center" }}>
        <div style={{ fontSize:15,fontWeight:700 }}>Ajouter un lead</div>
        <button onClick={onClose} style={{ background:"none",border:"none",color:T.muted,cursor:"pointer",fontSize:20 }}>×</button>
      </div>
      <div style={{ padding:"20px 22px",display:"flex",flexDirection:"column",gap:12 }}>
        <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:12 }}>
          <Input label="Entreprise*" placeholder="Mario Pizzeria" value={form.company} onChange={e=>f("company",e.target.value)} />
          <Input label="Propriétaire*" placeholder="Jean Dupont" value={form.owner} onChange={e=>f("owner",e.target.value)} />
        </div>
        <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:12 }}>
          <Input label="Ville*" placeholder="Montréal" value={form.city} onChange={e=>f("city",e.target.value)} />
          <div>
            <label style={{ fontSize:13,fontWeight:600,display:"block",marginBottom:5 }}>Niche</label>
            <select value={form.niche} onChange={e=>f("niche",e.target.value)} style={{ width:"100%",border:`1px solid ${T.border}`,borderRadius:8,padding:"9px 14px",fontSize:14,color:T.ink,fontFamily:"inherit",background:T.white,outline:"none" }}>
              {["Restaurant","Barbier","Immobilier","Fitness","Clinique","Autre"].map(n=><option key={n}>{n}</option>)}
            </select>
          </div>
        </div>
        <Input label="Email" type="email" placeholder="contact@exemple.ca" value={form.email} onChange={e=>f("email",e.target.value)} />
        <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:12 }}>
          <div>
            <label style={{ fontSize:13,fontWeight:600,display:"block",marginBottom:5 }}>Source</label>
            <select value={form.source} onChange={e=>f("source",e.target.value)} style={{ width:"100%",border:`1px solid ${T.border}`,borderRadius:8,padding:"9px 14px",fontSize:14,color:T.ink,fontFamily:"inherit",background:T.white,outline:"none" }}>
              {["Google Maps","Instagram","Annuaire","Manuel","Référence"].map(s=><option key={s}>{s}</option>)}
            </select>
          </div>
          <Input label="Score (0-100)" type="number" placeholder="80" value={form.score} onChange={e=>f("score",parseInt(e.target.value)||0)} />
        </div>
        <div style={{ display:"flex",gap:10,marginTop:6 }}>
          <Btn variant="secondary" size="md" onClick={onClose} style={{ flex:1 }}>Annuler</Btn>
          <Btn variant="primary" size="md" onClick={save} disabled={!form.company||!form.owner||!form.city} style={{ flex:2,justifyContent:"center" }}>Ajouter le lead</Btn>
        </div>
      </div>
    </Modal>
  );
}

/* ═══════════════════════════════════════════════════════
   DASHBOARD — MESSAGE MODAL (AI)
═══════════════════════════════════════════════════════ */
function MsgModal({ lead, uid, onClose }) {
  const [body, setBody] = useState("");
  const [mtype, setMtype] = useState("initial");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const gen = async (t) => {
    setMtype(t); setLoading(true); setBody(""); setSent(false);
    try {
      const r = await fetch(CLAUDE_API, { method:"POST", headers:{
        "Content-Type":"application/json",
        "x-api-key": API_KEY,
        "anthropic-version":"2023-06-01"
      },
        body: JSON.stringify({ model:MODEL, max_tokens:250,
          messages:[{ role:"user", content:`Rédige un message de prospection ${t==="follow"?"de relance J+2 (2 jours après le premier message)":t==="last"?"ultime relance J+5 (court et direct)":"initial (premier contact)"} pour "${lead.company}" (${lead.niche}, ${lead.city}). Propriétaire: ${lead.owner}. 2-3 phrases naturelles, ton amical, professionnel. Objectif: proposer d'augmenter leur clientèle. En français uniquement.` }]
        })
      });
      const d = await r.json();
      setBody(d.content?.map(b=>b.text||"").join("")||"Erreur de génération.");
    } catch { setBody("Erreur de connexion à l'IA."); }
    setLoading(false);
  };

  const send = () => {
    if (!body) return;
    DB.addMessage(uid, { company:lead.company, type:mtype==="initial"?"Initial":mtype==="follow"?"Relance J+2":"Dernier message", body, status:"sent" });
    setSent(true);
  };

  useEffect(() => { gen("initial"); }, []);

  return (
    <Modal onClose={onClose}>
      <div style={{ padding:"18px 22px",borderBottom:`1px solid ${T.light}`,display:"flex",justifyContent:"space-between",alignItems:"center" }}>
        <div><div style={{ fontSize:15,fontWeight:700 }}>Message IA</div><div style={{ fontSize:12,color:T.sub }}>{lead.company} · {lead.niche} · {lead.city}</div></div>
        <button onClick={onClose} style={{ background:"none",border:"none",color:T.muted,cursor:"pointer",fontSize:20 }}>×</button>
      </div>
      <div style={{ padding:"20px 22px" }}>
        <div style={{ display:"flex",gap:6,marginBottom:14 }}>
          {[["initial","Initial"],["follow","Relance J+2"],["last","Dernier"]].map(([id,l]) => (
            <button key={id} onClick={() => gen(id)} style={{ padding:"6px 12px",borderRadius:7,border:`1px solid ${mtype===id?T.ink:T.border}`,background:mtype===id?T.ink:T.white,color:mtype===id?T.white:T.sub,fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"inherit" }}>{l}</button>
          ))}
        </div>
        <div style={{ background:T.bg,borderRadius:10,padding:16,minHeight:90,marginBottom:14,minHeight:80 }}>
          {loading ? <div style={{ display:"flex",alignItems:"center",gap:8,color:T.sub,fontSize:13 }}><Spin s={13}/>Génération en cours…</div>
            : sent ? <div style={{ color:T.green,fontSize:13,fontWeight:600 }}>✓ Message envoyé avec succès !</div>
            : <p style={{ fontSize:13,color:T.ink,lineHeight:1.7 }}>{body}</p>}
        </div>
        <div style={{ display:"flex",gap:8 }}>
          <Btn variant="secondary" size="sm" onClick={() => gen(mtype)} style={{ flex:1 }}>↺ Regénérer</Btn>
          <Btn variant="green" size="sm" onClick={send} disabled={!body||loading||sent} style={{ flex:2,justifyContent:"center" }}>
            {sent?"✓ Envoyé":"✉ Envoyer automatiquement"}
          </Btn>
        </div>
      </div>
    </Modal>
  );
}

/* ═══════════════════════════════════════════════════════
   DASHBOARD — ASSISTANT IA
═══════════════════════════════════════════════════════ */
function Assistant({ user, onClose }) {
  const [msgs, setMsgs] = useState([{ role:"assistant", content:`Bonjour ${user.name.split(" ")[0]} ! Je suis votre assistant ClientFlow. Je peux analyser vos performances, générer des stratégies, rédiger des messages ou répondre à toutes vos questions.` }]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const ref = useRef();
  useEffect(() => { ref.current?.scrollIntoView({ behavior:"smooth" }); }, [msgs]);

  const send = async () => {
    if (!input.trim() || loading) return;
    const um = { role:"user", content:input };
    const h = [...msgs, um];
    setMsgs(h); setInput(""); setLoading(true);
    try {
      const r = await fetch(CLAUDE_API, { method:"POST", headers:{
        "Content-Type":"application/json",
        "x-api-key": API_KEY,
        "anthropic-version":"2023-06-01"
      },
        body: JSON.stringify({ model:MODEL, max_tokens:500, system:`Tu es l'assistant de ClientFlow, un SaaS de génération de leads pour PME locales. L'utilisateur s'appelle ${user.name} et est sur le plan ${user.plan}. Réponds en français, de façon concise et actionnable.`, messages:h })
      });
      const d = await r.json();
      setMsgs(m => [...m, { role:"assistant", content:d.content?.map(b=>b.text||"").join("")||"Erreur." }]);
    } catch { setMsgs(m => [...m, { role:"assistant", content:"Erreur de connexion." }]); }
    setLoading(false);
  };

  return (
    <div style={{ position:"fixed",right:18,bottom:18,width:340,height:500,background:T.white,border:`1px solid ${T.border}`,borderRadius:18,boxShadow:T.shadowL,display:"flex",flexDirection:"column",zIndex:150,overflow:"hidden",animation:"slideIn .2s ease" }}>
      <div style={{ padding:"13px 16px",background:T.ink,display:"flex",justifyContent:"space-between",alignItems:"center" }}>
        <div style={{ display:"flex",alignItems:"center",gap:8 }}>
          <div style={{ width:26,height:26,borderRadius:8,background:"rgba(255,255,255,.15)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:13 }}>✦</div>
          <div><div style={{ color:T.white,fontWeight:700,fontSize:13 }}>Assistant IA</div><div style={{ color:"rgba(255,255,255,.45)",fontSize:11 }}>● En ligne</div></div>
        </div>
        <button onClick={onClose} style={{ background:"none",border:"none",color:"rgba(255,255,255,.45)",cursor:"pointer",fontSize:18 }}>×</button>
      </div>
      <div style={{ flex:1,overflowY:"auto",padding:12,display:"flex",flexDirection:"column",gap:10 }}>
        {msgs.map((m,i) => (
          <div key={i} style={{ display:"flex",justifyContent:m.role==="user"?"flex-end":"flex-start" }}>
            <div style={{ maxWidth:"82%",background:m.role==="user"?T.ink:T.bg,borderRadius:m.role==="user"?"12px 12px 2px 12px":"12px 12px 12px 2px",padding:"9px 12px",color:m.role==="user"?T.white:T.ink,fontSize:13,lineHeight:1.55,whiteSpace:"pre-wrap" }}>{m.content}</div>
          </div>
        ))}
        {loading && <div style={{ display:"flex",alignItems:"center",gap:7,color:T.sub,fontSize:12 }}><Spin s={12}/>Analyse…</div>}
        <div ref={ref}/>
      </div>
      {msgs.length===1 && (
        <div style={{ padding:"0 10px 8px",display:"flex",flexWrap:"wrap",gap:5 }}>
          {["Stratégie pour signer 1er client","Rédige 5 messages restaurant","Analyse mon taux de réponse","Comment augmenter mon MRR ?"].map(a => (
            <button key={a} onClick={() => setInput(a)} style={{ background:T.bg,border:`1px solid ${T.border}`,borderRadius:20,padding:"4px 10px",fontSize:11,color:T.sub,cursor:"pointer",fontFamily:"inherit" }}>{a}</button>
          ))}
        </div>
      )}
      <div style={{ padding:10,borderTop:`1px solid ${T.light}`,display:"flex",gap:7 }}>
        <input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&send()} placeholder="Votre question…"
          style={{ flex:1,background:T.bg,border:`1px solid ${T.border}`,borderRadius:8,padding:"8px 12px",fontSize:13,color:T.ink,fontFamily:"inherit",outline:"none" }}/>
        <button onClick={send} disabled={loading} style={{ width:34,height:34,borderRadius:8,border:"none",background:loading?T.bg:T.ink,color:T.white,cursor:loading?"default":"pointer",fontSize:14,flexShrink:0 }}>→</button>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   DASHBOARD — SETTINGS
═══════════════════════════════════════════════════════ */
function Settings({ user, onUpgrade, onLogout }) {
  const [tab, setTab] = useState("profile");
  const [saved, setSaved] = useState(false);
  const plan = PLANS.find(p => p.id === user.plan) || PLANS[1];

  const save = () => { setSaved(true); setTimeout(() => setSaved(false), 2000); };

  return (
    <div>
      <div style={{ display:"flex",gap:6,marginBottom:22 }}>
        {[["profile","Profil"],["plan","Mon plan"],["billing","Facturation"],["legal","Légal"]].map(([id,l]) => (
          <button key={id} onClick={() => setTab(id)} style={{ padding:"7px 14px",borderRadius:7,border:`1px solid ${tab===id?T.ink:T.border}`,background:tab===id?T.ink:T.white,color:tab===id?T.white:T.sub,fontSize:13,fontWeight:500,cursor:"pointer",fontFamily:"inherit" }}>{l}</button>
        ))}
      </div>

      {tab==="profile" && (
        <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:20,maxWidth:640 }}>
          <div style={{ gridColumn:"1/-1",background:T.white,borderRadius:12,border:`1px solid ${T.border}`,padding:"20px 24px",boxShadow:T.shadow }}>
            <div style={{ fontSize:15,fontWeight:700,marginBottom:16 }}>Informations du compte</div>
            <div style={{ display:"flex",flexDirection:"column",gap:12 }}>
              <Input label="Nom complet" value={user.name} onChange={()=>{}} />
              <Input label="Email" type="email" value={user.email} onChange={()=>{}} />
              <Input label="Nouveau mot de passe" type="password" placeholder="Laisser vide pour ne pas changer" onChange={()=>{}} />
              {saved && <div style={{ background:T.greenL,borderRadius:8,padding:"9px 14px",fontSize:13,color:T.green }}>✓ Modifications enregistrées</div>}
              <Btn variant="primary" size="md" onClick={save}>Enregistrer les modifications</Btn>
            </div>
          </div>
        </div>
      )}

      {tab==="plan" && (
        <div style={{ maxWidth:700 }}>
          <div style={{ background:T.blueL,border:`1px solid ${T.blueMid||T.blue}`,borderRadius:12,padding:"18px 22px",marginBottom:20,display:"flex",justifyContent:"space-between",alignItems:"center" }}>
            <div>
              <div style={{ fontSize:14,fontWeight:700,color:T.ink }}>Plan actuel : {plan.name}</div>
              <div style={{ fontSize:13,color:T.sub }}>{plan.leads} · {plan.price}$/mois</div>
            </div>
            <Tag v="active" />
          </div>
          <div style={{ display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:14 }}>
            {PLANS.map(p => (
              <div key={p.id} style={{ background:T.white,border:`1.5px solid ${user.plan===p.id?T.ink:T.border}`,borderRadius:12,padding:"20px 18px",boxShadow:T.shadow }}>
                <div style={{ fontSize:15,fontWeight:700,marginBottom:3 }}>{p.name}</div>
                <div style={{ fontSize:24,fontWeight:800,marginBottom:3 }}>{p.price}$<span style={{ fontSize:13,fontWeight:400,color:T.sub }}>/m</span></div>
                <div style={{ fontSize:12,color:T.sub,marginBottom:14 }}>{p.leads}</div>
                {user.plan===p.id
                  ? <div style={{ fontSize:13,fontWeight:600,color:T.green,textAlign:"center" }}>✓ Plan actuel</div>
                  : <Btn variant="primary" size="sm" onClick={() => onUpgrade(p.id)} style={{ width:"100%",justifyContent:"center" }}>{p.price>plan.price?"Mettre à niveau":"Rétrograder"}</Btn>
                }
              </div>
            ))}
          </div>
        </div>
      )}

      {tab==="billing" && (
        <div style={{ maxWidth:600 }}>
          <div style={{ background:T.white,borderRadius:12,border:`1px solid ${T.border}`,padding:"20px 24px",boxShadow:T.shadow,marginBottom:16 }}>
            <div style={{ fontSize:15,fontWeight:700,marginBottom:16 }}>Méthode de paiement</div>
            <div style={{ display:"flex",alignItems:"center",gap:12,padding:"12px 16px",background:T.bg,borderRadius:8,marginBottom:14 }}>
              <span style={{ fontSize:22 }}>💳</span>
              <div><div style={{ fontSize:13,fontWeight:600 }}>Visa •••• 4242</div><div style={{ fontSize:12,color:T.sub }}>Expire 12/28</div></div>
              <Btn variant="secondary" size="sm" style={{ marginLeft:"auto" }}>Modifier</Btn>
            </div>
            <Btn variant="secondary" size="sm">+ Ajouter une carte</Btn>
          </div>
          <div style={{ background:T.white,borderRadius:12,border:`1px solid ${T.border}`,padding:"20px 24px",boxShadow:T.shadow }}>
            <div style={{ fontSize:15,fontWeight:700,marginBottom:14 }}>Historique des factures</div>
            {[["6 mai 2026","Plan Pro","99.00$","Payé"],["6 avr 2026","Plan Pro","99.00$","Payé"],["6 mar 2026","Plan Pro","99.00$","Payé"]].map(([date,desc,amt,status]) => (
              <div key={date} style={{ display:"flex",alignItems:"center",gap:14,padding:"10px 0",borderBottom:`1px solid ${T.light}` }}>
                <div style={{ flex:1 }}><div style={{ fontSize:13,fontWeight:600 }}>{desc}</div><div style={{ fontSize:12,color:T.sub }}>{date}</div></div>
                <div style={{ fontSize:13,fontWeight:700 }}>{amt}</div>
                <Tag v="confirmed" />
                <button style={{ background:"none",border:"none",color:T.blue,fontSize:12,cursor:"pointer",fontFamily:"inherit" }}>PDF</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab==="legal" && (
        <div style={{ maxWidth:700,display:"flex",flexDirection:"column",gap:16 }}>
          {[
            ["Politique de confidentialité","Dernière mise à jour : 1er mai 2026",`ClientFlow Inc. respecte votre vie privée et s'engage à protéger vos données personnelles.\n\n1. DONNÉES COLLECTÉES\nNous collectons les données que vous nous fournissez lors de l'inscription (nom, email, informations de paiement) ainsi que les données d'utilisation de notre plateforme.\n\n2. UTILISATION DES DONNÉES\nVos données sont utilisées pour fournir et améliorer nos services, traiter vos paiements, et vous communiquer des informations importantes concernant votre compte.\n\n3. PARTAGE DES DONNÉES\nNous ne vendons jamais vos données à des tiers. Nous partageons uniquement les données nécessaires avec nos partenaires de traitement de paiement (Stripe) et d'infrastructure.\n\n4. SÉCURITÉ\nToutes les données sont chiffrées en transit (SSL/TLS) et au repos. Nous suivons les meilleures pratiques de sécurité de l'industrie.\n\n5. VOS DROITS\nVous avez le droit d'accéder, de corriger ou de supprimer vos données à tout moment. Contactez-nous à privacy@clientflow.ca.\n\n6. CONFORMITÉ RGPD\nClientFlow est conforme au Règlement Général sur la Protection des Données (RGPD).`],
            ["Conditions d'utilisation","Dernière mise à jour : 1er mai 2026",`En utilisant ClientFlow, vous acceptez les présentes conditions d'utilisation.\n\n1. SERVICES\nClientFlow fournit une plateforme d'automatisation de la prospection commerciale. Nos services incluent la génération de leads, l'envoi de messages automatisés et la gestion de rendez-vous.\n\n2. COMPTE\nVous êtes responsable de la sécurité de votre compte. Vous acceptez de ne pas partager vos identifiants et de nous notifier immédiatement en cas d'utilisation non autorisée.\n\n3. UTILISATION ACCEPTABLE\nVous acceptez d'utiliser ClientFlow conformément aux lois applicables. Il est interdit d'utiliser notre plateforme pour envoyer du spam ou du contenu illégal.\n\n4. PAIEMENT\nLes abonnements sont facturés mensuellement. Les annulations prennent effet à la fin de la période de facturation en cours.\n\n5. RESPONSABILITÉ\nClientFlow n'est pas responsable des dommages indirects liés à l'utilisation de notre plateforme.\n\n6. RÉSILIATION\nClientFlow se réserve le droit de suspendre ou de résilier votre accès en cas de violation des présentes conditions.`],
          ].map(([title, updated, content]) => (
            <div key={title} style={{ background:T.white,borderRadius:12,border:`1px solid ${T.border}`,overflow:"hidden",boxShadow:T.shadow }}>
              <div style={{ padding:"16px 20px",borderBottom:`1px solid ${T.light}`,display:"flex",justifyContent:"space-between",alignItems:"center" }}>
                <div><div style={{ fontSize:14,fontWeight:700 }}>{title}</div><div style={{ fontSize:12,color:T.sub }}>{updated}</div></div>
              </div>
              <div style={{ padding:"16px 20px",maxHeight:200,overflowY:"auto" }}>
                <p style={{ fontSize:13,color:T.sub,lineHeight:1.7,whiteSpace:"pre-wrap" }}>{content}</p>
              </div>
            </div>
          ))}
          <div style={{ background:T.white,borderRadius:12,border:`1px solid ${T.border}`,padding:"18px 22px",boxShadow:T.shadow }}>
            <div style={{ fontSize:14,fontWeight:700,marginBottom:8 }}>Supprimer mon compte</div>
            <p style={{ fontSize:13,color:T.sub,marginBottom:14 }}>La suppression de votre compte est irréversible. Toutes vos données seront définitivement effacées.</p>
            <Btn variant="danger" size="sm" onClick={() => { if(window.confirm("Êtes-vous sûr ? Cette action est irréversible.")) onLogout(); }}>Supprimer mon compte</Btn>
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   DASHBOARD — AUTOMATION TAB
═══════════════════════════════════════════════════════ */
function AutomationTab() {
  const [running, setRunning] = useState(true);
  const [log, setLog] = useState([
    { t:"14:32", m:"✓ 12 prospects trouvés — Restaurants Montréal", ok:true },
    { t:"14:30", m:"✉ Message envoyé à Sushi Matsu (Brossard)", ok:false },
    { t:"14:28", m:"↺ Relance J+2 → CutsByDave", ok:false },
    { t:"14:25", m:"📅 RDV confirmé — FitCoach Pro 8 mai", ok:true },
    { t:"14:20", m:"✓ 8 prospects — Barbiers Laval", ok:true },
  ]);
  const [count, setCount] = useState(0);
  const AUTO_MSGS = ["✓ Nouveau prospect — Chez Luigi, Montréal","✉ Message envoyé à Fresh Cut Barbershop","↺ Relance J+2 → Studio Élan","◈ Scan Google Maps — Centre-Ville","✓ 6 prospects qualifiés — Immobilier","📅 Booking envoyé à Proulx Realty"];

  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => {
      const now = new Date();
      const time = `${now.getHours()}:${String(now.getMinutes()).padStart(2,"0")}`;
      setLog(l => [{ t:time, m:AUTO_MSGS[count%AUTO_MSGS.length], ok:count%3===0 }, ...l.slice(0,19)]);
      setCount(c=>c+1);
    }, 3000);
    return () => clearInterval(t);
  }, [running, count]);

  const FLOWS = [
    ["Scraping Google Maps","1 247 exéc.","Dans 58 min"],
    ["Génération messages IA","3 891 exéc.","Sur demande"],
    ["Envoi email outreach","2 156 exéc.","Dans 24 min"],
    ["Relances automatiques J+2","834 exéc.","Demain 9h"],
    ["Relances automatiques J+5","412 exéc.","Dans 3 jours"],
    ["Booking & confirmation","127 exéc.","Sur demande"],
  ];

  return (
    <div style={{ display:"flex",flexDirection:"column",gap:16 }}>
      <div style={{ background:running?T.greenL:T.orangeL,borderRadius:12,border:`1px solid ${running?"#B7E3C6":"#F5CBA7"}`,padding:"16px 20px",display:"flex",justifyContent:"space-between",alignItems:"center" }}>
        <div style={{ display:"flex",alignItems:"center",gap:10 }}>
          <span style={{ width:8,height:8,borderRadius:"50%",background:running?T.green:T.orange,animation:running?"pulse 2s infinite":"none" }}/>
          <div>
            <div style={{ fontSize:14,fontWeight:700 }}>Système {running?"en cours d'exécution":"en pause"}</div>
            <div style={{ fontSize:12,color:T.sub }}>6 automatisations · Dernière activité il y a 2 min</div>
          </div>
        </div>
        <Btn variant="secondary" size="sm" onClick={() => setRunning(r=>!r)}>{running?"⏸ Mettre en pause":"▶ Relancer"}</Btn>
      </div>

      <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:16 }}>
        <div style={{ background:T.white,borderRadius:12,border:`1px solid ${T.border}`,padding:20,boxShadow:T.shadow }}>
          <div style={{ fontSize:14,fontWeight:700,marginBottom:14 }}>Automatisations actives</div>
          <div style={{ display:"flex",flexDirection:"column",gap:7 }}>
            {FLOWS.map(([n,r,next]) => (
              <div key={n} style={{ display:"flex",alignItems:"center",gap:9,padding:"9px 11px",background:T.bg,borderRadius:8 }}>
                <span style={{ width:6,height:6,borderRadius:"50%",background:running?T.green:T.orange,animation:running?"pulse 2s infinite":"none",flexShrink:0 }}/>
                <div style={{ flex:1 }}><div style={{ fontSize:12,fontWeight:600 }}>{n}</div><div style={{ fontSize:11,color:T.sub }}>{r}</div></div>
                <div style={{ fontSize:11,color:T.green,fontWeight:500,whiteSpace:"nowrap" }}>{next}</div>
              </div>
            ))}
          </div>
        </div>
        <div style={{ background:T.white,borderRadius:12,border:`1px solid ${T.border}`,padding:20,boxShadow:T.shadow }}>
          <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14 }}>
            <div style={{ fontSize:14,fontWeight:700 }}>Journal en direct</div>
            {running && <div style={{ display:"flex",alignItems:"center",gap:5 }}><Spin s={11} c={T.green}/><span style={{ fontSize:11,color:T.green }}>Live</span></div>}
          </div>
          <div style={{ display:"flex",flexDirection:"column",gap:7,maxHeight:280,overflowY:"auto" }}>
            {log.map((l,i) => (
              <div key={i} style={{ display:"flex",gap:8,fontSize:12,opacity:Math.max(.3,1-i*.05) }}>
                <span style={{ color:T.muted,flexShrink:0,width:36,fontVariantNumeric:"tabular-nums" }}>{l.t}</span>
                <span style={{ color:l.ok?T.green:T.sub }}>{l.m}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   MAIN DASHBOARD
═══════════════════════════════════════════════════════ */
function Dashboard({ user, onLogout }) {
  const [tab, setTab] = useState("overview");
  const [aiOpen, setAiOpen] = useState(false);
  const [cLead, setCLead] = useState(null);
  const [showAddLead, setShowAddLead] = useState(false);
  const [showStripe, setShowStripe] = useState(false);
  const [stripePlan, setStripePlan] = useState("pro");
  const [liveI, setLiveI] = useState(0);
  const [leads, setLeads] = useState(DB.getLeads(user.id));
  const [messages, setMessages] = useState(DB.getMessages(user.id));
  const [campaigns] = useState(DB.getCampaigns(user.id));
  const [bookings] = useState(DB.getBookings(user.id));
  const [leadsFilter, setLeadsFilter] = useState("all");
  const [notif, setNotif] = useState(null);

  const LIVE = ["Scan Google Maps…","Prospect trouvé","Message IA généré","Envoi en cours…","Relance J+2 programmée"];
  useEffect(() => { const t = setInterval(() => setLiveI(i=>(i+1)%LIVE.length), 2500); return () => clearInterval(t); }, []);

  const refreshLeads = () => setLeads(DB.getLeads(user.id));
  const refreshMsgs = () => setMessages(DB.getMessages(user.id));

  const showNotif = (msg, type="success") => {
    setNotif({ msg, type });
    setTimeout(() => setNotif(null), 3000);
  };

  const NAV = [
    ["overview","⬡","Vue d'ensemble"],["leads","◈","Leads"],["messages","✉","Messages"],
    ["campaigns","⚡","Campagnes"],["bookings","◉","Rendez-vous"],
    ["stats","▲","Analytiques"],["automation","↺","Automatisation"],["settings","⚙","Paramètres"],
  ];

  const mrr = 3*49+5*99+2*199;
  const totalSent = campaigns.reduce((a,c)=>a+c.sent,0);
  const visibleLeads = leadsFilter==="all" ? leads : leads.filter(l=>l.status===leadsFilter);

  return (
    <div style={{ fontFamily:"'Inter',system-ui,sans-serif",background:T.bg,minHeight:"100vh",display:"flex" }}>
      <style>{STYLES}</style>

      {/* NOTIF TOAST */}
      {notif && (
        <div style={{ position:"fixed",top:16,right:16,zIndex:400,background:notif.type==="success"?T.green:T.red,color:T.white,borderRadius:10,padding:"12px 18px",fontSize:13,fontWeight:600,boxShadow:T.shadowM,animation:"fadeIn .2s ease" }}>
          {notif.type==="success"?"✓ ":""}{notif.msg}
        </div>
      )}

      {/* SIDEBAR */}
      <aside style={{ width:210,background:T.white,borderRight:`1px solid ${T.border}`,display:"flex",flexDirection:"column",padding:"16px 10px",position:"fixed",top:0,left:0,bottom:0,zIndex:50 }}>
        <div style={{ display:"flex",alignItems:"center",gap:8,padding:"5px 10px",marginBottom:20 }}>
          <div style={{ width:27,height:27,borderRadius:8,background:T.ink,display:"flex",alignItems:"center",justifyContent:"center" }}><span style={{ color:T.white,fontSize:13,fontWeight:800 }}>C</span></div>
          <div><div style={{ fontWeight:800,fontSize:13,letterSpacing:"-0.3px" }}>ClientFlow</div><div style={{ fontSize:10,color:T.muted }}>Plan {(PLANS.find(p=>p.id===user.plan)||PLANS[1]).name}</div></div>
        </div>

        <div style={{ display:"flex",flexDirection:"column",gap:1 }}>
          {NAV.map(([id,icon,label]) => (
            <button key={id} onClick={()=>setTab(id)} style={{ display:"flex",alignItems:"center",gap:9,padding:"8px 11px",borderRadius:8,border:"none",background:tab===id?T.bg:"transparent",color:tab===id?T.ink:T.sub,cursor:"pointer",fontSize:13,fontWeight:tab===id?600:400,textAlign:"left",width:"100%",fontFamily:"inherit",transition:"background .1s" }}>
              <span style={{ fontSize:13,opacity:tab===id?1:0.6 }}>{icon}</span>{label}
            </button>
          ))}
        </div>

        <div style={{ marginTop:"auto" }}>
          <div style={{ background:T.greenL,borderRadius:10,padding:"10px 12px",border:`1px solid #B7E3C6`,marginBottom:8 }}>
            <div style={{ display:"flex",alignItems:"center",gap:6,marginBottom:3 }}>
              <span style={{ width:6,height:6,borderRadius:"50%",background:T.green,animation:"pulse 2s infinite" }}/>
              <span style={{ fontSize:11,fontWeight:700,color:T.green }}>Système actif</span>
            </div>
            <div style={{ fontSize:11,color:T.sub,lineHeight:1.4 }}>{LIVE[liveI]}</div>
          </div>
          <button onClick={onLogout} style={{ display:"flex",alignItems:"center",gap:8,padding:"8px 11px",borderRadius:8,border:"none",background:"transparent",color:T.sub,cursor:"pointer",fontSize:12,fontFamily:"inherit",width:"100%" }}>
            <span>⎋</span>Déconnexion
          </button>
        </div>
      </aside>

      {/* MAIN */}
      <main style={{ marginLeft:210,flex:1,minHeight:"100vh" }}>
        {/* TOPBAR */}
        <header style={{ height:54,background:T.white,borderBottom:`1px solid ${T.border}`,display:"flex",alignItems:"center",justifyContent:"space-between",padding:"0 22px",position:"sticky",top:0,zIndex:40 }}>
          <div style={{ fontSize:15,fontWeight:700 }}>{NAV.find(n=>n[0]===tab)?.[2]}</div>
          <div style={{ display:"flex",alignItems:"center",gap:9 }}>
            <div style={{ display:"flex",alignItems:"center",gap:6,background:T.greenL,border:`1px solid #B7E3C6`,borderRadius:7,padding:"5px 11px" }}>
              <span style={{ width:5,height:5,borderRadius:"50%",background:T.green,animation:"pulse 2s infinite" }}/>
              <span style={{ fontSize:12,fontWeight:600,color:T.green,maxWidth:150,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{LIVE[liveI]}</span>
            </div>
            <Btn variant="secondary" size="sm" onClick={()=>setAiOpen(o=>!o)}>✦ Assistant</Btn>
            <div style={{ width:32,height:32,borderRadius:10,background:T.ink,display:"flex",alignItems:"center",justifyContent:"center",color:T.white,fontWeight:700,fontSize:13,cursor:"pointer" }} onClick={()=>setTab("settings")}>
              {user.name.charAt(0).toUpperCase()}
            </div>
          </div>
        </header>

        <div style={{ padding:22 }}>

          {/* OVERVIEW */}
          {tab==="overview" && (
            <div style={{ display:"flex",flexDirection:"column",gap:16,animation:"fadeIn .3s ease" }}>
              <div style={{ fontSize:18,fontWeight:800,letterSpacing:"-0.4px" }}>Bonjour {user.name.split(" ")[0]} 👋 — votre système tourne.</div>
              <div style={{ display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12 }}>
                {[{l:"Leads générés",v:leads.length,sub:"total",c:T.blue},{l:"Messages envoyés",v:totalSent+messages.length,sub:"total",c:T.purple},{l:"Taux de réponse",v:"22%",sub:"vs 8% industrie",c:T.green},{l:"MRR estimé",v:`${mrr}$`,sub:"10 clients actifs",c:T.orange}].map(k => (
                  <div key={k.l} style={{ background:T.white,borderRadius:11,border:`1px solid ${T.border}`,boxShadow:T.shadow,padding:"16px 18px" }}>
                    <div style={{ fontSize:11,fontWeight:600,color:T.sub,textTransform:"uppercase",letterSpacing:0.4,marginBottom:8 }}>{k.l}</div>
                    <div style={{ fontSize:24,fontWeight:800,color:k.c,letterSpacing:"-0.5px",marginBottom:3 }}>{k.v}</div>
                    <div style={{ fontSize:11,color:T.muted }}>{k.sub}</div>
                  </div>
                ))}
              </div>
              <div style={{ display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12 }}>
                {[{title:"Nouvelle campagne",desc:"Cibler une niche ou ville",cta:"Créer →",col:T.blue,bg:T.blueL,to:"campaigns"},{title:"Voir les réponses",desc:`${messages.filter(m=>m.status==="replied").length} prospects ont répondu`,cta:"Voir →",col:T.purple,bg:T.purpleL,to:"messages"},{title:"Rendez-vous",desc:`${bookings.filter(b=>b.status==="confirmed").length} RDV confirmés`,cta:"Calendrier →",col:T.green,bg:T.greenL,to:"bookings"}].map(a => (
                  <div key={a.title} onClick={()=>setTab(a.to)} style={{ background:a.bg,borderRadius:11,border:`1px solid transparent`,padding:"18px 20px",cursor:"pointer" }}>
                    <div style={{ fontSize:14,fontWeight:700,marginBottom:4 }}>{a.title}</div>
                    <div style={{ fontSize:13,color:T.sub,marginBottom:12 }}>{a.desc}</div>
                    <span style={{ fontSize:13,fontWeight:700,color:a.col }}>{a.cta}</span>
                  </div>
                ))}
              </div>
              <div style={{ background:T.white,borderRadius:11,border:`1px solid ${T.border}`,boxShadow:T.shadow,overflow:"hidden" }}>
                <div style={{ padding:"13px 18px",borderBottom:`1px solid ${T.light}`,display:"flex",justifyContent:"space-between",alignItems:"center" }}>
                  <span style={{ fontSize:14,fontWeight:700 }}>Derniers leads</span>
                  <Btn variant="ghost" size="sm" onClick={()=>setTab("leads")}>Voir tous →</Btn>
                </div>
                {leads.slice(0,4).map((l,i) => (
                  <div key={l.id} onMouseEnter={e=>e.currentTarget.style.background=T.bg} onMouseLeave={e=>e.currentTarget.style.background="transparent"}
                    style={{ display:"flex",alignItems:"center",gap:10,padding:"11px 18px",borderBottom:i<Math.min(leads.length,4)-1?`1px solid ${T.light}`:"none",transition:"background .1s" }}>
                    <div style={{ width:30,height:30,borderRadius:8,background:T.bg,border:`1px solid ${T.border}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:15,flexShrink:0 }}>{NICHE_ICON[l.niche]||"🏢"}</div>
                    <div style={{ flex:1 }}><div style={{ fontSize:13,fontWeight:600 }}>{l.company}</div><div style={{ fontSize:11,color:T.sub }}>{l.city} · {l.source}</div></div>
                    <Tag v={l.status}/>
                    <Btn variant="secondary" size="sm" onClick={()=>setCLead(l)}>Contacter</Btn>
                  </div>
                ))}
                {leads.length===0 && <div style={{ padding:"24px",textAlign:"center",color:T.muted,fontSize:13 }}>Aucun lead pour l'instant. Lancez une campagne !</div>}
              </div>
            </div>
          )}

          {/* LEADS */}
          {tab==="leads" && (
            <div style={{ animation:"fadeIn .3s ease" }}>
              <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16,flexWrap:"wrap",gap:10 }}>
                <div style={{ display:"flex",gap:5,flexWrap:"wrap" }}>
                  {[["all","Tous"],["new","Nouveaux"],["contacted","Contactés"],["replied","Répondus"],["booked","RDV pris"]].map(([id,l]) => (
                    <button key={id} onClick={()=>setLeadsFilter(id)} style={{ padding:"6px 12px",borderRadius:7,border:`1px solid ${leadsFilter===id?T.ink:T.border}`,background:leadsFilter===id?T.ink:T.white,color:leadsFilter===id?T.white:T.sub,fontSize:12,fontWeight:500,cursor:"pointer",fontFamily:"inherit" }}>{l} {id==="all"?`(${leads.length})`:""}</button>
                  ))}
                </div>
                <Btn variant="primary" size="sm" onClick={()=>setShowAddLead(true)}>+ Ajouter un lead</Btn>
              </div>
              <div style={{ background:T.white,borderRadius:11,border:`1px solid ${T.border}`,boxShadow:T.shadow,overflow:"hidden" }}>
                {visibleLeads.length===0
                  ? <div style={{ padding:32,textAlign:"center",color:T.muted,fontSize:13 }}>Aucun lead. Cliquez sur "+ Ajouter un lead" ou lancez une campagne.</div>
                  : <table style={{ width:"100%",borderCollapse:"collapse" }}>
                      <thead><tr style={{ borderBottom:`1px solid ${T.light}` }}>
                        {["Entreprise","Ville","Niche","Source","Score","Statut","Action"].map(h=><th key={h} style={{ padding:"10px 14px",textAlign:"left",fontSize:12,fontWeight:600,color:T.sub }}>{h}</th>)}
                      </tr></thead>
                      <tbody>
                        {visibleLeads.map((l,i)=>(
                          <tr key={l.id} style={{ borderBottom:i<visibleLeads.length-1?`1px solid ${T.light}`:"none" }}
                            onMouseEnter={e=>e.currentTarget.style.background=T.bg} onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                            <td style={{ padding:"11px 14px" }}><div style={{ display:"flex",alignItems:"center",gap:8 }}><div style={{ width:28,height:28,borderRadius:8,background:T.bg,border:`1px solid ${T.border}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,flexShrink:0 }}>{NICHE_ICON[l.niche]||"🏢"}</div><div><div style={{ fontSize:13,fontWeight:600 }}>{l.company}</div><div style={{ fontSize:11,color:T.sub }}>{l.owner}</div></div></div></td>
                            <td style={{ padding:"11px 14px",fontSize:13,color:T.sub }}>{l.city}</td>
                            <td style={{ padding:"11px 14px",fontSize:13,color:T.sub }}>{l.niche}</td>
                            <td style={{ padding:"11px 14px",fontSize:13,color:T.sub }}>{l.source}</td>
                            <td style={{ padding:"11px 14px" }}><span style={{ fontSize:13,fontWeight:700,color:l.score>=90?T.green:l.score>=75?T.orange:T.red }}>{l.score}</span></td>
                            <td style={{ padding:"11px 14px" }}><Tag v={l.status}/></td>
                            <td style={{ padding:"11px 14px" }}><Btn variant="secondary" size="sm" onClick={()=>setCLead(l)}>Contacter</Btn></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                }
              </div>
            </div>
          )}

          {/* MESSAGES */}
          {tab==="messages" && (
            <div style={{ display:"flex",flexDirection:"column",gap:10,animation:"fadeIn .3s ease" }}>
              {[...messages].reverse().map(m => (
                <div key={m.id} style={{ background:T.white,borderRadius:11,border:`1px solid ${T.border}`,boxShadow:T.shadow,padding:"16px 20px" }}>
                  <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10 }}>
                    <div style={{ display:"flex",alignItems:"center",gap:9 }}>
                      <span style={{ fontSize:14,fontWeight:700 }}>{m.company}</span>
                      <span style={{ fontSize:12,color:T.sub,background:T.bg,borderRadius:5,padding:"2px 8px" }}>{m.type}</span>
                    </div>
                    <div style={{ display:"flex",alignItems:"center",gap:9 }}><span style={{ fontSize:12,color:T.muted }}>{m.date}</span><Tag v={m.status}/></div>
                  </div>
                  <p style={{ fontSize:13,color:T.sub,lineHeight:1.65,background:T.bg,borderRadius:8,padding:"10px 14px",borderLeft:`3px solid ${T.border}` }}>{m.body}</p>
                </div>
              ))}
              {messages.length===0 && <div style={{ padding:40,textAlign:"center",color:T.muted,fontSize:13 }}>Aucun message envoyé. Cliquez sur "Contacter" sur un lead.</div>}
            </div>
          )}

          {/* CAMPAIGNS */}
          {tab==="campaigns" && (
            <div style={{ display:"flex",flexDirection:"column",gap:14,animation:"fadeIn .3s ease" }}>
              {campaigns.map(c => (
                <div key={c.id} style={{ background:T.white,borderRadius:11,border:`1px solid ${T.border}`,boxShadow:T.shadow,padding:"20px 22px" }}>
                  <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:16 }}>
                    <div><div style={{ fontSize:15,fontWeight:700,marginBottom:3 }}>{c.name}</div><div style={{ fontSize:12,color:T.sub }}>Démarrée le {c.created}</div></div>
                    <Tag v={c.active?"active":"paused"}/>
                  </div>
                  <div style={{ display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10 }}>
                    {[["Envoyés",c.sent,T.blue],["Réponses",c.replied,T.purple],["RDV",c.booked,T.green],["Taux",`${Math.round(c.replied/c.sent*100)}%`,T.orange]].map(([l,v,col])=>(
                      <div key={l} style={{ background:T.bg,borderRadius:10,padding:"12px",textAlign:"center" }}>
                        <div style={{ fontSize:20,fontWeight:800,color:col }}>{v}</div>
                        <div style={{ fontSize:11,color:T.sub,marginTop:3 }}>{l}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{ marginTop:12,background:T.bg,borderRadius:6,height:5,overflow:"hidden" }}>
                    <div style={{ width:`${Math.round(c.replied/c.sent*100)}%`,height:"100%",background:`linear-gradient(90deg,${T.blue},${T.purple})` }}/>
                  </div>
                </div>
              ))}
              {campaigns.length===0 && <div style={{ padding:40,textAlign:"center",color:T.muted,fontSize:13 }}>Aucune campagne. Configurez votre première campagne ici.</div>}
            </div>
          )}

          {/* BOOKINGS */}
          {tab==="bookings" && (
            <div style={{ display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:14,animation:"fadeIn .3s ease" }}>
              {bookings.map(b => (
                <div key={b.id} style={{ background:T.white,borderRadius:11,border:`1px solid ${T.border}`,boxShadow:T.shadow,padding:18 }}>
                  <div style={{ display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:12 }}>
                    <div style={{ width:36,height:36,borderRadius:10,background:T.bg,border:`1px solid ${T.border}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18 }}>{NICHE_ICON[b.niche]||"📅"}</div>
                    <Tag v={b.status}/>
                  </div>
                  <div style={{ fontSize:14,fontWeight:700,marginBottom:2 }}>{b.company}</div>
                  <div style={{ fontSize:12,color:T.sub,marginBottom:12 }}>{b.owner}</div>
                  <div style={{ background:T.bg,borderRadius:8,padding:"9px 13px",display:"flex",justifyContent:"space-between" }}>
                    <span style={{ fontSize:13,fontWeight:600 }}>{b.date}</span>
                    <span style={{ fontSize:13,fontWeight:700,color:T.blue }}>{b.time}</span>
                  </div>
                </div>
              ))}
              {bookings.length===0 && <div style={{ gridColumn:"1/-1",padding:40,textAlign:"center",color:T.muted,fontSize:13 }}>Aucun rendez-vous confirmé pour l'instant.</div>}
            </div>
          )}

          {/* STATS */}
          {tab==="stats" && (
            <div style={{ display:"flex",flexDirection:"column",gap:16,animation:"fadeIn .3s ease" }}>
              <div style={{ display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12 }}>
                {[{l:"Leads totaux",v:leads.length,sub:"total",c:T.blue},{l:"Messages envoyés",v:totalSent,sub:"automatiquement",c:T.purple},{l:"Taux de réponse",v:"22%",sub:"vs 8% industrie",c:T.green},{l:"MRR",v:`${mrr}$`,sub:"10 clients actifs",c:T.orange}].map(k=>(
                  <div key={k.l} style={{ background:T.white,borderRadius:11,border:`1px solid ${T.border}`,boxShadow:T.shadow,padding:"16px 18px" }}>
                    <div style={{ fontSize:11,fontWeight:600,color:T.sub,textTransform:"uppercase",letterSpacing:0.4,marginBottom:8 }}>{k.l}</div>
                    <div style={{ fontSize:24,fontWeight:800,color:k.c,letterSpacing:"-0.5px",marginBottom:3 }}>{k.v}</div>
                    <div style={{ fontSize:11,color:T.muted }}>{k.sub}</div>
                  </div>
                ))}
              </div>
              <div style={{ display:"grid",gridTemplateColumns:"2fr 1fr",gap:14 }}>
                <div style={{ background:T.white,borderRadius:11,border:`1px solid ${T.border}`,boxShadow:T.shadow,padding:20 }}>
                  <div style={{ fontSize:14,fontWeight:700,marginBottom:16 }}>Activité hebdomadaire</div>
                  <div style={{ display:"flex",gap:5,alignItems:"flex-end",height:120 }}>
                    {[{d:"L",l:8,r:2},{d:"M",l:14,r:4},{d:"M",l:11,r:3},{d:"J",l:19,r:6},{d:"V",l:23,r:7},{d:"S",l:7,r:2},{d:"D",l:5,r:1}].map((d,i)=>(
                      <div key={i} style={{ flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:4 }}>
                        <div style={{ width:"100%",display:"flex",flexDirection:"column",justifyContent:"flex-end",gap:2,height:100 }}>
                          <div style={{ background:T.green,width:"100%",height:`${d.r/23*90}px`,borderRadius:"3px 3px 0 0" }}/>
                          <div style={{ background:T.blue,width:"100%",height:`${(d.l-d.r)/23*90}px`,borderRadius:"3px 3px 0 0",opacity:.25 }}/>
                        </div>
                        <div style={{ fontSize:11,color:T.muted }}>{d.d}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{ display:"flex",gap:14,marginTop:10 }}>
                    {[[T.blue,"Leads"],[T.green,"Réponses"]].map(([c,l])=><div key={l} style={{ display:"flex",alignItems:"center",gap:5 }}><div style={{ width:8,height:8,borderRadius:2,background:c }}/><span style={{ fontSize:12,color:T.sub }}>{l}</span></div>)}
                  </div>
                </div>
                <div style={{ background:T.white,borderRadius:11,border:`1px solid ${T.border}`,boxShadow:T.shadow,padding:20 }}>
                  <div style={{ fontSize:14,fontWeight:700,marginBottom:16 }}>Revenus par plan</div>
                  {[{name:"Business",n:2,price:199,c:T.ink},{name:"Pro",n:5,price:99,c:T.blue},{name:"Starter",n:3,price:49,c:T.muted}].map(p=>(
                    <div key={p.name} style={{ marginBottom:12 }}>
                      <div style={{ display:"flex",justifyContent:"space-between",marginBottom:4 }}><span style={{ fontSize:12,fontWeight:600 }}>{p.name}</span><span style={{ fontSize:12,fontWeight:700,color:p.c }}>{p.n*p.price}$</span></div>
                      <div style={{ background:T.bg,borderRadius:4,height:4 }}><div style={{ background:p.c,width:`${(p.n*p.price)/mrr*100}%`,height:"100%",borderRadius:4 }}/></div>
                    </div>
                  ))}
                  <div style={{ borderTop:`1px solid ${T.light}`,paddingTop:10,display:"flex",justifyContent:"space-between" }}>
                    <span style={{ fontSize:13,fontWeight:700 }}>MRR</span>
                    <span style={{ fontSize:18,fontWeight:800,color:T.green }}>{mrr}$</span>
                  </div>
                </div>
              </div>
              <div style={{ background:T.white,borderRadius:11,border:`1px solid ${T.border}`,boxShadow:T.shadow,padding:20 }}>
                <div style={{ fontSize:14,fontWeight:700,marginBottom:16 }}>Performance par niche</div>
                <div style={{ display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10 }}>
                  {[{n:"Restaurant",l:38,r:21,i:"🍽️"},{n:"Barbier",l:29,r:24,i:"✂️"},{n:"Immobilier",l:21,r:31,i:"🏠"},{n:"Fitness",l:12,r:19,i:"💪"}].map(x=>(
                    <div key={x.n} style={{ background:T.bg,borderRadius:10,padding:"14px 16px" }}>
                      <div style={{ fontSize:20,marginBottom:8 }}>{x.i}</div>
                      <div style={{ fontSize:13,fontWeight:700,marginBottom:3 }}>{x.n}</div>
                      <div style={{ display:"flex",justifyContent:"space-between" }}><span style={{ fontSize:12,color:T.sub }}>{x.l} leads</span><span style={{ fontSize:13,fontWeight:700,color:T.green }}>{x.r}%</span></div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* AUTOMATION */}
          {tab==="automation" && <AutomationTab/>}

          {/* SETTINGS */}
          {tab==="settings" && (
            <div style={{ animation:"fadeIn .3s ease" }}>
              <Settings user={user} onUpgrade={(p)=>{ setStripePlan(p); setShowStripe(true); }} onLogout={onLogout}/>
            </div>
          )}

        </div>
      </main>

      {/* MODALS */}
      {aiOpen && <Assistant user={user} onClose={()=>setAiOpen(false)}/>}
      {cLead && <MsgModal lead={cLead} uid={user.id} onClose={()=>{ setCLead(null); refreshMsgs(); showNotif("Message envoyé avec succès !"); }}/>}
      {showAddLead && <AddLeadModal uid={user.id} onClose={()=>setShowAddLead(false)} onAdded={()=>{ refreshLeads(); showNotif("Lead ajouté !"); }}/>}
      {showStripe && <StripeModal plan={stripePlan} user={user} onClose={()=>setShowStripe(false)} onSuccess={()=>{ setShowStripe(false); showNotif(`Plan ${(PLANS.find(p=>p.id===stripePlan)||PLANS[1]).name} activé !`); }}/>}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   ROOT APP
═══════════════════════════════════════════════════════ */
export default function App() {
  const [screen, setScreen] = useState("landing");
  const [authMode, setAuthMode] = useState("login");
  const [user, setUser] = useState(null);
  const [onboarded, setOnboarded] = useState(false);

  const handleAuth = (u) => { setUser(u); setOnboarded(u.role==="admin"); setScreen("dashboard"); };
  const handleLogout = () => { DB.logout(); setUser(null); setOnboarded(false); setScreen("landing"); };

  if (screen==="landing") return <Landing onLogin={()=>{ setAuthMode("login"); setScreen("auth"); }} onSignup={()=>{ setAuthMode("signup"); setScreen("auth"); }}/>;
  if (screen==="auth") return <AuthScreen mode={authMode} onAuth={handleAuth} onBack={()=>setScreen("landing")}/>;
  if (screen==="dashboard" && user && !onboarded) return <Onboarding user={user} onDone={()=>setOnboarded(true)}/>;
  if (screen==="dashboard" && user) return <Dashboard user={user} onLogout={handleLogout}/>;
  return null;
}
