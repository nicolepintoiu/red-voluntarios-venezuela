/* ══════════════════════════════════════════════
   Red Voluntarios Venezuela — app.js
   Correo: techsolutionsalthea@gmail.com
   ══════════════════════════════════════════════
   CONFIGURACION: pega tu URL de Apps Script abajo
*/

const CONFIG = {
  APPS_SCRIPT_URL: 'https://script.google.com/macros/s/AKfycbwCSoprfQwFiAq__FV3WSG3-iym8FaxYmwxk0c11qM-VD94C1Zr8cQeP6avG8FriYIU/exec',
};

const CORREO_ADMIN = 'techsolutionsalthea@gmail.com';

// ══════════════════════════════════════════════
//  NAVEGACION
// ══════════════════════════════════════════════

function showView(name) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.getElementById('view-' + name).classList.add('active');
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  const btns = document.querySelectorAll('.nav-btn');
  const idx  = { refugios:0, registro:1, vacante:2 };
  if (btns[idx[name]]) btns[idx[name]].classList.add('active');
  closeMobileNav();
  window.scrollTo({ top: 0, behavior: 'smooth' });
  if (name === 'refugios') loadRefugios();
  if (name === 'vacante')  cargarInstitucionesEnSelector();
}

const hamburger = document.getElementById('hamburger');
hamburger.addEventListener('click', () => {
  const open = document.body.classList.toggle('mobile-nav-open');
  hamburger.classList.toggle('open', open);
});
function closeMobileNav() {
  document.body.classList.remove('mobile-nav-open');
  hamburger.classList.remove('open');
}

// ══════════════════════════════════════════════
//  CONTADORES
// ══════════════════════════════════════════════

async function cargarContadores() {
  if (!CONFIG.APPS_SCRIPT_URL) return;
  try {
    const res  = await fetch(`${CONFIG.APPS_SCRIPT_URL}?action=getContadores`);
    const data = await res.json();
    animarContador('contadorVoluntarios',  data.voluntarios   || 0);
    animarContador('contadorInstituciones', data.instituciones || 0);
  } catch {
    document.getElementById('contadorVoluntarios').textContent  = '—';
    document.getElementById('contadorInstituciones').textContent = '—';
  }
}

function animarContador(id, total) {
  const el  = document.getElementById(id);
  const dur = 1000;
  const fps = 30;
  const inc = total / (dur / (1000 / fps));
  let cur   = 0;
  const timer = setInterval(() => {
    cur += inc;
    if (cur >= total) { cur = total; clearInterval(timer); }
    el.textContent = Math.floor(cur);
  }, 1000 / fps);
}

// ══════════════════════════════════════════════
//  VIEW 1 — REFUGIOS
// ══════════════════════════════════════════════

let todasInstituciones = [];

async function loadRefugios() {
  const grid = document.getElementById('cardGrid');
  grid.innerHTML = '<div class="skeleton-card"></div><div class="skeleton-card"></div><div class="skeleton-card"></div>';
  try {
    todasInstituciones = await fetchInstituciones();
    renderCards(todasInstituciones);
  } catch {
    grid.innerHTML = '<div class="no-results"><p>No se pudo cargar la lista. Verifica tu conexion.</p></div>';
  }
}

async function fetchInstituciones() {
  if (!CONFIG.APPS_SCRIPT_URL) { await delay(600); return []; }
  const res  = await fetch(`${CONFIG.APPS_SCRIPT_URL}?action=getInstituciones`);
  const data = await res.json();
  return data.instituciones || [];
}

function renderCards(list) {
  const grid = document.getElementById('cardGrid');
  if (!list.length) {
    grid.innerHTML = `<div class="no-results"><p>Aun no hay refugios registrados.</p></div>`;
    return;
  }
  grid.innerHTML = list.map(r => `
    <article class="institution-card">
      <p class="card-name">${esc(r.nombre)}</p>
      <p class="card-address">${esc(r.direccion)}</p>
    </article>`).join('');
}

function filterCards() {
  const q = document.getElementById('searchInput').value.toLowerCase().trim();
  if (!q) { renderCards(todasInstituciones); return; }
  renderCards(todasInstituciones.filter(r =>
    r.nombre.toLowerCase().includes(q) ||
    r.direccion.toLowerCase().includes(q) ||
    (r.tipo||'').toLowerCase().includes(q)
  ));
}

// ══════════════════════════════════════════════
//  SELECTOR DE HORA AM/PM
// ══════════════════════════════════════════════

function opcionesHora() {
  let html = '';
  for (let h = 1; h <= 12; h++) html += `<option value="${h}">${h}:00</option>`;
  return html;
}

