// ══════════════════════════════════════════════════════════
//  Red Voluntarios Venezuela — Google Apps Script
//  Cuenta: techsolutionsalthea@gmail.com
//  Sheet ID: 1JYpDv8yhWKAquVZrWDKAR8XfshvvwS2ygKvGl9L65Ko
//  Correo: Brevo (API transaccional)
// ══════════════════════════════════════════════════════════
//
//  CONFIGURACION:
//  1. Brevo → verifica remitente techsolutionsalthea@gmail.com
//  2. Brevo → crea API key
//  3. Apps Script → Project Settings → Script Properties:
//     BREVO_API_KEY = tu API key
//  4. Ejecuta testEmail() para probar
//  5. Implementar → Nueva implementacion (Web App)
//

const SHEET_ID     = '1JYpDv8yhWKAquVZrWDKAR8XfshvvwS2ygKvGl9L65Ko';
const CORREO_ADMIN = 'techsolutionsalthea@gmail.com';
const REMITENTE    = { name: 'Red Voluntarios VE', email: CORREO_ADMIN };

// ══════════════════════════════════════════════
//  BREVO
// ══════════════════════════════════════════════

function getBrevoApiKey() {
  const key = PropertiesService.getScriptProperties().getProperty('BREVO_API_KEY');
  if (!key) {
    throw new Error('Falta BREVO_API_KEY en Script Properties. Ve a Project Settings → Script Properties.');
  }
  return key;
}

function enviarCorreoBrevo(toEmail, toName, subject, htmlBody, textBody) {
  const response = UrlFetchApp.fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'post',
    headers: {
      'api-key': getBrevoApiKey(),
      'Content-Type': 'application/json',
    },
    payload: JSON.stringify({
      sender: REMITENTE,
      to: [{ email: toEmail, name: toName || toEmail }],
      subject: subject,
      htmlContent: htmlBody,
      textContent: textBody || '',
    }),
    muteHttpExceptions: true,
  });

  const code = response.getResponseCode();
  if (code >= 400) {
    throw new Error('Brevo error ' + code + ': ' + response.getContentText());
  }
}

function testEmail() {
  enviarCorreoBrevo(
    CORREO_ADMIN,
    'Prueba',
    'Prueba Brevo — Red Voluntarios VE',
    emailBienvenida('Prueba', JSON.stringify([{ texto: '30/06/2026: 2:00 PM - 6:00 PM' }])),
    'Correo de prueba. Si lo recibes, Brevo funciona.'
  );
  Logger.log('Correo de prueba enviado a ' + CORREO_ADMIN);
}

// ══════════════════════════════════════════════
//  SETUP — ejecutar UNA sola vez
// ══════════════════════════════════════════════

function setup() {
  const ss = SpreadsheetApp.openById(SHEET_ID);

  let hInst = ss.getSheetByName('Instituciones');
  if (!hInst) {
    hInst = ss.insertSheet('Instituciones');
    hInst.getRange(1,1,1,5)
      .setValues([['nombre','direccion','contacto','estado','fecha']])
      .setFontWeight('bold');
    hInst.setFrozenRows(1);
    hInst.appendRow([
      'Parque del Este (Parque Generalisimo Francisco de Miranda)',
      'Av. Francisco de Miranda, Los Palos Grandes, Caracas, Venezuela',
      CORREO_ADMIN,
      'Aprobada',
      new Date().toISOString(),
    ]);
  }

  let hVol = ss.getSheetByName('Voluntarios');
  if (!hVol) {
    hVol = ss.insertSheet('Voluntarios');
    hVol.getRange(1,1,1,4)
      .setValues([['Nombre','Correo','Rangos_Horario','Habilidades']])
      .setFontWeight('bold');
    hVol.setFrozenRows(1);
  }

  let hVac = ss.getSheetByName('Vacantes');
  if (!hVac) {
    hVac = ss.insertSheet('Vacantes');
    hVac.getRange(1,1,1,7)
      .setValues([['Lugar','Direccion','Cuando','Descripcion','Contacto','Fecha_Necesidad','Fecha_Publicacion']])
      .setFontWeight('bold');
    hVac.setFrozenRows(1);
  }

  Logger.log('Setup completado correctamente.');
}

