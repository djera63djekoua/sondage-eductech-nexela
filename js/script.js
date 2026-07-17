
const STORAGE_PREFIX = 'eductech-sondage-v5:';
const ADMIN_CODE = 'EDUC20TECH26';

const state = {
  view: 'form',
  submitting: false,
  formError: '',
  values: { nom:'', contact:'', tranche:'', domaines:[], domaineAutre:'', formats:[], modalite:'', themes:'', dispo:'' }
};

function toggleChip(arr,val){ const i=arr.indexOf(val); if(i>=0) arr.splice(i,1); else arr.push(val); render(); }
function setVal(key,val){ state.values[key]=val; }

async function submitForm(e){
  if(e && e.preventDefault) e.preventDefault();
  if(state.submitting) return;
  if(!state.values.nom || !state.values.contact || !state.values.tranche || state.values.domaines.length===0){
    state.formError = "Merci de remplir au minimum : nom, contact, tranche d'âge et au moins un domaine.";
    render();
    return;
  }
  state.formError = '';
  state.submitting = true; render();
  try{
    const v = state.values;
    const payload = {
      nom: v.nom,
      contact: v.contact,
      tranche: v.tranche,
      domaines: v.domaines.join(', '),
      domaine_autre: v.domaineAutre || '',
      programmes: v.formats.join(', '),
      modalite: v.modalite,
      themes: v.themes,
      disponibilite: v.dispo,
      _subject: 'Nouvelle réponse — Sondage EducTech Consulting'
    };
    const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 15000));
    const response = await Promise.race([
      fetch('https://formspree.io/f/xpqvzbgr', {
        method: 'POST',
        headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      }),
      timeout
    ]);
    if(response.ok){
      state.view = 'success';
    } else {
      state.formError = "L'envoi a échoué (réponse du serveur invalide). Merci de réessayer.";
    }
  }catch(err){
    console.error(err);
    state.formError = (err && err.message === 'timeout')
      ? "L'envoi n'a pas répondu à temps. Vérifiez votre connexion et réessayez."
      : "Une erreur est survenue lors de l'envoi. Merci de réessayer.";
  }
  state.submitting = false; render();
}

