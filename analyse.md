# Audit Technique

Source principale du modèle de données: [prisma/schema.prisma](prisma/schema.prisma)

## 1. 📦 Tables de base de données

Légende:
- Actif = utilisé par le code actuel visible
- Obsolète probable = non trouvé dans le code parcouru, ou seulement présent au niveau du schéma

### Auth / identité

| Table | Colonnes clés | Clés étrangères | Relations principales | État |
|---|---|---|---|---|
| User | id, firstName, lastName, email, password, userRole, companyName, adresse, departement, phone, photo, isVerified, isActive, createdAt, updatedAt, lastLogin | aucune | carts, loginLogs, notificationPreferences, notifications, orders, payments, quotes, recommendationFeedbacks, refreshTokens, simulations, tickets, assignedTickets, ticketComments, contracts | Actif |
| RefreshToken | id, token, userId, expiresAt, createdAt, isRevoked | userId → User.id | user | Actif |
| GuestSession | id, token, expiresAt, createdAt, updatedAt | aucune | carts, recommendationFeedbacks, simulations | Obsolète probable |
| LoginLog | id, userId, ipAddress, deviceInfo, loginDate, statusLog | userId → User.id | user | Actif |

### Catalogue / configuration

| Table | Colonnes clés | Clés étrangères | Relations principales | État |
|---|---|---|---|---|
| Brand | id, name | aucune | products | Actif |
| Category | id, name | aucune | families, products | Actif |
| Family | id, name, category_id | category_id → Category.id | category, products, family_filters | Actif |
| Product | id, name, base_price, type, image_url, stock_qty, in_stock, poe, brand_id, family_id, category_id, description | brand_id → Brand.id, family_id → Family.id, category_id → Category.id | brand, family, category, cartItems, specs, configuration_options, configuration_values_as_standard, orderItems, product_filter_values, compatibilities_as_part, compatibilities_as_target, sparepart_filters_as_part, sparepart_filters_as_target, recommendationItems, selected_configurations, contractItems | Actif |
| ProductCompatibility | part_product_id, target_product_id | part_product_id → Product.id, target_product_id → Product.id | part_product, target_product | Actif |
| ConfigurationOption | id, name, product_id, allow_none, use_groups | product_id → Product.id | product, values | Actif |
| ConfigurationValue | id, group_name, price, quantity, configuration_option_id, standard_product_id | configuration_option_id → ConfigurationOption.id, standard_product_id → Product.id | configuration_option, standard_product, selected_options | Actif |
| ProductSpec | id, product_id, spec_key, spec_value | product_id → Product.id | product | Actif |
| SelectedConfiguration | id, product_id, total_price | product_id → Product.id | product, selected_options | Obsolète probable |
| SelectedOption | id, selected_configuration_id, value_id | selected_configuration_id → SelectedConfiguration.id, value_id → ConfigurationValue.id | selected_configuration, value | Obsolète probable |
| Filter | id, name | aucune | filter_values, family_filters, sparepart_filters, sparepart_domain_filters | Actif |
| FamilyFilter | family_id, filter_id, sort_order | family_id → Family.id, filter_id → Filter.id | family, filter | Actif |
| SparepartFilter | part_product_id, target_product_id, filter_id, sort_order | part_product_id → Product.id, target_product_id → Product.id, filter_id → Filter.id | part_product, target_product, filter | Actif |
| SparepartDomainFilter | domain_code, filter_id, sort_order | filter_id → Filter.id | filter | Actif |
| FilterValue | id, value, filter_id | filter_id → Filter.id | filter, product_filter_values | Actif |
| ProductFilterValue | product_id, filter_value_id | product_id → Product.id, filter_value_id → FilterValue.id | product, filter_value | Actif |

### Commerce / support