// ══════════════════════════════════════════════
//  LOGICA DE HORARIOS
// ══════════════════════════════════════════════

function horaAMinutos(hora) {
  const partes = hora.split(':');
  return parseInt(partes[0]) * 60 + parseInt(partes[1]);
}

function horaActualEnMinutos() {
  const now = new Date();
  return now.getHours() * 60 + now.getMinutes();
}

function fechaHoyVenezuela() {
  const now = new Date();
  const offsetVenezuela = -4 * 60;
  const utcMinutes = now.getUTCHours() * 60 + now.getUTCMinutes();
  let localMinutes = utcMinutes + offsetVenezuela;
  let diaUTC = now.getUTCDate();
  let mesUTC = now.getUTCMonth();
  let anioUTC = now.getUTCFullYear();

  if (localMinutes < 0) {
    const fechaAjustada = new Date(Date.UTC(anioUTC, mesUTC, diaUTC - 1));
    diaUTC  = fechaAjustada.getUTCDate();
    mesUTC  = fechaAjustada.getUTCMonth();
    anioUTC = fechaAjustada.getUTCFullYear();
  }

  const mm = String(mesUTC + 1).padStart(2, '0');
  const dd = String(diaUTC).padStart(2, '0');
  return `${anioUTC}-${mm}-${dd}`;
}

function horaActualVenezuelaEnMinutos() {
  const now = new Date();
  const offsetVenezuela = -4 * 60;
  const utcMinutes = now.getUTCHours() * 60 + now.getUTCMinutes();
  let localMinutes = utcMinutes + offsetVenezuela;
  if (localMinutes < 0) localMinutes += 24*60;
  if (localMinutes >= 24*60) localMinutes -= 24*60;
  return localMinutes;
}

function estaEnRango(minutos, desdeStr, hastaStr) {
  const desde = horaAMinutos(desdeStr);
  const hasta = horaAMinutos(hastaStr);
  if (desde <= hasta) {
    return minutos >= desde && minutos <= hasta;
  } else {
    return minutos >= desde || minutos <= hasta;
  }
}

function convertir24aAmPm(hora24) {
  if (!hora24 || hora24 === 'AHORA MISMO') return hora24 || '';
  const partes = hora24.split(':');
  let h = parseInt(partes[0]);
  const ampm = h >= 12 ? 'PM' : 'AM';
  if (h > 12) h -= 12;
  if (h === 0) h = 12;
  return h + ':00 ' + ampm;
}

// ══════════════════════════════════════════════
//  ROUTER
// ══════════════════════════════════════════════

function doGet(e) {
  switch(e.parameter.action) {
    case 'getInstituciones': return resp(getInstituciones());
    case 'getContadores':    return resp(getContadores());
    default: return resp({ error: 'Accion no reconocida' });
  }
}

function doPost(e) {
  const action = e.parameter.action;
  switch(action) {
    case 'registrarVoluntario': return resp(registrarVoluntario(e.parameter));
    case 'registrarVacante':    return resp(registrarVacante(e.parameter));
    default: return resp({ error: 'Accion no reconocida' });
  }
}

