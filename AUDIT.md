# AUDIT — Projet redsys-platform

## Contexte et portée
- Rôle : auditeur technique (lecture seule). Analyse focalisée sur : base de données, authentification/autorisation, sécurité, hardcodes, UI/responsiveness et éléments urgents à corriger.

## Résumé exécutif
- Implémentation d'auth basée JWT avec rotation de refresh tokens (persistés en DB) — bonne pratique présente.
- Risques critiques : secrets sensibles committés (.env), absence de protection contre bruteforce sur login, usages de HTML non-sanitized (dangerouslySetInnerHTML).
- Priorités : retirer secrets du dépôt, révoquer/rotater secrets, ajouter rate-limiting et sanitization avant déploiement.

## 1) Schéma de la base de données (principaux modèles)
- [prisma/schema.prisma](prisma/schema.prisma)
- Modèles notables : `User`, `RefreshToken`, `LoginLog`, `GuestSession`, `Brand`, `Category`, `Family`, `Product`, `ProductCompatibility`, `ConfigurationOption`/`ConfigurationValue`, `Cart`/`CartItem`, `Order`/`OrderItem`/`Payment`/`ShippingAddress`, `Ticket`/`TicketComment`, `Contract`/`ContractItem`, `Notification`/`NotificationDelivery`, `RecommendationRun`/`RecommendationItem`/`RecommendationFeedback`, `Simulation`, `DashboardMetric`, `AutonomousAgentJob`.
- Relations/contraintes : refresh tokens persistés (champ `isRevoked`, `expiresAt`) — permet rotation + révocation.

## 2) Bugs / problèmes fonctionnels observés (avec fichier d'exemple)
- Incohérence d'utilisation des helpers JWT : `lib/jwt.ts` existe mais `app/api/auth/login/route.ts` signe des JWT inline → duplication et risque de divergence. ([lib/jwt.ts](lib/jwt.ts), [app/api/auth/login/route.ts](app/api/auth/login/route.ts)) — Sévérité : Moyenne.
- `app/api/auth/logout/route.ts` : revocation basée uniquement sur le cookie présent, l'endpoint ne requiert pas d'auth explicite — possible mauvaise utilisation/abus si cookie manipulé. ([app/api/auth/logout/route.ts](app/api/auth/logout/route.ts)) — Sévérité : Moyenne.
- Pas de protection contre bruteforce/ratelimit sur `login` → risque d'énumération et attaques par force brute. ([app/api/auth/login/route.ts](app/api/auth/login/route.ts)) — Sévérité : Élevée.
- Présence de nombreux `console.log` en clair dans `login` et autres routes (informations sensibles possibles). ([app/api/auth/login/route.ts](app/api/auth/login/route.ts)) — Sévérité : Faible→Moyenne.

## 3) UI / Responsiveness / Hardcodes
- Usage massif de classes Tailwind responsives (md:, etc.) — déjà orienté responsive, mais pas de tests visuels automatisés.
- Nombre important de couleurs et chaînes hardcodées (hex) et URLs dans les composants — maintenance et theming difficiles. Rechercher et extraire variables CSS / tokens. (grep a retourné de nombreux hex dans `components/` et `app/`). — Sévérité : Faible.
- Usage de `dangerouslySetInnerHTML` dans plusieurs composants (ex. [components/configurator/product-configurator.tsx](components/configurator/product-configurator.tsx)) pour afficher `fullDescription` et autres textes — risque XSS si le HTML n'est pas correctement sanitizé côté serveur. — Sévérité : Élevée.

## 4) Hardcoded secrets & config
- Fichier `.env` présent dans le dépôt avec : `DATABASE_URL`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `NEXT_PUBLIC_APP_URL`. ([.env](.env)) — Sévérité : Critique.
- Recommandation immédiate : supprimer `.env` du dépôt, ajouter `.env` à `.gitignore`, rotater les secrets (DB et JWT), et revoir accès au serveur de CI/CD.