function showAccessModal(){
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.id = 'accessModalOverlay';
  overlay.innerHTML = `
    <div class="modal-box">
      <div class="icon-badge orange-bg" style="width:48px;height:48px;">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><rect x="5" y="11" width="14" height="9" rx="2" fill="#F1810F"/><path d="M8 11V7a4 4 0 0 1 8 0v4" stroke="#F1810F" stroke-width="2" fill="none"/></svg>
      </div>
      <h3>Espace organisateur</h3>
      <p>Entrez le code d'accès pour voir les réponses.</p>
      <input type="text" id="accessCodeInput" placeholder="Code d'accès" autocomplete="off" />
      <div class="modal-error" id="accessCodeError">Code incorrect. Réessayez.</div>
      <div class="modal-actions">
        <button class="btn-cancel" onclick="closeAccessModal()">Annuler</button>
        <button class="btn-confirm" onclick="checkAccessCode()">Valider</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
  const input = document.getElementById('accessCodeInput');
  input.focus();
  input.addEventListener('keydown', (e)=>{ if(e.key==='Enter') checkAccessCode(); });
}

window.closeAccessModal = function(){
  const overlay = document.getElementById('accessModalOverlay');
  if(overlay) overlay.remove();
};

window.checkAccessCode = function(){
  const input = document.getElementById('accessCodeInput');
  const errorEl = document.getElementById('accessCodeError');
  const entered = (input.value || '').trim();
  if(entered !== ADMIN_CODE){
    errorEl.style.display = 'block';
    input.style.borderColor = '#D64545';
    input.value = '';
    input.focus();
    return;
  }
  closeAccessModal();
  loadAdmin();
};

async function loadAdmin(){
  state.view='admin'; state.adminData=null; state.adminError=''; render();
  try{
    const timeout = (ms)=> new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), ms));
    const list = await Promise.race([window.storage.list(STORAGE_PREFIX, true), timeout(10000)]);
    const keys = (list && list.keys) || [];
    const items = [];
    for(const k of keys){ try{ const r = await window.storage.get(k, true); if(r) items.push(JSON.parse(r.value)); }catch(e){} }
    items.sort((a,b)=> new Date(b.submittedAt)-new Date(a.submittedAt));
    state.adminData = items;
  }catch(e){
    state.adminData = [];
    state.adminError = (e && e.message==='timeout')
      ? "Le chargement n'a pas répondu. Le stockage des réponses nécessite un compte Claude en forfait Pro, Max, Team ou Enterprise."
      : "Impossible de charger les réponses pour le moment.";
  }
  render();
}

function chipGroup(key, options){
  return `<div class="options">${options.map(o=>{
    const label = Array.isArray(o) ? o[0] : o;
    const emoji = Array.isArray(o) ? o[1] : '';
    const sel = state.values[key].includes(label);
    return `<div class="chip ${sel?'sel':''}" onclick="window.__toggle('${key}','${label.replace(/'/g,"\\'")}')">${emoji?`<span>${emoji}</span>`:''}${label}<span class="check">✓</span></div>`;
  }).join('')}</div>`;
}

function formProgress(v){
  const fields = [
    !!v.nom, !!v.contact, !!v.tranche, v.domaines.length>0,
    v.formats.length>0, !!v.modalite, !!v.themes, !!v.dispo
  ];
  const filled = fields.filter(Boolean).length;
  return Math.round((filled / fields.length) * 100);
}

window.__toggle=function(key,val){ toggleChip(state.values[key],val); };
window.__setNom=function(v){ setVal('nom',v); };
window.__setContact=function(v){ setVal('contact',v); };
window.__setTranche=function(v){ setVal('tranche',v); render(); };
window.__setDomaineAutre=function(v){ setVal('domaineAutre',v); };
window.__setModalite=function(v){ setVal('modalite',v); render(); };
window.__setThemes=function(v){ setVal('themes',v); };
window.__setDispo=function(v){ setVal('dispo',v); };
window.__scrollTo=function(id){ const el=document.getElementById(id); if(el) el.scrollIntoView({behavior:'smooth'}); };

/* ---------- ICONS ---------- */
const ICON_HANDSHAKE = `<svg width="26" height="26" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M2 12L6 8L10 11L14 7L18 11L22 8" stroke="#0B87DC" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M6 8L2 12V17L6 20L10 17V12" stroke="#F1810F" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
const ICON_CAP = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 3L2 8L12 13L22 8L12 3Z" fill="#0B87DC"/><path d="M6 10.5V16C6 16 8.5 18 12 18C15.5 18 18 16 18 16V10.5" stroke="#0B87DC" stroke-width="1.8" stroke-linecap="round"/><line x1="22" y1="8" x2="22" y2="14" stroke="#F1810F" stroke-width="2" stroke-linecap="round"/></svg>`;
const ICON_CODE = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M8 6L2 12L8 18" stroke="#0B87DC" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/><path d="M16 6L22 12L16 18" stroke="#F1810F" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/><line x1="13.5" y1="4" x2="10.5" y2="20" stroke="#0A1830" stroke-width="1.6" stroke-linecap="round"/></svg>`;
const ICON_MEGAPHONE = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M3 10V14C3 15.1 3.9 16 5 16H6L9 20V4L6 8H5C3.9 8 3 8.9 3 10Z" fill="#0B87DC"/><path d="M12 8C13.5 9.2 13.5 14.8 12 16" stroke="#F1810F" stroke-width="2" stroke-linecap="round"/><path d="M15.5 5.5C18 8 18 16 15.5 18.5" stroke="#F1810F" stroke-width="2" stroke-linecap="round" opacity="0.6"/></svg>`;
const ICON_TARGET = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="12" r="9" stroke="#0B87DC" stroke-width="2"/><circle cx="12" cy="12" r="5" stroke="#0B87DC" stroke-width="2"/><circle cx="12" cy="12" r="1.6" fill="#F1810F"/></svg>`;
const ICON_BRIEFCASE = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="3" y="8" width="18" height="12" rx="2" fill="#0B87DC"/><path d="M8 8V6C8 4.9 8.9 4 10 4H14C15.1 4 16 4.9 16 6V8" stroke="#0A1830" stroke-width="1.8"/><line x1="3" y1="13" x2="21" y2="13" stroke="#F1810F" stroke-width="2"/></svg>`;
const ICON_STAR = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 2L14.6 8.6L21.5 9.2L16.2 13.6L18 20.5L12 16.8L6 20.5L7.8 13.6L2.5 9.2L9.4 8.6L12 2Z" fill="#F1810F"/></svg>`;
const ICON_ORELA = `<svg width="26" height="26" viewBox="0 0 26 26" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M4 8C4 6.34 5.34 5 7 5H19C20.66 5 22 6.34 22 8V14C22 15.66 20.66 17 19 17H12L7 21V17H7C5.34 17 4 15.66 4 14V8Z" fill="#0B87DC"/><circle cx="9" cy="11" r="1.3" fill="white"/><circle cx="13" cy="11" r="1.3" fill="white"/><circle cx="17" cy="11" r="1.3" fill="#F1810F"/></svg>`;

const ICON_MOSSO = `
<svg width="26" height="26" viewBox="0 0 26 26" fill="none" xmlns="http://www.w3.org/2000/svg">

    <!-- Personne -->
    <circle cx="13" cy="8" r="3.2" fill="#22C55E"/>

    <!-- Épaules -->
    <path d="M7 20C7 16.8 9.7 14.5 13 14.5C16.3 14.5 19 16.8 19 20"
          stroke="#22C55E"
          stroke-width="2.4"
          stroke-linecap="round"/>

    <!-- Feuille -->
    <path d="M18.5 6
             C20 4.5 22 4.5 22 4.5
             C22 6.8 20.8 8.6 18.8 9.5"
          stroke="#F1810F"
          stroke-width="2"
          stroke-linecap="round"/>

    <path d="M18 9
             C17.5 8
             17.4 6.8
             18.5 6"
          stroke="#F1810F"
          stroke-width="2"
          stroke-linecap="round"/>

</svg>
`;

const ICON_NEXELA = `<svg width="26" height="26" viewBox="0 0 26 26" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="10" y="3" width="6" height="12" rx="3" fill="#F1810F"/><path d="M6 12V13C6 16.31 8.69 19 12 19H14C17.31 19 20 16.31 20 13V12" stroke="#F1810F" stroke-width="1.8" stroke-linecap="round"/><line x1="13" y1="19" x2="13" y2="22" stroke="#F1810F" stroke-width="1.8" stroke-linecap="round"/><line x1="9" y1="22" x2="17" y2="22" stroke="#F1810F" stroke-width="1.8" stroke-linecap="round"/></svg>`;
const ICON_PIN = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 22C12 22 19 15.5 19 10A7 7 0 0 0 5 10C5 15.5 12 22 12 22Z" fill="#F1810F"/><circle cx="12" cy="10" r="2.6" fill="white"/></svg>`;

/* ---- form-only icons (small, mono-line, brand-consistent) ---- */
const FI = {
  user:  `<svg width="16" height="16" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="8" r="4" stroke="currentColor" stroke-width="2"/><path d="M4 20C4 16 7.5 14 12 14C16.5 14 20 16 20 20" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`,
  phone: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M6 3H9L11 8L8.5 9.5C9.4 11.5 11 13.1 13 14L14.5 11.5L19.5 13.5V17C19.5 18.1 18.6 19 17.5 19C10.6 19 5 13.4 5 6.5C5 5.4 5.9 3 6 3Z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg>`,
  compass: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.8"/><path d="M15 9L13 13L9 15L11 11L15 9Z" fill="currentColor"/></svg>`,
  tools: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L4 17l3 3 5.3-5.3a4 4 0 0 0 5.4-5.4l-2.6 2.6-2-2 2.6-2.6Z" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round" stroke-linecap="round"/></svg>`,
  target: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="8" stroke="currentColor" stroke-width="1.8"/><circle cx="12" cy="12" r="4" stroke="currentColor" stroke-width="1.8"/><circle cx="12" cy="12" r="1.3" fill="currentColor"/></svg>`,
  pin: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M12 21C12 21 18 15 18 10A6 6 0 0 0 6 10C6 15 12 21 12 21Z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><circle cx="12" cy="10" r="2.2" stroke="currentColor" stroke-width="1.6"/></svg>`,
  bulb: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M9 18H15" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><path d="M10 21H14" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><path d="M12 3A6 6 0 0 0 8.5 14L9.5 16H14.5L15.5 14A6 6 0 0 0 12 3Z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg>`,
  calendar: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none"><rect x="4" y="5" width="16" height="16" rx="2" stroke="currentColor" stroke-width="1.8"/><path d="M4 10H20" stroke="currentColor" stroke-width="1.8"/><path d="M8 3V7" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><path d="M16 3V7" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>`,
  sprout: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M12 21V12" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><path d="M12 12C12 12 6 12 6 6C12 6 12 12 12 12Z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="M12 9C12 9 18 9 18 4C12 4 12 9 12 9Z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg>`,
  tree: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M12 22V15" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><path d="M12 2L6 11H18L12 2Z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="M12 8L7.5 15H16.5L12 8Z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg>`,
  sparkle: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M12 3L13.8 9.2L20 11L13.8 12.8L12 19L10.2 12.8L4 11L10.2 9.2L12 3Z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg>`,
  grad: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M2 8L12 3L22 8L12 13L2 8Z" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/><path d="M6 10.5V15C6 15 8.5 17.5 12 17.5C15.5 17.5 18 15 18 15V10.5" stroke="currentColor" stroke-width="1.7"/></svg>`,
  code: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M8 7L3 12L8 17" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/><path d="M16 7L21 12L16 17" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  mic: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none"><rect x="9" y="3" width="6" height="11" rx="3" stroke="currentColor" stroke-width="1.7"/><path d="M6 11C6 11 6 17 12 17C18 17 18 11 18 11" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/><path d="M12 17V21" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>`,
  chart: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M4 20V10" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/><path d="M12 20V4" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/><path d="M20 20V14" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/></svg>`,
  briefcase: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none"><rect x="3" y="8" width="18" height="11" rx="2" stroke="currentColor" stroke-width="1.7"/><path d="M8 8V6C8 4.9 8.9 4 10 4H14C15.1 4 16 4.9 16 6V8" stroke="currentColor" stroke-width="1.7"/><path d="M3 13H21" stroke="currentColor" stroke-width="1.7"/></svg>`,
  building: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none"><rect x="5" y="3" width="14" height="18" rx="1" stroke="currentColor" stroke-width="1.7"/><path d="M9 7H10M14 7H15M9 11H10M14 11H15M9 15H10M14 15H15" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>`,
  laptop: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none"><rect x="4" y="5" width="16" height="10" rx="1.5" stroke="currentColor" stroke-width="1.7"/><path d="M2 19H22" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>`,
  shuffle: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M4 6H8L17 18H21" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><path d="M4 18H8L10 15" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><path d="M14 9L17 6H21" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><path d="M18 3L21 6L18 9" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><path d="M18 15L21 18L18 21" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  handshake: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M2 12L6 8L10 11L14 7L18 11L22 8" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><path d="M6 8L2 12V17L6 20L10 17V12" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>`
};

function renderForm(){
  const v = state.values;
  return `
  <section class="hero">
    <div class="hero-bg"></div>
    <div class="hero-grid"></div>
<div class="hero-inner">


   <div class="hero-banner">
    <span class="hero-badge">Grand Appel à Collaboration</span>
    <span class="hero-company">Cabinet EducTech & Mosso corporation</span>
  </div>


    <h1 class="title">
        Construisons ensemble
        <span class="grad">les talents de demain</span>
    </h1>


<div class="subtitle-cab">
   Un réseau d'experts, de formateurs et d'innovateurs au service du développement des compétences.
</div>


   <p class="hook">
    Vous avez un savoir à transmettre ?
    <strong>Une idée qui mérite d'être entendue ?</strong>
    Rejoignez une communauté qui transforme les compétences en impact.
   </p>


    <div class="rejoignez">
        Rejoignez notre réseau.
    </div>


    <div class="hero-actions">

        <button class="btn-primary" onclick="window.__scrollTo('form-anchor')">
            Rejoindre le réseau
        </button>

        <button class="btn-ghost" onclick="window.__scrollTo('programs-anchor')">
            Découvrir nos programmes
        </button>

    </div>

</div>

    <div class="scroll-hint"></div>
</section>

 <section class="intro reveal-el">

    <div class="intro-box">

        <div class="icon-badge blue-bg">
            ${ICON_HANDSHAKE}
        </div>

        <span class="intro-tag">
            Qui sommes-nous ?
        </span>

        <h2 class="intro-title">
            Rejoignez une communauté qui partage son savoir
        </h2>

        <p class="intro-text">
            <strong>EducTech Consulting et Mosso corporation</strong> rassemblent des personnes passionnées qui souhaitent transmettre leurs compétences, inspirer les autres et contribuer au développement des jeunes à travers des formations, des conférences et des échanges d'expériences.
        </p>

    </div>

</section>
<section class="profils reveal-el">

    <div class="section-eyebrow">
        🤝 Profils recherchés
    </div>

    <h2 class="section-title">
        Les talents que nous souhaitons
        <span class="u1">accueillir</span>
        <span class="title-accent"></span>
    </h2>

    <p class="section-desc">
        Vous êtes un professionnel, un entrepreneur, un expert ou un passionné désireux de partager vos connaissances ? Rejoignez le réseau de notre Cabinet et contribuez à former, inspirer et accompagner les talents de demain.
    </p>

    <div class="profil-grid">

        <!-- Formation -->

        <div class="profil-item">

            <div class="icon-badge blue-bg">
                ${ICON_CAP}
            </div>

            <h3>Formateurs & Enseignants</h3>

            <p>
                Animez des formations, ateliers, conférences ou masterclass
                dans votre domaine d'expertise.
            </p>

        </div>

        <!-- Numérique -->

        <div class="profil-item">

            <div class="icon-badge blue-bg">
                ${ICON_CODE}
            </div>

            <h3>Experts du Numérique</h3>

            <p>
                Développement web et mobile, intelligence artificielle,
                cybersécurité, data, cloud, bureautique et innovation digitale.
            </p>

        </div>

        <!-- Communication -->

        <div class="profil-item">

            <div class="icon-badge orange-bg">
                ${ICON_MEGAPHONE}
            </div>

            <h3>Communication & Médias</h3>

            <p>
                Journalistes, créateurs de contenus, podcasteurs,
                photographes, vidéastes, animateurs et spécialistes de la communication.
            </p>

        </div>

        <!-- Entrepreneuriat -->

        <div class="profil-item">

            <div class="icon-badge green-bg">
                ${ICON_TARGET}
            </div>

            <h3>Entrepreneurs & Innovateurs</h3>

            <p>
                Porteurs de projets, startups, coachs, mentors et
                acteurs de l'innovation souhaitant accompagner la jeunesse.
            </p>

        </div>

        <!-- Gestion -->

        <div class="profil-item">

            <div class="icon-badge blue-bg">
                ${ICON_BRIEFCASE}
            </div>

            <h3>Consultants & Experts</h3>

            <p>
                Gestion de projet, leadership, ressources humaines,
                finance, développement local, secteur humanitaire et conseil stratégique.
            </p>

        </div>

        <!-- Autres -->

        <div class="profil-item">

            <div class="icon-badge orange-bg">
                ${ICON_STAR}
            </div>

            <h3>Autres Expertises</h3>

            <p>
                Toute compétence, expérience ou initiative pouvant contribuer
                au développement des compétences, à l'employabilité et à
                l'entrepreneuriat des jeunes.
            </p>

        </div>

    </div>

</section>

 <section class="programs reveal-el" id="programs-anchor">

    <div class="section-eyebrow">
        🚀 Trois programmes • Une même mission
    </div>

    <h2 class="section-title">
        Choisissez votre façon de
        <span class="u1">collaborer</span>
        <span class="title-accent"></span>
    </h2>

    <p class="section-desc">
        Partagez votre expertise, inspirez la jeunesse et développez votre réseau
        grâce aux programmes du Cabinet EducTech Consulting.
    </p>

    <div class="prog-grid">

        <!-- ORELA -->

        <article class="prog-box orela">

            <div class="prog-number">01</div>

            <div class="prog-top">

                <div class="icon-badge blue-bg">
                    ${ICON_ORELA}
                </div>

                <div>

                    <div class="prog-tag">
                        Programme de formation
                    </div>

                    <div class="prog-name">
                        ORELA
                    </div>

                </div>

            </div>

            <p class="prog-desc">

                Animez des <strong>formations</strong>,
                conférences ou ateliers pratiques
                en présentiel ou en ligne afin de
                transmettre votre savoir.

            </p>

            <ul class="prog-list">

                <li>✔ Formations professionnelles</li>

                <li>✔ Conférences & débats</li>

                <li>✔ Ateliers pratiques</li>

                <li>✔ Présentiel ou en ligne</li>

            </ul>

        </article>


        <!-- NEXELA -->

        <article class="prog-box nexela">

            <div class="prog-number">02</div>

            <div class="prog-top">

                <div class="icon-badge orange-bg">
                    ${ICON_NEXELA}
                </div>

                <div>

                    <div class="prog-tag">
                        Podcast & Média
                    </div>

                    <div class="prog-name">
                        NEXELA
                    </div>

                </div>

            </div>

            <p class="prog-desc">

                Faites connaître votre parcours,
                vos idées ou votre projet à travers
                des podcasts, interviews et émissions.

            </p>

            <ul class="prog-list">

                <li>✔ Podcast</li>

                <li>✔ Interview vidéo</li>

                <li>✔ Émission</li>

                <li>✔ Valorisation de votre expertise</li>

            </ul>

        </article>

        <!-- MOSSO CONNECT -->

        <article class="prog-box mosso">

            <div class="prog-number">03</div>

            <div class="prog-top">

                <div class="icon-badge green-bg">
                    ${ICON_MOSSO}
                </div>

                <div>

                    <div class="prog-tag">
                        Jeunesse & Entrepreneuriat
                    </div>

                    <div class="prog-name">
                        Mosso Connect
                    </div>

                </div>

            </div>

            <p class="prog-desc">
                Développez les compétences des jeunes, stimulez l'entrepreneuriat
                et accompagnez les porteurs de projets vers un avenir durable grâce
                au mentorat, aux formations et au réseautage.
            </p>

            <ul class="prog-list">

                <li>✔ Développement des compétences</li>
                <li>✔ Entrepreneuriat & innovation</li>
                <li>✔ Leadership & mentorat</li>
                <li>✔ Réseautage et accompagnement</li>

            </ul>

        </article>
        


    </div>

</section>
<section class="impact reveal-el">

    <div class="impact-box">

        <div class="icon-badge impact-icon">
            ${ICON_STAR}
        </div>

        <span class="impact-tag">
            ✨ Rejoignez un réseau d'impact
        </span>

        <h2 class="impact-title">
            Ensemble, construisons les compétences de demain
        </h2>

        <p class="impact-text">

            En rejoignant le <span class="hl-blue">Cabinet EducTech Consulting</span>,
            vous intégrez une communauté de professionnels, de formateurs, de mentors
            et d'innovateurs engagés pour le développement des compétences,
            l'employabilité et l'entrepreneuriat des jeunes.

            <br><br>

            Notre collaboration repose avant tout sur
            <strong>le partage des connaissances, la solidarité professionnelle
            et l'engagement citoyen.</strong>

            Dans cette première phase, les interventions sont réalisées
            <strong>sur une base volontaire</strong>, tout en offrant des opportunités
            de <span class="hl-orange">visibilité, de réseautage, de développement personnel
            et de futures collaborations professionnelles.</span>

        </p>

        <div class="impact-items">

            <div class="impact-item">
                🎓 Partagez votre expertise
            </div>

            <div class="impact-item">
                🌍 Développez votre réseau professionnel
            </div>

            <div class="impact-item">
                🚀 Accompagnez les jeunes talents
            </div>

            <div class="impact-item">
                💡 Encouragez l'innovation et l'entrepreneuriat
            </div>

            <div class="impact-item">
                🤝 Collaborez avec des experts de divers secteurs
            </div>

            <div class="impact-item">
                🇹🇩 Contribuez au développement durable du Tchad
            </div>

        </div>

    </div>

</section>

 <section class="location reveal-el">

    <div class="location-box">

        <div class="location-icon">

            ${ICON_PIN}

        </div>

        <div class="location-content">

            <span class="location-tag">

                📍 Notre adresse

            </span>

            <h2 class="loc-title">

                Cabinet EducTech & Mosso corporation

            </h2>

            <p class="loc-city">

                N'Djaména • Tchad

            </p>

            <p class="loc-detail">

                Situé juste après le marché <strong>Adallah</strong>,
                en direction du rond-point <strong>Hamama</strong>,
                à environ <strong>150 mètres</strong>,
                dans un immeuble blanc et noir situé sur la droite.

            </p>

            <button class="location-btn"
            onclick="window.open('https://maps.google.com/?q=EducTech+Consulting+N+Djamena')">

            📍 Nous localiser

            </button>

        </div>

    </div>

</section>

  <section class="form-section" id="form-anchor">

    <div class="form-wrap">

        <form class="panel"
              id="mainForm"
              action="https://formspree.io/f/xpqvzbgr"
              method="POST"
              onsubmit="submitForm(event)">

            <div class="panel-title">
                Rejoindre le réseau du cabinet
            </div>

            <div class="panel-sub">
                Rejoignez notre communauté d'experts, de formateurs, de mentors et
                d'innovateurs pour contribuer au développement des compétences,
                de l'entrepreneuriat et de l'innovation au Tchad.
            </div>

            <div class="progress-track">
                <div class="progress-fill" style="width:${formProgress(v)}%"></div>
            </div>

            ${state.formError ? `<div class="form-error">${state.formError}</div>` : ''}

            <input
                type="hidden"
                name="_subject"
                value="Nouvelle candidature — EducTech Consulting" />

            <!-- Nom -->

            <div class="field">

                <label class="q">

                    <span class="field-icon">${FI.user}</span>

                    Nom complet

                    <span class="req">*</span>

                </label>

                <div class="input-wrap">

                    <span class="field-emoji">${FI.user}</span>

                    <input
                        type="text"
                        name="nom"
                        value="${v.nom}"
                        oninput="window.__setNom(this.value)"
                        placeholder="Votre nom et prénom"
                        required />

                </div>

            </div>

            <!-- Contact -->

            <div class="field">

                <label class="q">

                    <span class="field-icon">${FI.phone}</span>

                    Téléphone ou Email

                    <span class="req">*</span>

                </label>

                <div class="input-wrap">

                    <span class="field-emoji">${FI.phone}</span>

                    <input
                        type="text"
                        name="contact"
                        value="${v.contact}"
                        oninput="window.__setContact(this.value)"
                        placeholder="+235 ... ou votre adresse email"
                        required />

                </div>

            </div>

            <!-- Profil -->

            <div class="field">

                <label class="q">

                    <span class="field-icon">${FI.people}</span>

                    Votre profil

                    <span class="req">*</span>

                </label>

                <input
                    type="hidden"
                    name="profil"
                    value="${v.tranche}" />

                <div class="tile-grid">

                    ${[
                        ['Étudiant',FI.grad],
                        ['Professionnel',FI.briefcase],
                        ['Entrepreneur',FI.bulb],
                        ['Consultant',FI.handshake],
                        ['Autre',FI.sparkle]
                    ].map(([t,icon])=>`

                    <div class="tile ${v.tranche===t?'sel':''}"
                         onclick="window.__setTranche('${t}')">

                        <span class="tile-icon">${icon}</span>

                        <span class="tile-label">${t}</span>

                    </div>

                    `).join('')}

                </div>

            </div>

            <!-- Domaine -->

            <div class="field">

                <label class="q">

                    <span class="field-icon">${FI.tools}</span>

                    Domaine(s) de compétence

                    <span class="req">*</span>

                </label>

                <input
                    type="hidden"
                    name="domaines"
                    value="${v.domaines.join(', ')}" />

                ${chipGroup('domaines', [

                    ['Formation & Enseignement',FI.grad],

                    ['Développement Web & IA',FI.code],

                    ['Communication & Médias',FI.mic],

                    ['Marketing Digital',FI.chart],

                    ['Entrepreneuriat & Innovation',FI.bulb],

                    ['Gestion de projet & Conseil',FI.briefcase],

                    ['Secteur humanitaire',FI.handshake],

                    ['Autre',FI.sparkle]

                ])}

                <div class="hint">
                    Vous pouvez sélectionner plusieurs domaines.
                </div>

                ${v.domaines.includes('Autre')

                    ? `<input
                        style="margin-top:12px"
                        type="text"
                        name="domaine_autre"
                        value="${v.domaineAutre}"
                        oninput="window.__setDomaineAutre(this.value)"
                        placeholder="Précisez votre domaine" />`

                    : ''}

            </div>

            <!-- Programmes -->

            <div class="field">

                <label class="q">

                    <span class="field-icon">${FI.target}</span>

                    Programme(s) souhaité(s)

                </label>

                <input
                    type="hidden"
                    name="programmes"
                    value="${v.formats.join(', ')}" />

                ${chipGroup('formats',[

                    ['ORELA — Formation & Conférences',FI.grad],

                    ['NEXELA — Podcast & Médias',FI.mic],

                    ['MOSSO CONNECT — Entrepreneuriat',FI.bulb],

                    ['Tous les programmes',FI.handshake]

                ])}

            </div>

            <!-- Modalité -->

            <div class="field">

                <label class="q">

                    <span class="field-icon">${FI.pin}</span>

                    Modalité préférée

                </label>

                <input
                    type="hidden"
                    name="modalite"
                    value="${v.modalite}" />

                <div class="tile-grid tile-grid-4">

                    ${[
                        ['Présentiel',FI.building],
                        ['En ligne',FI.laptop],
                        ['Hybride',FI.shuffle],
                        ['Flexible',FI.calendar]
                    ].map(([t,icon])=>`

                    <div class="tile ${v.modalite===t?'sel':''}"
                         onclick="window.__setModalite('${t}')">

                        <span class="tile-icon">${icon}</span>

                        <span class="tile-label">${t}</span>

                    </div>

                    `).join('')}

                </div>

            </div>

            <!-- Contribution -->

            <div class="field">

                <label class="q">

                    <span class="field-icon">${FI.bulb}</span>

                    Comment souhaitez-vous contribuer ?

                </label>

                <textarea
                    name="themes"
                    maxlength="350"
                    oninput="window.__setThemes(this.value)"
                    placeholder="Présentez brièvement votre expérience, vos compétences ou ce que vous souhaitez apporter au réseau...">${v.themes}</textarea>

                <div class="char-count">
                    ${v.themes.length}/350
                </div>

            </div>

            <!-- Disponibilité -->

            <div class="field">

                <label class="q">

                    <span class="field-icon">${FI.calendar}</span>

                    Disponibilités

                </label>

                <div class="input-wrap">

                    <span class="field-emoji">${FI.calendar}</span>

                    <input
                        type="text"
                        name="disponibilite"
                        value="${v.dispo}"
                        oninput="window.__setDispo(this.value)"
                        placeholder="Ex. : En semaine, week-end, soirées..." />

                </div>

            </div>

            <!-- Confidentialité -->

            <div class="privacy-note">

                🔒 Vos informations resteront strictement confidentielles
                et seront utilisées uniquement dans le cadre des activités
                du Cabinet EducTech Consulting.

            </div>

            <!-- Bouton -->

            <button
                class="submit"
                type="submit"
                id="submitBtn"
                ${state.submitting?'disabled':''}>

                ${state.submitting
                    ? 'Envoi en cours...'
                    : 'Rejoindre le réseau'}

            </button>

        </form>

        <div class="admin-toggle">

            Espace organisateur —

            <button
                type="button"
                class="admin-link-btn"
                id="viewResponsesBtn">

                Voir les réponses

            </button>

        </div>

    </div>

</section>
  `;
}


function renderSuccess(){
  return `
 <section class="hero success-hero">

    <div class="hero-bg"></div>

    <div class="hero-inner">

        <div class="success-card">

            <div class="success-icon">
                ✓
            </div>

            <span class="success-badge">
                Demande envoyée avec succès
            </span>

            <h2>
                Merci, ${state.values.nom.split(' ')[0] || ''} !
            </h2>

            <p>
                Votre réponse a bien été enregistrée.<br>
                Le <strong>Cabinet EducTech Consulting</strong> vous contactera très prochainement.
            </p>

            <a href="index.html" class="btn-primary">
                Retour à l'accueil
            </a>

        </div>

    </div>

</section>
  `;
}

function renderAdmin(){
  if(state.adminData === null){
    return `<div class="form-section"><div class="form-wrap"><div class="panel"><div class="empty">Chargement des réponses…</div></div></div></div>`;
  }
  const items = state.adminData;
  return `
  <section class="hero" style="min-height:44vh;">
    <div class="hero-bg"></div>
    <div class="hero-inner">
      <div class="eyebrow"><span class="dot"></span>Espace organisateur</div>
      <h1 class="title" style="font-size:1.8rem;">Réponses reçues</h1>
      <p style="color:rgba(255,255,255,0.8);">${items.length} réponse${items.length>1?'s':''} au total.</p>
    </div>
  </section>
  <div class="form-section">
    <div class="form-wrap">
      ${state.adminError ? `<div class="form-error">${state.adminError}</div>` : ''}
      ${items.length===0 ? `<div class="panel"><div class="empty">Aucune réponse pour l'instant.</div></div>` : items.map(it=>`
        <div class="resp-card">
          <div class="name">${it.nom||'—'}</div>
          <div class="meta">${it.contact||''} · ${it.tranche||''} · ${new Date(it.submittedAt).toLocaleString('fr-FR')}</div>
          <div class="tags">
            ${(it.domaines||[]).map(d=>`<span class="tag">${d}</span>`).join('')}
            ${(it.formats||[]).map(f=>`<span class="tag">${f}</span>`).join('')}
            ${it.modalite?`<span class="tag">${it.modalite}</span>`:''}
          </div>
          ${it.themes?`<div class="note"><strong>Thèmes :</strong> ${it.themes}</div>`:''}
          ${it.dispo?`<div class="note"><strong>Disponibilité :</strong> ${it.dispo}</div>`:''}
        </div>
      `).join('')}
      <div style="margin-top:20px; text-align:center;"><button type="button" class="back-link" id="backToFormBtn">← Retour au formulaire</button></div>
    </div>
  </div>
  `;
}

function setupScrollReveal(){
  const els = document.querySelectorAll('.reveal-el');
  if(!('IntersectionObserver' in window)){ els.forEach(c=>c.classList.add('in')); return; }
  const obs = new IntersectionObserver((entries)=>{
    entries.forEach((entry)=>{ if(entry.isIntersecting){ entry.target.classList.add('in'); obs.unobserve(entry.target); } });
  }, { threshold:0.12 });
  els.forEach(c=>obs.observe(c));
}

function attachRobustListeners(){
  const viewBtn = document.getElementById('viewResponsesBtn');
  if(viewBtn){
    viewBtn.addEventListener('click', showAccessModal);
    viewBtn.addEventListener('touchend', function(e){ e.preventDefault(); showAccessModal(); });
  }
  const backBtn = document.getElementById('backToFormBtn');
  if(backBtn){
    const goBack = ()=>{ state.view='form'; render(); };
    backBtn.addEventListener('click', goBack);
    backBtn.addEventListener('touchend', function(e){ e.preventDefault(); goBack(); });
  }
  const form = document.getElementById('mainForm');
  if(form){
    form.addEventListener('submit', submitForm);
  }
  const submitBtn = document.getElementById('submitBtn');
  if(submitBtn){
    submitBtn.addEventListener('click', submitForm);
    submitBtn.addEventListener('touchend', function(e){ e.preventDefault(); submitForm(e); });
  }
}

function render(){
  const app = document.getElementById('app');
  if(state.view==='form') app.innerHTML = renderForm();
  else if(state.view==='success') app.innerHTML = renderSuccess();
  else if(state.view==='admin') app.innerHTML = renderAdmin();
  const foot = document.createElement('footer');
  foot.innerHTML = "<strong>EducTech Consulting</strong> — L'innovation au service de l'éducation · N'Djaména, Tchad";
  app.appendChild(foot);
  setupScrollReveal();
  attachRobustListeners();
}

render();
