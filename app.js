// Simple, robust JS for EventCo (no external deps)

// LocalStorage keys
const KEY_EVENTS = 'eventco_events_v1';
const KEY_REGS = 'eventco_regs_v1';

// helpers
const $ = id => document.getElementById(id);
const uid = (p='e') => p + Math.random().toString(36).slice(2,9);

function load(key){ try { return JSON.parse(localStorage.getItem(key)) || [] } catch { return [] } }
function save(key, v){ localStorage.setItem(key, JSON.stringify(v)) }

function escapeXml(s){ return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;') }
function svgPlaceholder(title){
  var svg = '<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"1200\" height=\"600\"><rect width=\"100%\" height=\"100%\" fill=\"#f3f6ff\"/><text x=\"48\" y=\"320\" font-size=\"40\" fill=\"#374151\" font-family=\"Arial\">' + escapeXml(title) + '</text></svg>';
  return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
}

// seed sample events if empty
if(!localStorage.getItem(KEY_EVENTS)){
  save(KEY_EVENTS, [
    { id: uid('e'), title: 'Campus Music Fest', desc: 'Open-air music and food', date: '2025-12-12', time: '18:00', venue: 'Main Lawn', capacity: 300, image: 'Music.jpg' },
    { id: uid('e'), title: 'Tech Hackathon', desc: '24-hour coding challenge', date: '2025-11-30', time: '09:00', venue: 'Lab Block', capacity: 150, image: '' },
    { id: uid('e'), title: 'Startup Pitch Night', desc: 'Students pitch startup ideas', date: '2025-12-07', time: '16:00', venue: 'Auditorium', capacity: 120, image: '' }
  ]);
}

// render logic
function formatDate(d){ try { return new Date(d).toLocaleDateString() } catch { return d } }

function createCard(ev){
  const card = document.createElement('article');
  card.className = 'card';

  const img = document.createElement('img');
  img.className = 'cover';
  img.alt = ev.title;
  img.src = ev.image || svgPlaceholder(ev.title);

  const body = document.createElement('div'); body.className = 'card-body';
  const title = document.createElement('div'); title.className = 'title'; title.textContent = ev.title;
  const desc = document.createElement('div'); desc.className = 'desc'; desc.textContent = ev.desc;
  const meta = document.createElement('div'); meta.className = 'meta'; meta.innerHTML = '<div>' + formatDate(ev.date) + ' • ' + (ev.time||'') + ' • ' + (ev.venue||'') + '</div><div class=\"muted\">Seats: ' + (ev.capacity||0) + '</div>';

  const actions = document.createElement('div'); actions.className = 'actions';
  const dBtn = document.createElement('button'); dBtn.className = 'btn'; dBtn.textContent = 'Details';
  dBtn.onclick = () => openDetails(ev.id);
  const rBtn = document.createElement('button'); rBtn.className = 'btn accent'; rBtn.textContent = 'Register';
  rBtn.onclick = () => openRegister(ev.id);

  // disable if full
  const regs = load(KEY_REGS).filter(r => r.eventId === ev.id);
  if(ev.capacity && regs.length >= ev.capacity){
    rBtn.disabled = true;
    rBtn.textContent = 'Full';
    rBtn.style.opacity = '0.7';
  }

  actions.appendChild(dBtn);
  actions.appendChild(rBtn);
  body.appendChild(title);
  body.appendChild(desc);
  body.appendChild(meta);
  body.appendChild(actions);

  card.appendChild(img);
  card.appendChild(body);
  return card;
}

function render(){
  const events = load(KEY_EVENTS).sort((a,b)=> new Date(a.date) - new Date(b.date));
  const grid = $('eventsGrid'); grid.innerHTML = '';
  const q = ($('q').value||'').toLowerCase();
  const upcoming = events.filter(ev => new Date(ev.date + 'T' + (ev.time||'00:00')) >= new Date());
  $('totalEvents').textContent = events.length;
  $('upcomingCount').textContent = upcoming.length;

  events.forEach(ev => {
    if(q && !( (ev.title + ' ' + ev.desc).toLowerCase().includes(q) )) return;
    grid.appendChild(createCard(ev));
  });
}

// modal helpers
function showModal(id){ const m = $(id); if(m){ m.style.display = 'flex'; m.setAttribute('aria-hidden','false'); } }
function hideModal(id){ const m = $(id); if(m){ m.style.display = 'none'; m.setAttribute('aria-hidden','true'); } }

function openDetails(id){
  const ev = load(KEY_EVENTS).find(x=>x.id === id); if(!ev) return;
  $('mTitle').textContent = ev.title;
  $('mImg').src = ev.image || svgPlaceholder(ev.title);
  $('mDesc').textContent = ev.desc;
  $('mMeta').textContent = formatDate(ev.date) + ' • ' + (ev.time||'') + ' • ' + (ev.venue||'');
  $('mEventId').value = ev.id;
  const seatsLeft = (ev.capacity||0) - load(KEY_REGS).filter(r => r.eventId === ev.id).length;
  $('mSeats').textContent = seatsLeft >= 0 ? seatsLeft : 0;
  $('detailOnly').classList.remove('hidden'); $('regSection').classList.add('hidden');
  showModal('modal');
}

function openRegister(id){
  const ev = load(KEY_EVENTS).find(x=>x.id === id); if(!ev) return;
  $('mTitle').textContent = ev.title;
  $('mImg').src = ev.image || svgPlaceholder(ev.title);
  $('mMeta').textContent = formatDate(ev.date) + ' • ' + (ev.time||'') + ' • ' + (ev.venue||'');
  $('mEventId').value = ev.id; $('rName').value=''; $('rEmail').value=''; $('rPhone').value=''; $('regMsg').textContent='';
  $('detailOnly').classList.add('hidden'); $('regSection').classList.remove('hidden');
  showModal('modal');
}

// registration submit
$('regForm').addEventListener('submit', function(e){
  e.preventDefault();
  const id = $('mEventId').value;
  const name = $('rName').value.trim();
  const email = $('rEmail').value.trim();
  if(!name || !email){ $('regMsg').textContent = 'Name & email required'; return; }
  const ev = load(KEY_EVENTS).find(x=>x.id === id); const regs = load(KEY_REGS);
  if(regs.find(r => r.eventId === id && r.email.toLowerCase() === email.toLowerCase())){ $('regMsg').textContent = 'Already registered'; return; }
  if(ev.capacity && regs.filter(r => r.eventId === id).length >= ev.capacity){ $('regMsg').textContent = 'No seats left'; return; }
  const regId = 'R' + Math.random().toString(36).slice(2,8).toUpperCase();
  regs.push({ id: uid('r'), eventId: id, name, email, phone: $('rPhone').value.trim(), regId, created: new Date().toISOString() });
  save(KEY_REGS, regs);
  $('regMsg').textContent = 'Registered — ID: ' + regId;
  render();
});

// modal buttons
$('openRegBtn').addEventListener('click', function(){ const id = $('mEventId').value; openRegister(id); });
$('regBack').addEventListener('click', function(){ $('regSection').classList.add('hidden'); $('detailOnly').classList.remove('hidden'); });
$('closeModal').addEventListener('click', function(){ hideModal('modal'); });

// Admin UI
$('adminOpen').addEventListener('click', function(){ const pwd = prompt('Admin password (demo):'); if(pwd === 'admin123'){ showModal('adminModal'); renderAdmin(); } else alert('Wrong password'); });
$('closeAdmin').addEventListener('click', function(){ hideModal('adminModal'); });
$('addEventBtn').addEventListener('click', function(){ showModal('adminModal'); editEvent(); });

// Open external form for adding events
// document.getElementById("addEventBtn").addEventListener("click", function(){
//     window.open("https://forms.gle/dCi9PmNk5SVFgtgN8", "_blank");
// });


function renderAdmin(){
  const evts = load(KEY_EVENTS).sort((a,b)=> new Date(a.date)-new Date(b.date));
  const area = $('evTableContainer'); area.innerHTML = '<table style="width:100%;border-collapse:collapse"><thead><tr><th style="text-align:left">Title</th><th>Date</th><th>Actions</th></tr></thead><tbody>' + evts.map(e => '<tr><td>' + e.title + '</td><td>' + e.date + '</td><td><button data-id=\"' + e.id + '\" class=\"btn edit\">Edit</button> <button data-id=\"' + e.id + '\" class=\"btn del\">Delete</button></td></tr>').join('') + '</tbody></table>';
  area.querySelectorAll('.edit').forEach(b => b.addEventListener('click', function(){ editEvent(this.getAttribute('data-id')) }));
  area.querySelectorAll('.del').forEach(b => b.addEventListener('click', function(){ delEvent(this.getAttribute('data-id')) }));
}

function editEvent(id){
  if(!id){ $('evId').value=''; $('eventForm').reset(); return; }
  const ev = load(KEY_EVENTS).find(x=>x.id === id); if(!ev) return;
  $('evId').value = ev.id; $('evTitle').value = ev.title; $('evDesc').value = ev.desc; $('evDate').value = ev.date; $('evTime').value = ev.time; $('evVenue').value = ev.venue; $('evCap').value = ev.capacity||0;
}

function handleImageFile(file, cb){
  if(!file) return cb('');
  const r = new FileReader();
  r.onload = () => cb(r.result);
  r.readAsDataURL(file);
}

$('eventForm').addEventListener('submit', function(e){
  e.preventDefault();
  const id = $('evId').value;
  const obj = { title: $('evTitle').value.trim(), desc: $('evDesc').value.trim(), date: $('evDate').value, time: $('evTime').value, venue: $('evVenue').value.trim(), capacity: parseInt($('evCap').value) || 0 };
  const file = $('evImage').files[0];
  handleImageFile(file, function(img){
    const evts = load(KEY_EVENTS);
    if(id){
      const idx = evts.findIndex(x=>x.id === id);
      if(idx >= 0) evts[idx] = Object.assign({}, evts[idx], obj, { image: img === null ? evts[idx].image : img });
    } else {
      evts.push(Object.assign({ id: uid('e') }, obj, { image: img || '', created: new Date().toISOString() }));
    }
    save(KEY_EVENTS, evts);
    alert('Saved');
    hideModal('adminModal');
    render();
  });
});

function delEvent(id){
  if(!confirm('Delete event?')) return;
  const evts = load(KEY_EVENTS).filter(x => x.id !== id);
  save(KEY_EVENTS, evts);
  const regs = load(KEY_REGS).filter(r => r.eventId !== id);
  save(KEY_REGS, regs);
  renderAdmin();
  render();
}

function exportCSV(rows, name){
  const csv = rows.map(r => r.map(c => '"' + String(c).replace(/"/g,'""') + '"').join(',')).join('\\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

function viewRegs(id){
  const regs = load(KEY_REGS).filter(r => r.eventId === id);
  if(!regs.length) return alert('No registrations');
  const rows = [['RegID','Name','Email','Phone','When']];
  regs.forEach(r => rows.push([r.regId, r.name, r.email, r.phone||'', r.created]));
  exportCSV(rows, 'regs_' + id + '.csv');
}

$('exportAll').addEventListener('click', function(){
  const regs = load(KEY_REGS);
  if(!regs.length) return alert('No registrations');
  const rows = [['EventID','RegID','Name','Email','Phone','When']];
  regs.forEach(r => rows.push([r.eventId, r.regId, r.name, r.email, r.phone||'', r.created]));
  exportCSV(rows, 'all_regs.csv');
});

$('logout').addEventListener('click', function(){ sessionStorage.removeItem('eventco_admin'); alert('Logged out'); hideModal('adminModal'); });

// search binding and init
$('q').addEventListener('input', render);

// theme toggle (simple)
$('themeBtn').addEventListener('click', function(){
  if(document.documentElement.getAttribute('data-theme') === 'dark') document.documentElement.removeAttribute('data-theme');
  else document.documentElement.setAttribute('data-theme','dark');
});

// initial render
render();