function agregarRango(fecha = '', desdeH='2', desdeAmpm='PM', hastaH='6', hastaAmpm='PM') {
  const container = document.getElementById('rangosContainer');
  const id        = Date.now() + Math.floor(Math.random()*1000);
  const div       = document.createElement('div');
  div.className   = 'rango-block';
  div.id          = 'rango-' + id;

  div.innerHTML = `
    <p class="dias-label">Fecha</p>
    <input type="date" class="rango-fecha" />
    <p class="dias-label" style="margin-top:10px;">Horario</p>
    <div class="rango-block-hora">
      <select class="rango-select-hora rango-desde-h">${opcionesHora()}</select>
      <select class="rango-select-ampm rango-desde-ampm">
        <option value="AM">AM</option><option value="PM">PM</option>
      </select>
      <span class="rango-sep">hasta</span>
      <select class="rango-select-hora rango-hasta-h">${opcionesHora()}</select>
      <select class="rango-select-ampm rango-hasta-ampm">
        <option value="AM">AM</option><option value="PM">PM</option>
      </select>
    </div>
    <span class="rango-block-delete" onclick="eliminarRango('rango-${id}')">Eliminar este horario ✕</span>`;

  container.appendChild(div);
  if (fecha) div.querySelector('.rango-fecha').value = fecha;
  div.querySelector('.rango-desde-h').value    = desdeH;
  div.querySelector('.rango-desde-ampm').value = desdeAmpm;
  div.querySelector('.rango-hasta-h').value    = hastaH;
  div.querySelector('.rango-hasta-ampm').value = hastaAmpm;
}

function eliminarRango(id) {
  const el = document.getElementById(id);
  if (el) el.remove();
}

// Convierte hora+ampm a formato 24h "HH:00"
function a24h(hora, ampm) {
  let h = parseInt(hora);
  if (ampm === 'AM' && h === 12) h = 0;
  if (ampm === 'PM' && h !== 12) h += 12;
  return String(h).padStart(2, '0') + ':00';
}

function getRangos() {
  const items  = document.querySelectorAll('.rango-block');
  const rangos = [];
  items.forEach(item => {
    const fechaInput = item.querySelector('.rango-fecha');
    const desdeH    = item.querySelector('.rango-desde-h');
    const desdeAmpm = item.querySelector('.rango-desde-ampm');
    const hastaH    = item.querySelector('.rango-hasta-h');
    const hastaAmpm = item.querySelector('.rango-hasta-ampm');
    if (!fechaInput || !desdeH || !desdeAmpm || !hastaH || !hastaAmpm) return;
    if (!fechaInput.value) return; // sin fecha seleccionada, se ignora este bloque
    const fechaDisplay = formatearFecha(fechaInput.value);
    rangos.push({
      fecha: fechaInput.value, // formato YYYY-MM-DD
      desde: a24h(desdeH.value, desdeAmpm.value),
      hasta: a24h(hastaH.value, hastaAmpm.value),
      texto: `${fechaDisplay}: ${desdeH.value}:00 ${desdeAmpm.value} - ${hastaH.value}:00 ${hastaAmpm.value}`,
    });
  });
  return rangos;
}

function formatearFecha(fechaISO) {
  // fechaISO: "2026-06-29" -> "29/06/2026"
  const [y, m, d] = fechaISO.split('-');
  return `${d}/${m}/${y}`;
}

// ══════════════════════════════════════════════
//  VIEW 2 — REGISTRO VOLUNTARIO
// ══════════════════════════════════════════════

document.getElementById('registroForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const form = e.target;
  if (!validateForm(form)) return;

  const rangos = getRangos();
  if (!rangos.length) {
    document.getElementById('err_rangos').textContent = 'Agrega al menos una fecha con su horario.';
    return;
  }
  document.getElementById('err_rangos').textContent = '';

  const habilidades = limpiarUnaHabilidad(form.habilidades.value);
  if (!esUnaSolaHabilidad(form.habilidades.value)) {
    const errEl = document.getElementById('err_r_habilidades');
    markError(form.habilidades, errEl, 'Solo puedes escribir una habilidad.');
    return;
  }
  document.getElementById('err_r_habilidades').textContent = '';

  const data = {
    nombre:      form.nombre.value.trim(),
    email:       form.email.value.trim(),
    rangos:      JSON.stringify(rangos),
    habilidades: habilidades,
  };

  setLoading('btnRegistro', true);
  try {
    await submitData('registrarVoluntario', data);
    showSuccess('registroForm', 'registroSuccess');
    showToast('Tus horarios fueron guardados correctamente.');
    cargarContadores(); // actualizar contadores
  } catch (err) {
    console.error(err);
    showToast('No se pudo conectar. Intenta de nuevo.', 'error');
  } finally {
    setLoading('btnRegistro', false);
  }
});

