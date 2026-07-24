// Controllo nuove versioni: confronta la versione installata con l'ultima
// release pubblicata su GitHub. Nessuna libreria nuova (solo fetch), nessun
// download automatico — solo un avviso con link alla pagina della release,
// l'installazione resta manuale (come già fai oggi).

const REPO = 'Lukentony/broom';
const CHECK_KEY = 'broom_last_update_check';
const CHECK_INTERVAL_MS = 24 * 60 * 60 * 1000; // una volta al giorno, non ad ogni apertura

function parseVersion(v) {
  return (v || '').replace(/^v/, '').split('.').map(n => parseInt(n, 10) || 0);
}

function isNewer(remote, local) {
  const r = parseVersion(remote);
  const l = parseVersion(local);
  const len = Math.max(r.length, l.length);
  for (let i = 0; i < len; i++) {
    const rn = r[i] || 0;
    const ln = l[i] || 0;
    if (rn > ln) return true;
    if (rn < ln) return false;
  }
  return false;
}

/**
 * Controlla se c'è una release più recente su GitHub (al massimo una volta
 * al giorno, per non consumare la quota di richieste dell'API pubblica).
 * @param {string} currentVersion - Versione installata (es. da package.json)
 * @returns {Promise<{version: string, url: string} | null>}
 */
export async function checkForUpdate(currentVersion) {
  try {
    const lastCheck = parseInt(localStorage.getItem(CHECK_KEY), 10) || 0;
    if (Date.now() - lastCheck < CHECK_INTERVAL_MS) return null;
    localStorage.setItem(CHECK_KEY, String(Date.now()));

    const res = await fetch(`https://api.github.com/repos/${REPO}/releases/latest`);
    if (!res.ok) return null;
    const data = await res.json();
    if (!data.tag_name) return null;

    if (isNewer(data.tag_name, currentVersion)) {
      return { version: data.tag_name, url: data.html_url };
    }
    return null;
  } catch {
    return null;
  }
}