| Table | Colonnes clés | Clés étrangères | Relations principales | État |
|---|---|---|---|---|
| Cart | id, guestSessionId, userId, status, createdAt, updatedAt | guestSessionId → GuestSession.id, userId → User.id | guestSession, user, items | Actif |
| CartItem | id, cartId, quantity, unitPrice, lineTotal, createdAt, updatedAt, productId | cartId → Cart.id, productId → Product.id | cart, product | Actif |
| Order | id, userId, status, subtotal, tax, shipping, total, shippingMethod, paymentMethod, note, createdAt, updatedAt | userId → User.id | user, items, payments, shippingAddress, contracts | Actif |
| ShippingAddress | id, orderId, email, company, firstName, lastName, address, postalCode, city, country, phone, invoiceEmail, vatNumber, orderNumber, neutralDelivery | orderId → Order.id | order | Actif |
| OrderItem | id, orderId, description, quantity, unitPrice, lineTotal, createdAt, productId | orderId → Order.id, productId → Product.id | order, product | Actif |
| Payment | id, userId, orderId, amount, method, status, transactionRef, createdAt, updatedAt | userId → User.id, orderId → Order.id | user, order | Obsolète probable |
| Quote | id, userId, amount, status, createdAt, updatedAt | userId → User.id | user | Obsolète probable |
| Ticket | id, userId, assignedToId, contractId, title, description, status, priority, createdAt, updatedAt | userId → User.id, assignedToId → User.id, contractId → Contract.id | user, assignedTo, contract, comments | Actif |
| TicketComment | id, ticketId, authorId, content, createdAt | ticketId → Ticket.id, authorId → User.id | ticket, author | Actif |
| Contract | id, userId, orderId, companyName, clientFirstName, clientLastName, clientEmail, clientPhone, description, fileUrl, warrantyMonths, warrantyStart, warrantyEnd, createdAt, updatedAt | userId → User.id, orderId → Order.id | user, order, tickets, contractItems | Actif |
| ContractItem | id, contractId, productId, name, description, quantity | contractId → Contract.id, productId → Product.id | contract, product | Actif |
| Notification | id, userId, title, message, type, isRead, readAt, referenceType, referenceId, priority, createdAt | userId → User.id | user, deliveries | Actif |
| NotificationPreference | id, userId, channel, type, isEnabled, createdAt, updatedAt | userId → User.id | user | Obsolète probable |
| NotificationDelivery | id, notificationId, channel, status, providerMessageId, errorMessage, sentAt, createdAt, updatedAt | notificationId → Notification.id | notification | Obsolète probable |

### Simulation / recommandations / analytics / legacy

| Table | Colonnes clés | Clés étrangères | Relations principales | État |
|---|---|---|---|---|
| Simulation | id, guestSessionId, userId, name, applicationType, riskLevel, numberOfUsers, cpuUsagePct, ramUsagePct, storageUsagePct, networkUsagePct, budgetMin, budgetMax, targetCo2ReductionKg, availabilityTargetPct, growthRatePct, horizonMonths, createdAt, updatedAt | guestSessionId → GuestSession.id, userId → User.id | guestSession, user, recommendations | Obsolète probable |
| RecommendationRun | id, simulationId, status, source, modelVersion, globalScore, reasoningSummary, startedAt, finishedAt, createdAt, updatedAt | simulationId → Simulation.id | simulation, items | Obsolète probable |
| RecommendationItem | id, runId, rank, fitScore, performanceScore, costScore, reliabilityScore, sustainabilityScore, estimatedPrice, estimatedCo2SavedKg, explanation, isAccepted, createdAt, productId | runId → RecommendationRun.id, productId → Product.id | run, product, feedback | Obsolète probable |
| RecommendationFeedback | id, recommendationItemId, guestSessionId, userId, feedbackType, rating, comment, createdAt | recommendationItemId → RecommendationItem.id, guestSessionId → GuestSession.id, userId → User.id | guestSession, item, user | Obsolète probable |
| AutonomousAgentJob | id, jobType, triggeredBy, payloadJson, status, retryCount, nextRunAt, lastError, createdAt, updatedAt | aucune | aucune visible | Obsolète probable |
| DashboardMetric | id, metricType, scope, scopeId, periodStart, periodEnd, value, unit, aggregation, metadataJson, computedAt, createdAt | aucune | history | Obsolète probable |
| DashboardMetricHistory | id, dashboardMetricId, value, capturedAt | dashboardMetricId → DashboardMetric.id | metric | Obsolète probable |
| DashboardMetricLegacy | id, metricType, value, date | aucune | aucune visible | Obsolète probable |

