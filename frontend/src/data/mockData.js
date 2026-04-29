export const categories = [
  { id: 1, nom: 'Entrées' },
  { id: 2, nom: 'Plats principaux' },
  { id: 3, nom: 'Desserts' },
  { id: 4, nom: 'Boissons' },
]

export const plats = [
  {
    id: 1, nom: 'Briouates au fromage et miel', categorie_id: 1, prix: 75, disponible: true,
    description: 'Feuilles de pastilla croustillantes, fromage de chèvre fondant, miel de thym et graines de sésame dorées',
    image: 'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=600&q=80',
  },
  {
    id: 2, nom: 'Carpaccio de thon rouge', categorie_id: 1, prix: 95, disponible: true,
    description: "Fines tranches de thon rouge, huile d'argan, câpres, citron confit et coriandre fraîche",
    image: 'https://images.unsplash.com/photo-1546549032-9571cd6b27df?w=600&q=80',
  },
  {
    id: 3, nom: 'Velouté de potiron au ras el hanout', categorie_id: 1, prix: 65, disponible: true,
    description: 'Crème onctueuse de potiron marocain, épices ras el hanout, crème fraîche et amandes effilées grillées',
    image: 'https://images.unsplash.com/photo-1476718406336-bb5a9690ee2a?w=600&q=80',
  },
  {
    id: 4, nom: 'Tartare de saumon atlantique', categorie_id: 1, prix: 88, disponible: true,
    description: "Saumon frais haché, avocat, citrons de Meknès, aneth et sauce au yaourt au concombre",
    image: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=600&q=80',
  },
  {
    id: 5, nom: "Tajine d'agneau aux pruneaux", categorie_id: 2, prix: 185, disponible: true,
    description: "Épaule d'agneau confite 7 heures, pruneaux fondants, amandes effilées, miel de fleurs et safran du Tiliouine",
    image: 'https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=600&q=80',
  },
  {
    id: 6, nom: 'Filet de bar grillé, chermoula', categorie_id: 2, prix: 195, disponible: true,
    description: "Bar de l'Atlantique en filet, chermoula citronnée maison, légumes grillés et couscous au beurre",
    image: 'https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=600&q=80',
  },
  {
    id: 7, nom: "Magret de canard, orange sanguine", categorie_id: 2, prix: 210, disponible: true,
    description: "Magret rosé, sauce bigarade à l'orange sanguine de Berkane, gratin de pommes fondantes et jus corsé",
    image: 'https://images.unsplash.com/photo-1544025162-d76538813cd9?w=600&q=80',
  },
  {
    id: 8, nom: 'Couscous royal au safran', categorie_id: 2, prix: 175, disponible: true,
    description: "Couscous roulé à la main, merguez et brochette d'agneau, légumes du potager, bouillon infusé au safran pur",
    image: 'https://images.unsplash.com/photo-1574484284002-952d92a03a52?w=600&q=80',
  },
  {
    id: 9, nom: "Pastilla au lait, fleur d'oranger", categorie_id: 3, prix: 75, disponible: true,
    description: "Fine pastilla dorée, crème au lait de brebis, fleur d'oranger et zeste de citron, amandes concassées",
    image: 'https://images.unsplash.com/photo-1488477181946-6428a0291777?w=600&q=80',
  },
  {
    id: 10, nom: 'Fondant au chocolat 70%', categorie_id: 3, prix: 85, disponible: true,
    description: 'Cœur coulant grand cru, glace vanille bourbon artisanale, tuile caramel au beurre salé',
    image: 'https://images.unsplash.com/photo-1551024601-bec78aea704b?w=600&q=80',
  },
  {
    id: 11, nom: 'Cornes de gazelle maison', categorie_id: 3, prix: 55, disponible: true,
    description: "Pâte croustillante, farce à la pâte d'amandes et fleur d'oranger, enrobées de sucre glace",
    image: 'https://images.unsplash.com/photo-1565958011703-44f9829ba187?w=600&q=80',
  },
  {
    id: 12, nom: 'Jus de grenade pressé', categorie_id: 4, prix: 45, disponible: true,
    description: 'Grenades Sefrou pressées à la commande, pure fraîcheur sans ajout',
    image: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=600&q=80',
  },
  {
    id: 13, nom: 'Thé à la menthe Touareg', categorie_id: 4, prix: 35, disponible: true,
    description: 'Thé vert Gunpowder, menthe fraîche de Meknès, servi à la façon traditionnelle en trois verres',
    image: 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=600&q=80',
  },
  {
    id: 14, nom: 'Limonade marocaine maison', categorie_id: 4, prix: 50, disponible: true,
    description: "Citrons de Meknès, eau pétillante, sucre de canne, feuilles de menthe et zeste d'orange",
    image: 'https://images.unsplash.com/photo-1544145945-f90425340c7e?w=600&q=80',
  },
  {
    id: 15, nom: 'Eau minérale Sidi Ali', categorie_id: 4, prix: 25, disponible: true,
    description: 'Eau minérale naturelle du Moyen Atlas, 75cl',
    image: 'https://images.unsplash.com/photo-1543253687-c931c8e01820?w=600&q=80',
  },
]