function resp(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

// ══════════════════════════════════════════════
//  FUNCION 1 — Instituciones aprobadas
// ══════════════════════════════════════════════

function getInstituciones() {
  try {
    const hoja    = SpreadsheetApp.openById(SHEET_ID).getSheetByName('Instituciones');
    const datos   = hoja.getDataRange().getValues();
    const headers = datos[0];
    const instituciones = datos.slice(1)
      .filter(f => f[0] && f[3] === 'Aprobada')
      .map(f => {
        const obj = {};
        headers.forEach((h,i) => { obj[h] = f[i] || ''; });
        return obj;
      });
    return { instituciones };
  } catch(err) {
    return { error: err.message, instituciones: [] };
  }
}

// ══════════════════════════════════════════════
//  FUNCION 2 — Contadores
// ══════════════════════════════════════════════

function getContadores() {
  try {
    const ss   = SpreadsheetApp.openById(SHEET_ID);
    const hVol = ss.getSheetByName('Voluntarios');
    const hInst = ss.getSheetByName('Instituciones');

    const voluntarios = Math.max(0, hVol.getLastRow() - 1);

    const datosInst = hInst.getDataRange().getValues();
    const instituciones = datosInst.slice(1).filter(f => f[0] && f[3] === 'Aprobada').length;

    return { voluntarios, instituciones };
  } catch(err) {
    return { voluntarios: 0, instituciones: 0, error: err.message };
  }
}

// ══════════════════════════════════════════════
//  FUNCION 3 — Registrar voluntario
// ══════════════════════════════════════════════

function registrarVoluntario(data) {
  try {
    const hoja  = SpreadsheetApp.openById(SHEET_ID).getSheetByName('Voluntarios');
    const datos = hoja.getDataRange().getValues();
    const filaExistente = datos.findIndex((f, i) => i > 0 && f[1] === data.email);

    const nuevosRangos = JSON.parse(data.rangos || '[]');
    let rangosFinales = nuevosRangos;
    let esActualizacion = false;

    if (filaExistente > 0) {
      esActualizacion = true;
      let rangosPrevios = [];
      try { rangosPrevios = JSON.parse(datos[filaExistente][2] || '[]'); } catch {}
      rangosFinales = rangosPrevios.concat(nuevosRangos);

      const fila = filaExistente + 1;
      hoja.getRange(fila, 1, 1, 4).setValues([[
        data.nombre,
        data.email,
        JSON.stringify(rangosFinales),
        data.habilidades || datos[filaExistente][3] || '',
      ]]);
    } else {
      hoja.appendRow([
        data.nombre,
        data.email,
        data.rangos      || '[]',
        data.habilidades || '',
      ]);
    }

    const rangosTexto = rangosFinales
      .map(r => r.texto || (convertir24aAmPm(r.desde) + ' - ' + convertir24aAmPm(r.hasta)))
      .join(' | ');

    enviarCorreoBrevo(
      data.email,
      data.nombre,
      esActualizacion
        ? 'Tu horario fue actualizado — Red Voluntarios Venezuela'
        : 'Gracias por registrarte — Red Voluntarios Venezuela',
      emailBienvenida(data.nombre, JSON.stringify(rangosFinales)),
      'Hola ' + data.nombre + '. ' +
        (esActualizacion ? 'Agregamos tu nuevo horario.' : 'Gracias por registrarte.') +
        ' Tus horarios actuales: ' + rangosTexto +
        '. Te avisaremos cuando haya una necesidad en tu horario.'
    );

    return { success: true, actualizado: esActualizacion };
  } catch(err) {
    return { success: false, error: err.message };
  }
}

// ══════════════════════════════════════════════
//  FUNCION 4 — Registrar vacante y notificar
// ══════════════════════════════════════════════

function registrarVacante(data) {
  try {
    const ss   = SpreadsheetApp.openById(SHEET_ID);
    const hVac = ss.getSheetByName('Vacantes');

    const fechaVacante = data.fecha || fechaHoyVenezuela();

    hVac.appendRow([
      data.lugar,
      data.direccion,
      data.cuando,
      data.descripcion || '',
      data.contacto    || '',
      fechaVacante,
      new Date().toISOString(),
    ]);

    notificarVoluntarios(ss, data.lugar, data.direccion, data.cuando, fechaVacante, data.contacto);

    return { success: true };
  } catch(err) {
    return { success: false, error: err.message };
  }
}

function notificarVoluntarios(ss, lugar, direccion, cuando, fechaVacante, contacto) {
  const hVol    = ss.getSheetByName('Voluntarios');
  const datos   = hVol.getDataRange().getValues();
  const headers = datos[0];
  const iNombre  = headers.indexOf('Nombre');
  const iCorreo  = headers.indexOf('Correo');
  const iRangos  = headers.indexOf('Rangos_Horario');

  const esAhora = cuando === 'AHORA MISMO';
  const minutosSolicitados = esAhora ? horaActualVenezuelaEnMinutos() : horaAMinutos(cuando);
  const fechaSolicitada = fechaVacante || fechaHoyVenezuela();

  const compatibles = datos.slice(1).filter(fila => {
    if (!fila[iCorreo]) return false;
    try {
      const rangos = JSON.parse(fila[iRangos] || '[]');
      return rangos.some(r => {
        const fechaOk = r.fecha === fechaSolicitada;
        const horaOk  = estaEnRango(minutosSolicitados, r.desde, r.hasta);
        return fechaOk && horaOk;
      });
    } catch { return false; }
  });

  if (!compatibles.length) {
    enviarCorreoBrevo(
      CORREO_ADMIN,
      'Admin',
      'Sin voluntarios disponibles para: ' + lugar,
      '<p>Se publico una necesidad en <strong>' + e(lugar) + '</strong> para ' +
        (esAhora ? 'AHORA MISMO' : e(convertir24aAmPm(cuando))) +
        ' (' + e(fechaSolicitada) + '), pero ningun voluntario tiene esa fecha y horario disponible.</p>',
      'Se publico una necesidad en ' + lugar + ' para ' + (esAhora ? 'AHORA MISMO' : cuando) +
        ' (' + fechaSolicitada + '), pero ningun voluntario tiene esa fecha y horario disponible.'
    );
    Logger.log('Sin voluntarios para "' + cuando + '" (' + fechaSolicitada + ') en ' + lugar);
    return;
  }

  let enviados = 0;
  compatibles.forEach(vol => {
    const nombre = vol[iNombre];
    const correo = vol[iCorreo];
    try {
      enviarCorreoBrevo(
        correo,
        nombre,
        'Se necesitan voluntarios en ' + lugar + ' — ' + (esAhora ? 'AHORA MISMO' : convertir24aAmPm(cuando)),
        emailNotificacion(nombre, lugar, direccion, cuando, fechaSolicitada, contacto),
        'Hola ' + nombre + '. Se necesitan voluntarios en ' + lugar + ', ' + direccion +
          '. Hora: ' + (esAhora ? 'AHORA MISMO' : convertir24aAmPm(cuando)) +
          (contacto ? '. Contacto: ' + contacto : '')
      );
      enviados++;
    } catch(err) {
      Logger.log('Error enviando a ' + correo + ': ' + err.message);
    }
  });

  Logger.log(lugar + ' (' + cuando + ', ' + fechaSolicitada + ') — ' + enviados + ' voluntario(s) notificados.');
}

// ══════════════════════════════════════════════
//  PLANTILLAS DE CORREO
// ══════════════════════════════════════════════

function emailNotificacion(nombre, lugar, direccion, cuando, fechaISO, contacto) {
  const esAhora = cuando === 'AHORA MISMO';
  const horaDisplay = esAhora ? 'AHORA MISMO' : convertir24aAmPm(cuando);
  const fechaDisplay = fechaISO ? formatearFechaLegible(fechaISO) : '';
  return `
<div style="font-family:Arial,sans-serif;max-width:540px;margin:0 auto;">
  <div style="background:#1A3A6B;padding:24px;border-radius:12px 12px 0 0;text-align:center;">
    <h1 style="color:#ffffff;font-size:20px;margin:0;">Red Voluntarios Venezuela</h1>
    <p style="color:rgba(255,255,255,0.7);font-size:13px;margin:5px 0 0;">Emergencia - Terremoto</p>
  </div>
  <div style="background:#ffffff;padding:28px 24px;border:1px solid #C8D8EF;border-radius:0 0 12px 12px;">
    <h2 style="color:#1A3A6B;margin-top:0;">Hola, ${e(nombre)}</h2>
    <p style="color:#4A4A4A;line-height:1.6;">
      Se necesitan voluntarios y tu horario coincide con esta necesidad:
    </p>
    <div style="background:#FDF0E6;border-left:4px solid #E87A35;border-radius:4px;padding:18px;margin:16px 0;">
      <p style="color:#E87A35;font-weight:700;font-size:18px;margin:0 0 10px;">${e(lugar)}</p>
      <p style="color:#4A4A4A;margin:5px 0;">Direccion: ${e(direccion)}</p>
      ${fechaDisplay ? `<p style="color:#4A4A4A;margin:5px 0;">Dia: <strong>${e(fechaDisplay)}</strong></p>` : ''}
      <p style="color:#4A4A4A;margin:5px 0;">Hora: <strong>${e(horaDisplay)}</strong></p>
      ${contacto ? `<p style="color:#4A4A4A;margin:5px 0;">Contacto: ${e(contacto)}</p>` : ''}
    </div>
    <p style="color:#999999;font-size:12px;margin-top:20px;border-top:1px solid #eeeeee;padding-top:14px;">
      Red Voluntarios Venezuela - 2026
    </p>
  </div>
</div>`;
}

function formatearFechaLegible(fechaISO) {
  const dias  = ['domingo','lunes','martes','miercoles','jueves','viernes','sabado'];
  const meses = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
  const [y, m, d] = fechaISO.split('-').map(Number);
  const fecha = new Date(Date.UTC(y, m - 1, d));
  const diaSemana = dias[fecha.getUTCDay()];
  return `${diaSemana} ${d} de ${meses[m-1]} de ${y}`;
}

function emailBienvenida(nombre, rangosJson) {
  let listaRangos = '<li style="color:#767676;">Sin horarios registrados</li>';
  try {
    const rangos = JSON.parse(rangosJson || '[]');
    if (rangos.length) {
      listaRangos = rangos.map(r =>
        `<li style="color:#4A4A4A;margin-bottom:4px;">${r.texto || (convertir24aAmPm(r.desde) + ' - ' + convertir24aAmPm(r.hasta))}</li>`
      ).join('');
    }
  } catch {}

  return `
<div style="font-family:Arial,sans-serif;max-width:540px;margin:0 auto;">
  <div style="background:#1A3A6B;padding:24px;border-radius:12px 12px 0 0;text-align:center;">
    <h1 style="color:#ffffff;font-size:20px;margin:0;">Red Voluntarios Venezuela</h1>
  </div>
  <div style="background:#ffffff;padding:28px 24px;border:1px solid #C8D8EF;border-radius:0 0 12px 12px;">
    <h2 style="color:#1A3A6B;margin-top:0;">Hola, ${e(nombre)}</h2>
    <p style="color:#4A4A4A;line-height:1.6;">
      Gracias por registrarte. Tu disposicion a ayudar en esta emergencia es invaluable.
    </p>
    <div style="background:#E8F0FA;border-radius:8px;padding:14px 16px;margin:16px 0;">
      <p style="color:#1A3A6B;font-weight:600;margin:0 0 8px;">Tus horarios registrados:</p>
      <ul style="list-style:none;padding:0;margin:0;">${listaRangos}</ul>
    </div>
    <p style="color:#4A4A4A;line-height:1.6;">
      Cuando alguien publique una necesidad de voluntarios dentro de tu horario, recibiras un correo automatico al instante.
    </p>
    <p style="color:#999999;font-size:12px;margin-top:20px;border-top:1px solid #eeeeee;padding-top:14px;">
      Red Voluntarios Venezuela - 2026
    </p>
  </div>
</div>`;
}

function e(s) {
  return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
