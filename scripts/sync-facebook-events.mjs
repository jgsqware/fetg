/**
 * Synchronise les événements depuis l'API Facebook Graph vers src/content/events/.
 *
 * Lancé automatiquement avant chaque build (script "prebuild" du package.json).
 * S'il n'y a pas de token configuré, le script ne fait RIEN et n'échoue jamais :
 * les événements déjà présents dans le repo sont conservés.
 *
 * Pour activer la synchro automatique, définir deux variables d'environnement
 * (ex. dans les "Environment Variables" du projet Vercel) :
 *   FB_PAGE_ID        = identifiant numérique de la *Page* Facebook
 *   FB_ACCESS_TOKEN   = token d'accès Page (avec pages_read_engagement)
 *
 * ⚠️ L'API Événements nécessite une *Page* Facebook (pas un profil) et un token
 *    valide. Voir les notes dans le README.
 */
import { writeFileSync, mkdirSync, readdirSync, unlinkSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const EVENTS_DIR = join(__dirname, '..', 'src', 'content', 'events');
const GRAPH = 'https://graph.facebook.com/v19.0';

const PAGE_ID = process.env.FB_PAGE_ID;
const TOKEN = process.env.FB_ACCESS_TOKEN;
// Marqueur en tête de fichier pour ne supprimer/régénérer QUE les events FB,
// sans toucher aux événements saisis à la main.
const FB_MARKER = '# source: facebook';

function slugify(str) {
  return (str || 'evenement')
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 60) || 'evenement';
}

function yamlString(str) {
  return '"' + String(str || '').replace(/"/g, "'").replace(/\s+/g, ' ').trim() + '"';
}

async function main() {
  if (!PAGE_ID || !TOKEN) {
    console.log('[fb-sync] FB_PAGE_ID / FB_ACCESS_TOKEN non définis — synchro ignorée, événements existants conservés.');
    return;
  }

  const url = `${GRAPH}/${PAGE_ID}/events?fields=name,description,start_time,end_time,place&time_filter=upcoming&access_token=${TOKEN}`;
  let data;
  try {
    const res = await fetch(url);
    data = await res.json();
    if (data.error) throw new Error(data.error.message);
  } catch (err) {
    console.warn(`[fb-sync] Échec de récupération Facebook (${err.message}) — événements existants conservés.`);
    return;
  }

  const events = Array.isArray(data.data) ? data.data : [];
  if (events.length === 0) {
    console.log('[fb-sync] Aucun événement renvoyé par Facebook — rien à mettre à jour.');
    return;
  }

  mkdirSync(EVENTS_DIR, { recursive: true });

  // Supprime les anciens fichiers issus de Facebook (repérés par le marqueur)
  for (const file of readdirSync(EVENTS_DIR)) {
    if (!file.endsWith('.md')) continue;
    const path = join(EVENTS_DIR, file);
    try {
      const { readFileSync } = await import('fs');
      if (readFileSync(path, 'utf8').includes(FB_MARKER)) unlinkSync(path);
    } catch {}
  }

  let count = 0;
  for (const ev of events) {
    const place = ev.place ? [ev.place.name, ev.place?.location?.city].filter(Boolean).join(', ') : 'Belgique';
    const slug = slugify(ev.name);
    const front = [
      '---',
      FB_MARKER,
      `title: ${yamlString(ev.name)}`,
      `description: ${yamlString((ev.description || ev.name).slice(0, 180))}`,
      `date: ${ev.start_time}`,
      ev.end_time ? `endDate: ${ev.end_time}` : null,
      `location: ${yamlString(place)}`,
      '---',
      '',
      (ev.description || '').trim() || ev.name,
      '',
    ].filter(Boolean).join('\n');

    writeFileSync(join(EVENTS_DIR, `fb-${slug}.md`), front);
    count++;
  }

  console.log(`[fb-sync] ${count} événement(s) synchronisé(s) depuis Facebook.`);
}

main().catch((err) => {
  console.warn(`[fb-sync] Erreur inattendue (${err.message}) — build poursuivi.`);
});