function resetRegistro() {
  document.getElementById('registroForm').reset();
  document.getElementById('registroForm').classList.remove('hidden');
  document.getElementById('registroSuccess').classList.add('hidden');
  document.getElementById('rangosContainer').innerHTML = '';
  document.querySelectorAll('.field-error').forEach(el => el.textContent = '');
  document.querySelectorAll('input,select').forEach(el => el.classList.remove('error'));
  agregarRango();
}

// ══════════════════════════════════════════════
//  VIEW 3 — NECESITO VOLUNTARIOS
// ══════════════════════════════════════════════

async function cargarInstitucionesEnSelector() {
  const select = document.getElementById('v_institucion');
  select.innerHTML = '<option value="">— Cargando lugares… —</option>';
  try {
    if (!todasInstituciones.length) todasInstituciones = await fetchInstituciones();
    if (!todasInstituciones.length) {
      select.innerHTML = '<option value="">— No hay lugares registrados aun —</option>';
      return;
    }
    select.innerHTML = '<option value="">— Selecciona el lugar —</option>' +
      todasInstituciones.map((inst, i) =>
        `<option value="${i}">${esc(inst.nombre)}</option>`
      ).join('');
  } catch {
    select.innerHTML = '<option value="">— Error al cargar —</option>';
  }
}

function onInstitucionChange() {
  const select  = document.getElementById('v_institucion');
  const infoBox = document.getElementById('lugarInfo');
  const dirEl   = document.getElementById('lugarDireccion');
  const idx     = select.value;
  if (idx === '') { infoBox.classList.add('hidden'); updatePreview(); return; }
  const inst = todasInstituciones[parseInt(idx)];
  dirEl.textContent = inst.direccion;
  infoBox.classList.remove('hidden');
  updatePreview();
}

function onCuandoChange() {
  const tipo    = document.querySelector('input[name="cuando_tipo"]:checked').value;
  const horaBox = document.getElementById('horaInput');
  horaBox.classList.toggle('hidden', tipo !== 'hora');
  updatePreview();
}

function getHoraVacante() {
  const h    = document.getElementById('v_hora_h')?.value    || '12';
  const ampm = document.getElementById('v_hora_ampm')?.value || 'PM';
  return { display: `${h}:00 ${ampm}`, valor24: a24h(h, ampm) };
}

function getFechaVacante() {
  return document.getElementById('v_fecha')?.value || '';
}

function updatePreview() {
  const select = document.getElementById('v_institucion');
  const idx    = select.value;
  const tipo   = document.querySelector('input[name="cuando_tipo"]:checked')?.value || 'ahora';
  let lugar = '[Lugar]', direccion = '[Direccion]';
  if (idx !== '' && todasInstituciones[parseInt(idx)]) {
    const inst = todasInstituciones[parseInt(idx)];
    lugar = inst.nombre; direccion = inst.direccion;
  }

  let cuando;
  if (tipo === 'ahora') {
    cuando = '<strong>AHORA MISMO</strong>';
  } else {
    const fecha = getFechaVacante();
    const fechaTexto = fecha ? formatearFecha(fecha) : '[fecha]';
    cuando = `el <strong>${fechaTexto}</strong> a las <strong>${getHoraVacante().display}</strong>`;
  }

  const habilidad = document.getElementById('v_habilidad')?.value.trim() || '';
  const habilidadTexto = habilidad
    ? ` Habilidad requerida: <strong>${esc(habilidad)}</strong>.`
    : ' Sin habilidad especifica (solo voluntarios generales).';

  document.getElementById('notifyText').innerHTML =
    `Se necesitan voluntarios en <strong>${esc(lugar)}</strong> ubicado en ${esc(direccion)}, ${cuando}.${habilidadTexto}`;
}

document.getElementById('v_institucion').addEventListener('change', updatePreview);

