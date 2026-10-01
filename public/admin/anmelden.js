// Anmeldeseite: Benutzername + Passwort an /api/anmelden schicken, bei Erfolg ins Dashboard.
const form = document.getElementById('anmelden');
const fehler = document.getElementById('fehler');
const absenden = document.getElementById('absenden');
const passwort = document.getElementById('passwort');
const zeigen = document.getElementById('zeigen');

function melde(text) {
  fehler.textContent = text;
  fehler.hidden = !text;
}

// Passwort sichtbar machen – hilft beim Eintippen auf dem Handy
zeigen.addEventListener('click', () => {
  const sichtbar = passwort.type === 'password';
  passwort.type = sichtbar ? 'text' : 'password';
  zeigen.textContent = sichtbar ? 'Verbergen' : 'Zeigen';
  zeigen.setAttribute('aria-pressed', String(sichtbar));
});

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const benutzer = form.benutzer.value.trim();
  if (!benutzer || !passwort.value) { melde('Bitte Benutzername und Passwort eingeben.'); return; }
  melde('');
  absenden.disabled = true;
  absenden.textContent = 'Wird geprüft …';
  try {
    const antwort = await fetch('/api/anmelden', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-CMS': '1' },
      body: JSON.stringify({ benutzer, passwort: passwort.value }),
      credentials: 'same-origin',
    });
    const daten = await antwort.json().catch(() => ({}));
    if (!antwort.ok) throw new Error(daten.fehler || 'Anmelden hat nicht geklappt. Bitte noch einmal versuchen.');
    location.replace('/admin/');
  } catch (err) {
    melde(err.message === 'Failed to fetch' ? 'Keine Verbindung. Bitte Internet prüfen und noch einmal versuchen.' : err.message);
    passwort.select();
  } finally {
    absenden.disabled = false;
    absenden.textContent = 'Anmelden';
  }
});

form.benutzer.focus();