## 2. 🐛 Problèmes détectés

| Sévérité | Localisation | Problème |
|---|---|---|
| 🔴 Urgent | [app/api/auth/login/route.ts](app/api/auth/login/route.ts#L51), [app/api/auth/login/route.ts](app/api/auth/login/route.ts#L56), [app/api/auth/login/route.ts](app/api/auth/login/route.ts#L69) | La route de login logue le body complet, l’utilisateur trouvé et l’état du mot de passe. Le body contient le mot de passe en clair, donc il part dans les logs serveur. |
| 🔴 Urgent | [app/api/orders/route.ts](app/api/orders/route.ts#L35), [app/api/orders/route.ts](app/api/orders/route.ts#L39), [app/api/orders/route.ts](app/api/orders/route.ts#L55), [app/api/orders/route.ts](app/api/orders/route.ts#L72) | La création de commande accepte les prix, sous-totaux, taxes, frais de livraison et total fournis par le client. Un utilisateur peut forger une commande avec des montants arbitraires. |
| 🟠 Important | [app/api/auth/login/route.ts](app/api/auth/login/route.ts#L10), [app/api/auth/login/route.ts](app/api/auth/login/route.ts#L41), [app/api/auth/login/route.ts](app/api/auth/login/route.ts#L11), [app/api/auth/login/route.ts](app/api/auth/login/route.ts#L12) | Le rate limiting est en mémoire et basé sur `x-forwarded-for`. Il est donc contournable derrière plusieurs instances et spoofable si l’en-tête n’est pas normalisé par l’infra. |
| 🟠 Important | [app/simulation/page.tsx](app/simulation/page.tsx#L715), [app/simulation/page.tsx](app/simulation/page.tsx#L716) | Après sélection du produit, le domaine est ré-inféré avec `brandName` au lieu de `familyName`. Cela peut classer le produit dans le mauvais domaine et fausser tout le calcul. |
| 🟠 Important | [app/api/auth/refresh/route.ts](app/api/auth/refresh/route.ts#L10), [app/api/auth/me/route.ts](app/api/auth/me/route.ts#L12) | Les routes refresh et me ne vérifient pas `isActive`. Un compte désactivé peut encore renouveler ou réafficher une session valide jusqu’à expiration du token. |
| 🟠 Important | [app/simulation/page.tsx](app/simulation/page.tsx#L940), [app/simulation/page.tsx](app/simulation/page.tsx#L982), [app/simulation/page.tsx](app/simulation/page.tsx#L1078), [app/simulation/page.tsx](app/simulation/page.tsx#L1079) | Le layout de simulation reste en 3 colonnes fixes avec une media query morte sur `.sim-grid`. Sur mobile, la page est incomplètement responsive. |
| 🟡 Mineur | [app/api/admin/users/[id]/route.ts](app/api/admin/users/[id]/route.ts) | La mise à jour d’un employé ne vérifie pas l’unicité de l’email avant `update`. Un doublon déclenchera une erreur Prisma 500 au lieu d’un 409 propre. |
| 🟡 Mineur | [app/api/auth/login/route.ts](app/api/auth/login/route.ts#L51), [app/api/auth/login/route.ts](app/api/auth/login/route.ts#L56), [app/api/auth/login/route.ts](app/api/auth/login/route.ts#L69) | Les logs de debug en production exposent aussi des métadonnées de compte qui n’ont pas vocation à sortir du backend. |

## 3. 📱 Responsivité

Le projet est globalement correct sur plusieurs vues, mais il y a un vrai point faible: la simulation.

| Localisation | État | Observation |
|---|---|---|
| [app/simulation/page.tsx](app/simulation/page.tsx#L940), [app/simulation/page.tsx](app/simulation/page.tsx#L982), [app/simulation/page.tsx](app/simulation/page.tsx#L1078), [app/simulation/page.tsx](app/simulation/page.tsx#L1079) | Non responsive / partiellement responsive | Grille centrale en 3 colonnes fixes, cartes métriques en 3 colonnes fixes, media query non branchée. |
| [app/(dashboard)/admin/logs/page.tsx](app/(dashboard)/admin/logs/page.tsx) | Partiellement responsive | Tableau dense, sans wrapper de scroll horizontal explicite. Sur petit écran, la lisibilité baisse. |
| [app/(dashboard)/admin/users/page.tsx](app/(dashboard)/admin/users/page.tsx) | Partiellement responsive | Même problème que logs: table large, beaucoup de colonnes, peu de garde-fous mobile. |
| [app/page.tsx](app/page.tsx) | Plutôt responsive | Les grilles utilisent auto-fit / auto-fill et le contenu se replie correctement. |
| [app/cart/page.tsx](app/cart/page.tsx) | Plutôt responsive | Structure en grille adaptative, avec colonnes qui se replient en dessous de lg. |

## 4. 🔧 Hardcodes vs Dynamique

Liste des hardcodes les plus impactants.

| Localisation | Valeur hardcodée | Problème |
|---|---|---|
| [app/api/auth/login/route.ts](app/api/auth/login/route.ts#L11), [app/api/auth/login/route.ts](app/api/auth/login/route.ts#L12) | 5 tentatives, 15 minutes | Politique de sécurité figée dans le code et stockée uniquement en mémoire. |
| [app/api/auth/login/route.ts](app/api/auth/login/route.ts#L41) | `x-forwarded-for` | Dépend d’un en-tête de proxy potentiellement falsifiable si l’infra n’est pas verrouillée. |
| [app/simulation/page.tsx](app/simulation/page.tsx#L307) | facteur 80 | Poids de contribution des besoins entièrement arbitraire. |
| [app/simulation/page.tsx](app/simulation/page.tsx#L322) | facteur 45 | Poids des options entièrement arbitraire. |
| [app/simulation/page.tsx](app/simulation/page.tsx#L337), [app/simulation/page.tsx](app/simulation/page.tsx#L338) | seuils 78 et 55 | Les statuts healthy / warning / critical sont fixés en dur. |
| [app/simulation/page.tsx](app/simulation/page.tsx#L940) | `270px 1fr 270px` | Layout desktop rigide, peu adaptable. |
| [app/simulation/page.tsx](app/simulation/page.tsx#L982) | `repeat(3,1fr)` | Cartes métriques fixées à 3 colonnes. |
| [app/simulation/page.tsx](app/simulation/page.tsx#L456) | `28 + metrics.temp * 0.45` | Conversion température purement heuristique. |
| [app/api/orders/route.ts](app/api/orders/route.ts#L55) | valeurs par défaut `standard`, `bank`, `France` | Valeurs métier codées en dur dans la création de commande. |
| [proxy.ts](proxy.ts#L4) | `['/', '/login', '/register']` | Routes publiques figées dans le proxy. |

## 5. 👤 Actions par type d'utilisateur

| Rôle | Actions observées | Surfaces concernées |
|---|---|---|
| Public / invité | Consulter la page d’accueil catalogue, lancer la simulation, ouvrir le configurateur produit, créer un compte, se connecter. | [app/page.tsx](app/page.tsx), [app/simulation/page.tsx](app/simulation/page.tsx), [app/configurator/[productId]/page.tsx](app/configurator/[productId]/page.tsx), [app/(auth)/login/page.tsx](app/(auth)/login/page.tsx), [app/(auth)/register/page.tsx](app/(auth)/register/page.tsx) |
| Client | Voir / modifier son profil, changer son mot de passe, téléverser une photo, consulter ses commandes, tickets, contrats et notifications. | [app/(dashboard)/client/layout.tsx](app/(dashboard)/client/layout.tsx), [app/api/auth/profile/route.ts](app/api/auth/profile/route.ts), [app/api/auth/profile/password/route.ts](app/api/auth/profile/password/route.ts), [app/api/auth/profile/photo/route.ts](app/api/auth/profile/photo/route.ts), [app/api/orders/route.ts](app/api/orders/route.ts), [app/api/tickets/route.ts](app/api/tickets/route.ts), [app/api/client/contracts/route.ts](app/api/client/contracts/route.ts), [app/api/notifications/route.ts](app/api/notifications/route.ts) |
| Employé | Consulter son profil et les tickets qui lui sont assignés, commenter et faire passer un ticket à IN_PROGRESS ou RESOLVED. | [app/(dashboard)/employee/layout.tsx](app/(dashboard)/employee/layout.tsx), [app/api/employee/tickets/route.ts](app/api/employee/tickets/route.ts), [app/api/employee/tickets/[id]/route.ts](app/api/employee/tickets/[id]/route.ts) |
| Admin | Gérer le catalogue, les produits, les familles, les catégories, les filtres, les compatibilités, les commandes, les tickets, les contrats, les logs, et les comptes employés. | [app/(dashboard)/admin/layout.tsx](app/(dashboard)/admin/layout.tsx), [app/api/admin/products/route.ts](app/api/admin/products/route.ts), [app/api/admin/families/route.ts](app/api/admin/families/route.ts), [app/api/admin/filters/route.ts](app/api/admin/filters/route.ts), [app/api/admin/orders/[id]/route.ts](app/api/admin/orders/[id]/route.ts), [app/api/admin/tickets/[id]/route.ts](app/api/admin/tickets/[id]/route.ts), [app/api/admin/contracts/route.ts](app/api/admin/contracts/route.ts), [app/api/admin/logs/route.ts](app/api/admin/logs/route.ts), [app/api/admin/users/route.ts](app/api/admin/users/route.ts) |

Remarque importante: dans l’état actuel, l’interface admin ne gère que les comptes EMPLOYEE via [app/api/admin/users/route.ts](app/api/admin/users/route.ts) et [app/api/admin/users/[id]/route.ts](app/api/admin/users/[id]/route.ts). Les comptes ADMIN ne sont pas gérés par ce panneau.

## 6. 🔐 Sécurité

| Sévérité | Localisation | Risque |
|---|---|---|
| 🔴 Urgent | [app/api/auth/login/route.ts](app/api/auth/login/route.ts#L51), [app/api/auth/login/route.ts](app/api/auth/login/route.ts#L56), [app/api/auth/login/route.ts](app/api/auth/login/route.ts#L69) | Exposition de données sensibles dans les logs serveur, y compris le mot de passe brut envoyé par le client. |
| 🔴 Urgent | [app/api/orders/route.ts](app/api/orders/route.ts#L35), [app/api/orders/route.ts](app/api/orders/route.ts#L55), [app/api/orders/route.ts](app/api/orders/route.ts#L72) | Intégrité de commande compromise: l’API ne recalcule pas les montants côté serveur et accepte les lignes de commande telles quelles. |
| 🟠 Important | [app/api/auth/login/route.ts](app/api/auth/login/route.ts#L10), [app/api/auth/login/route.ts](app/api/auth/login/route.ts#L41) | Rate limiting contournable, non persistant et dépendant d’un en-tête réseau. |
| 🟠 Important | [app/api/auth/refresh/route.ts](app/api/auth/refresh/route.ts#L10), [app/api/auth/me/route.ts](app/api/auth/me/route.ts#L12) | Les comptes désactivés peuvent encore rafraîchir ou revalider une session tant qu’ils possèdent un token valide. |
| 🟠 Important | [app/api/admin/users/route.ts](app/api/admin/users/route.ts#L13) | Les routes admin qui vérifient seulement le rôle dans le JWT ne recontrôlent pas l’état actif du compte. Un token admin encore valide reste utilisable même après désactivation du compte. |
| 🟡 Mineur | [app/api/auth/profile/photo/route.ts](app/api/auth/profile/photo/route.ts) | Upload dans le dossier public avec extension dérivée du nom du fichier. Le type MIME est contrôlé, mais le traitement reste fragile et peu durci. |
| 🟡 Mineur | [app/api/admin/users/[id]/route.ts](app/api/admin/users/[id]/route.ts) | Pas de pré-validation d’unicité sur l’email lors d’un update employé. Le backend peut tomber en 500 au lieu de retourner une erreur métier propre. |

## 7. 🚨 Ce qui manque en urgent

| Priorité | Élément manquant | Pourquoi c’est critique |
|---|---|---|
| 1 | Recalcul serveur des montants de commande | Sans recalcul côté backend, le checkout peut être falsifié et la facturation cassée. |
| 2 | Moteur de simulation partagé et basé sur les données réelles | Le calcul actuel est heuristique, dépend du texte des options et peut retourner des résultats faux de manière systémique. |
| 3 | Durcissement de l’authentification | Il faut supprimer les logs sensibles, rendre le rate limit persistant, et vérifier l’état actif du compte lors du refresh et du bootstrap session. |
| 4 | Alignement mobile de la simulation | La page simulation reste la zone UX la plus fragile et peut devenir inexploitable sur téléphone. |
| 5 | Validation métier sur l’admin user update | Un doublon d’email ou un payload partiellement invalide produit des erreurs 500 évitables. |

## 8. 🚨 La formule utilisé dans la simulation

La formule se trouve dans [app/simulation/page.tsx](app/simulation/page.tsx#L268) à [app/simulation/page.tsx](app/simulation/page.tsx#L337). Elle fonctionne en trois étapes:

1. Les besoins sont normalisés puis ajoutés aux métriques avec la forme $metric[k] += normalizedNeed \times weight \times 80$.
2. Les options sélectionnées sont converties en score normalisé puis ajoutées avec $metric[k] += optNorm \times weight \times 45$.
3. Chaque métrique est ensuite bornée entre 5 et 100.

Le statut final dépend seulement de la moyenne CPU / température / RAM:
$$\bar{m} = (cpu + temp + ram) / 3$$
Si $\bar{m} > 78$, le statut devient critical.
Si $\bar{m} > 55$, le statut devient warning.
Sinon, il reste healthy.

Le vrai problème est la qualité de l’entrée, pas seulement les constantes:
- Le domaine est ré-inféré avec `brandName` après sélection du produit à [app/simulation/page.tsx](app/simulation/page.tsx#L715) et [app/simulation/page.tsx](app/simulation/page.tsx#L716), alors qu’au chargement initial il utilise bien `familyName`.
- Les poids sont basés sur le nom textuel de l’option dans [app/simulation/page.tsx](app/simulation/page.tsx#L268) à [app/simulation/page.tsx](app/simulation/page.tsx#L322), pas sur des données métier stables.
- La page ne persiste rien en base, donc la simulation n’est jamais réconciliée avec le vrai produit, les vraies specs ou l’historique utilisateur.

La meilleure intégration pour un utilisateur client est de brancher cette logique dans le flux configurateur, pas seulement dans la page simulation. Le point d’entrée naturel est [app/configurator/[productId]/page.tsx](app/configurator/[productId]/page.tsx), car cette page charge déjà le produit, ses options et ses valeurs depuis Prisma. La bonne architecture serait:
- extraire la formule dans un module partagé ou une route API dédiée,
- alimenter ce calcul avec les vraies données produit / option / spec,
- appeler la même source depuis la simulation et depuis le configurateur pour éviter les divergences.

En l’état, la simulation est surtout un moteur visuel heuristique. Elle peut servir de prévisualisation, mais pas de calcul métier de référence.