## 5) Rôles utilisateurs & actions observées
- Enum roles : `ADMIN`, `EMPLOYEE`, `CLIENT` (voir `prisma/schema.prisma`).
- Exemples d'actions par rôle :
  - ADMIN : endpoints sous [app/api/admin/*](app/api/admin) (gestion utilisateurs, catalogue, logs...). Exemple : [app/api/admin/users/route.ts](app/api/admin/users/route.ts) — création d'EMPLOYEE, listing.
  - EMPLOYEE : endpoints sous [app/api/employee/*](app/api/employee) (tickets, profile) — vérifiés via `requireAuth(..., ['EMPLOYEE'])` dans certains fichiers.
  - CLIENT : endpoints sous [app/api/client/*](app/api/client) (contrats, commandes) — usage de `requireAuth` basique.
- Observations : certains endpoints vérifient rôle via helpers (`lib/auth.ts`), d'autres font des vérifications inline → standardiser pour éviter erreurs d'autorisation manquantes.

## 6) Évaluation sécurité (auth & tokens)
- Points positifs :
  - Refresh-token rotation implémentée et persistée en DB (`refresh_tokens`), marque `isRevoked` utilisée dans `refresh` flow. ([app/api/auth/refresh/route.ts](app/api/auth/refresh/route.ts))
  - Accès token court (`1h`) et refresh (`7d`) configurés.
- Risques / améliorations :
  - Secrets exposés dans `.env` (critique) — compromet toute sécurité JWT/DB.
  - Pas de rate-limiting/IP throttling sur `login` (brute-force).
  - Incohérences d'usage de la couche JWT (centraliser) → éviter divergences alg/claims.
  - Cookies : `httpOnly` et `sameSite: 'lax'` utilisés ; s'assurer que `secure: true` en production. Considérer `SameSite=Strict` si possible pour réduire CSRF, ou mettre des protections CSRF additionnelles pour routes sensibles.
  - Vérifier que les refresh tokens sont liables à un utilisateur/agent et qu'une empreinte (device/ip/user-agent) est utilisée si besoin pour réduire vol d'RT.
  - Pas d'implémentation évidente d'alerting/lockout après tentatives répétées.

## 7) Éléments urgents à corriger (ordre recommandé)
1. SUPPRIMER `.env` du dépôt et ROTATER tous les secrets (DB, JWT). (Critique)
2. Ajouter rate-limiting + lockout pour `login` (ex : limiter tentatives, CAPTCHA, blocage temporaire). (Élevé)
3. Auditer et SANITIZER toute utilisation de `dangerouslySetInnerHTML` (ou éliminer si possible). (Élevé)
4. Centraliser la logique de JWT (utiliser `lib/jwt.ts` partout) et retirer duplications. (Moyen)
5. Revoir `logout` pour exiger une preuve d'auth (ex. access token) ou au moins journaliser tentatives anormales. (Moyen)
6. Supprimer `console.log` contenant des données sensibles en production et améliorer le logging structuré. (Moyen)

## 8) Autres recommandations / éléments manquants
- Ajouter rate-limiting global (NGINX/Cloudflare ou middleware) et protection contre CSRF sur routes mutatives.
- Mettre en place CSP, X-Frame-Options, HSTS et autres headers via middleware (helmet-like).
- Revoir politiques mot de passe (longueur, complexité) et envisager MFA pour rôles ADMIN/EMPLOYEE.
- Ajouter des tests de sécurité automatisés (SAST/DAST) et des scans sur PRs.
- Ajouter monitoring (erreurs / métriques auth) et alerting pour activités suspectes (taux d'échecs login, tokens révoqués massivement).

## Preuves & fichiers clés consultés
- Schema DB : [prisma/schema.prisma](prisma/schema.prisma)
- JWT helpers : [lib/jwt.ts](lib/jwt.ts)
- Auth helpers : [lib/auth.ts](lib/auth.ts)
- Auth endpoints : [app/api/auth/login/route.ts](app/api/auth/login/route.ts), [app/api/auth/refresh/route.ts](app/api/auth/refresh/route.ts), [app/api/auth/logout/route.ts](app/api/auth/logout/route.ts), [app/api/auth/me/route.ts](app/api/auth/me/route.ts)
- Admin sample : [app/api/admin/users/route.ts](app/api/admin/users/route.ts)
- Components with raw HTML injection: [components/configurator/product-configurator.tsx](components/configurator/product-configurator.tsx)
- Env: [.env](.env)

## Prochaine étape proposée
- Si vous voulez, j'applique une checklist corrective (documentation des commandes pour rotater secrets, suggestions de middlewares pour rate-limiting, ou PRs de correction non-invasives comme centraliser l'usage de `lib/jwt.ts`).

-- Fin de l'audit (lecture seule).