document.getElementById('vacanteForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const form = e.target;
  if (!validateForm(form)) return;

  const select = document.getElementById('v_institucion');
  const idx    = select.value;
  if (idx === '') {
    markError(select, document.getElementById('err_v_institucion'), 'Selecciona un lugar.');
    return;
  }

  const inst   = todasInstituciones[parseInt(idx)];
  const tipo   = document.querySelector('input[name="cuando_tipo"]:checked').value;
  document.getElementById('err_cuando').textContent = '';

  let cuando, fecha;
  if (tipo === 'ahora') {
    cuando = 'AHORA MISMO';
    fecha  = ''; // el backend usa la fecha de hoy automaticamente
  } else {
    fecha = getFechaVacante();
    if (!fecha) {
      document.getElementById('err_cuando').textContent = 'Selecciona el dia en que se necesitan.';
      return;
    }
    cuando = getHoraVacante().valor24;
  }

  const habilidadRaw = form.habilidad.value.trim();
  if (!esUnaSolaHabilidad(habilidadRaw)) {
    markError(form.habilidad, document.getElementById('err_v_habilidad'), 'Solo puedes escribir una habilidad.');
    return;
  }
  document.getElementById('err_v_habilidad').textContent = '';

  const data = {
    lugar:       inst.nombre,
    direccion:   inst.direccion,
    cuando:      cuando,
    fecha:       fecha,
    habilidad:   limpiarUnaHabilidad(habilidadRaw),
    descripcion: form.descripcion.value.trim(),
    contacto:    CORREO_ADMIN,
  };

  setLoading('btnVacante', true);
  try {
    await submitData('registrarVacante', data);
    document.getElementById('vacanteSuccessMsg').innerHTML =
      `Los voluntarios disponibles para <strong>${esc(inst.nombre)}</strong> han sido notificados por correo.`;
    showSuccess('vacanteForm', 'vacanteSuccess');
    showToast('Voluntarios avisados correctamente.');
  } catch {
    showToast('Error al enviar. Intenta de nuevo.', 'error');
  } finally {
    setLoading('btnVacante', false);
  }
});

function resetVacante() {
  document.getElementById('vacanteForm').reset();
  document.getElementById('vacanteForm').classList.remove('hidden');
  document.getElementById('vacanteSuccess').classList.add('hidden');
  document.getElementById('lugarInfo').classList.add('hidden');
  document.getElementById('horaInput').classList.add('hidden');
  document.querySelectorAll('.field-error').forEach(el => el.textContent = '');
  updatePreview();
}

// ══════════════════════════════════════════════
//  HELPERS
// ══════════════════════════════════════════════

async function submitData(action, data) {
  if (CONFIG.APPS_SCRIPT_URL) {
    const formData = new FormData();
    formData.append('action', action);
    Object.entries(data).forEach(([k, v]) => formData.append(k, v));
    await fetch(CONFIG.APPS_SCRIPT_URL, {
      method: 'POST',
      mode:   'no-cors',
      body:   formData,
    });
    return { success: true };
  }
  await delay(900);
  console.log(`[Demo] ${action}:`, data);
  return { success: true };
}

function validateForm(form) {
  let ok = true;
  form.querySelectorAll('.field-error').forEach(el => el.textContent = '');
  form.querySelectorAll('input,select,textarea').forEach(el => el.classList.remove('error'));
  form.querySelectorAll('[required]').forEach(field => {
    const val   = field.value.trim();
    const errEl = document.getElementById('err_' + field.id);
    if (!val) { markError(field, errEl, 'Este campo es obligatorio.'); ok = false; }
    else if (field.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) {
      markError(field, errEl, 'Ingresa un correo valido.'); ok = false;
    }
  });
  return ok;
}

function markError(field, errEl, msg) {
  field.classList.add('error');
  if (errEl) errEl.textContent = msg;
  field.addEventListener('input', () => {
    field.classList.remove('error');
    const e = document.getElementById('err_' + field.id);
    if (e) e.textContent = '';
  }, { once: true });
}

function showSuccess(formId, successId) {
  document.getElementById(formId).classList.add('hidden');
  document.getElementById(successId).classList.remove('hidden');
}

function setLoading(id, loading) {
  const btn = document.getElementById(id);
  btn.disabled = loading;
  btn.querySelector('.btn-text').classList.toggle('hidden', loading);
  btn.querySelector('.btn-spinner').classList.toggle('hidden', !loading);
}

let toastTimer;
function showToast(msg, type = 'success') {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.style.background = type === 'error' ? '#b91c1c' : '#1A1A1A';
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 3500);
}

function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

function esUnaSolaHabilidad(val) {
  const v = val.trim();
  if (!v) return true;
  return !/[,;|/]/.test(v);
}

function limpiarUnaHabilidad(val) {
  return val.trim().split(/[,;|/]+/)[0].trim();
}
function esc(str) {
  const d = document.createElement('div');
  d.appendChild(document.createTextNode(str));
  return d.innerHTML;
}

// INIT
document.addEventListener('DOMContentLoaded', () => {
  agregarRango();
  loadRefugios();
  cargarContadores();
  updatePreview();
});