export const tables = [
  // Intérieur — T1 à T7
  { id: 1,  numero: 1,  capacite: 2, emplacement: 'interieur', statut: 'libre',    x: 82,  y: 82  },
  { id: 2,  numero: 2,  capacite: 2, emplacement: 'interieur', statut: 'occupee',  x: 185, y: 82  },
  { id: 3,  numero: 3,  capacite: 4, emplacement: 'interieur', statut: 'libre',    x: 82,  y: 178 },
  { id: 4,  numero: 4,  capacite: 4, emplacement: 'interieur', statut: 'reservee', x: 188, y: 178 },
  { id: 5,  numero: 5,  capacite: 6, emplacement: 'interieur', statut: 'libre',    x: 265, y: 92  },
  { id: 6,  numero: 6,  capacite: 4, emplacement: 'interieur', statut: 'occupee',  x: 82,  y: 268 },
  { id: 7,  numero: 7,  capacite: 2, emplacement: 'interieur', statut: 'libre',    x: 195, y: 268 },
  // Terrasse — T8 à T13
  { id: 8,  numero: 8,  capacite: 2, emplacement: 'terrasse',  statut: 'libre',    x: 388, y: 78  },
  { id: 9,  numero: 9,  capacite: 4, emplacement: 'terrasse',  statut: 'reservee', x: 476, y: 78  },
  { id: 10, numero: 10, capacite: 4, emplacement: 'terrasse',  statut: 'libre',    x: 562, y: 78  },
  { id: 11, numero: 11, capacite: 6, emplacement: 'terrasse',  statut: 'occupee',  x: 388, y: 195 },
  { id: 12, numero: 12, capacite: 2, emplacement: 'terrasse',  statut: 'libre',    x: 490, y: 195 },
  { id: 13, numero: 13, capacite: 4, emplacement: 'terrasse',  statut: 'libre',    x: 580, y: 195 },
  // Mezzanine — T14 à T18
  { id: 14, numero: 14, capacite: 8, emplacement: 'mezzanine', statut: 'libre',    x: 105, y: 390 },
  { id: 15, numero: 15, capacite: 6, emplacement: 'mezzanine', statut: 'reservee', x: 225, y: 390 },
  { id: 16, numero: 16, capacite: 4, emplacement: 'mezzanine', statut: 'libre',    x: 338, y: 390 },
  { id: 17, numero: 17, capacite: 4, emplacement: 'mezzanine', statut: 'occupee',  x: 450, y: 390 },
  { id: 18, numero: 18, capacite: 2, emplacement: 'mezzanine', statut: 'libre',    x: 558, y: 390 },
]

export const avisClients = [
  { id: 1, nom: 'Yasmine B.', note: 5, commentaire: "Une expérience absolument extraordinaire. Le service est irréprochable et les plats sont d'une finesse rare. SKY07 est sans conteste ma table préférée en ville !", date: '15 Mars 2026', initiales: 'YB', couleur: '#7c5c9e' },
  { id: 2, nom: 'Karim M.', note: 5, commentaire: "Ambiance feutrée, cuisine raffinée et accueil chaleureux. Le tajine d'agneau aux pruneaux est un chef-d'œuvre. Je reviendrai sans hésitation.", date: '22 Mars 2026', initiales: 'KM', couleur: '#2d6a6a' },
  { id: 3, nom: 'Leila H.', note: 4, commentaire: "Très belle soirée en famille. Le cadre est élégant et les plats délicieux. Le couscous royal est généreux et savoureux. Fortement recommandé.", date: '1 Avril 2026', initiales: 'LH', couleur: '#7a4040' },
  { id: 4, nom: 'Omar T.', note: 5, commentaire: "J'ai célébré mon anniversaire ici et ce fut magique. L'équipe est aux petits soins, la carte des desserts est une merveille. Bravo à toute l'équipe !", date: '8 Avril 2026', initiales: 'OT', couleur: '#4a6a4a' },
  { id: 5, nom: 'Nadia S.', note: 4, commentaire: "Cuisine créative avec de vraies saveurs méditerranéennes. Le carpaccio de thon rouge est exceptionnel. La terrasse au coucher du soleil est splendide.", date: '14 Avril 2026', initiales: 'NS', couleur: '#8a6a2a' },
]

export const offresEmploi = [
  {
    id: 1,
    titre: 'Chef de Partie — Chaud',
    type: 'CDI · Temps plein',
    description: "Nous recherchons un chef de partie expérimenté pour notre brigade chaud. Maîtrise des cuissons viandes et poissons exigée. Minimum 3 ans d'expérience en restauration gastronomique.",
    icon: 'chef',
  },
  {
    id: 2,
    titre: 'Serveur(se) en salle',
    type: 'CDI · Temps plein',
    description: "Rejoignez notre équipe de salle dynamique. Accueil, conseil, service en assiette. Présentation soignée, aisance relationnelle et sens du détail requis. Bilingue français/arabe apprécié.",
    icon: 'server',
  },
  {
    id: 3,
    titre: 'Commis de cuisine',
    type: 'CDD 6 mois · Évolutif',
    description: "Poste ouvert aux jeunes talents sortant d'école hôtelière. Formation assurée par notre chef. Aide à la mise en place, préparations froides et chaudes, entretien des postes.",
    icon: 'commis',
  },
]
