# Femmes et Guerrières

Site web pour Femmes et Guerrières - Auto-défense et empowerment féminin en Belgique.

## Tech Stack

- [Astro](https://astro.build) - Générateur de site statique moderne et rapide
- Markdown pour le contenu (articles et événements)
- CSS pur pour le style

## Démarrage

```bash
# Installer les dépendances
npm install

# Lancer en développement
npm run dev

# Construire pour la production
npm run build

# Prévisualiser la version de production
npm run preview
```

## Ajouter du contenu

### Ajouter un article

Créez un fichier `.md` dans `src/content/articles/` :

```markdown
---
title: "Titre de l'article"
description: "Description courte"
date: 2024-01-15
author: "Nom de l'auteur"
image: "/images/articles/mon-image.jpg"
tags: ["tag1", "tag2"]
---

Contenu de l'article en Markdown...
```

### Ajouter un événement

Créez un fichier `.md` dans `src/content/events/` :

```markdown
---
title: "Nom de l'événement"
description: "Description courte"
date: 2024-04-20
endDate: 2024-04-21
location: "Bruxelles, Belgique"
image: "/images/events/image-principale.jpg"
photos:
  - "/images/events/mon-event/photo1.jpg"
  - "/images/events/mon-event/photo2.jpg"
---

Détails de l'événement en Markdown...
```

### Ajouter des images

Placez vos images dans le dossier `public/images/` :
- `public/images/articles/` pour les images d'articles
- `public/images/events/` pour les images d'événements

## Structure du projet

```
├── public/
│   ├── favicon.svg
│   └── images/          # Vos images ici
├── src/
│   ├── content/
│   │   ├── articles/    # Vos articles (fichiers .md)
│   │   └── events/      # Vos événements (fichiers .md)
│   ├── layouts/
│   │   └── BaseLayout.astro
│   └── pages/
│       ├── index.astro
│       ├── contact.astro
│       ├── articles/
│       └── evenements/
├── astro.config.mjs
└── package.json
```

## Personnalisation

### Couleurs

Modifiez les variables CSS dans `src/layouts/BaseLayout.astro` :

```css
:root {
  --color-primary: #8B4513;
  --color-secondary: #D2691E;
  --color-accent: #CD853F;
  --color-text: #333;
  --color-background: #FFF8F0;
}
```

### Contact

Modifiez les informations de contact dans `src/pages/contact.astro`.

## Déploiement

Le site peut être déployé sur :
- [Netlify](https://netlify.com) - Gratuit, connectez simplement votre repo GitHub
- [Vercel](https://vercel.com) - Gratuit, détecte automatiquement Astro
- [GitHub Pages](https://pages.github.com) - Gratuit avec GitHub Actions

### Déploiement Netlify (recommandé)

1. Connectez votre repo GitHub à Netlify
2. Build command: `npm run build`
3. Publish directory: `dist`
4. C'est tout !
