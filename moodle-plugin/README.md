# Plugin Moodle : Question Importer

Plugin Moodle pour importer des questions via Web Service depuis l'application outils.cam137.org.

## Installation

### 1. Installer le plugin

1. Telecharger `questionimporter.zip`
2. Extraire le contenu
3. Copier le dossier `questionimporter` dans `/local/` de votre Moodle
   - Chemin final : `/path/to/moodle/local/questionimporter/`
4. Aller dans Administration > Notifications
5. Suivre les instructions pour installer le plugin

### 2. Activer les Web Services

1. Aller dans **Administration > Plugins > Services web > Vue d'ensemble**
2. Activer les services web : **Oui**
3. Activer le protocole REST : **Oui**

### 3. Configurer le service externe

1. Aller dans **Administration > Plugins > Services web > Services externes**
2. Le service "Question Importer Service" devrait etre visible
3. Verifier que les 3 fonctions sont bien listees :
   - `local_questionimporter_get_courses`
   - `local_questionimporter_get_question_categories`
   - `local_questionimporter_import_questions`

### 4. Generer un token

1. Aller dans **Administration > Plugins > Services web > Gerer les tokens**
2. Cliquer sur "Ajouter"
3. Selectionner :
   - **Utilisateur** : votre compte enseignant/admin
   - **Service** : Question Importer Service
4. Sauvegarder et copier le token genere

## Utilisation

1. Ouvrir https://outils.cam137.org/pages/excel-to-xml-moodle.html
2. Entrer l'URL de votre Moodle : https://tutorat.crem.fr
3. Entrer le token genere
4. Cliquer sur "Tester la connexion"
5. Selectionner un cours et une banque de questions
6. Charger votre fichier Excel
7. Cliquer sur "Importer dans Moodle"

## Permissions requises

Le plugin utilise les capabilities suivantes :
- `local/questionimporter:use` - Utiliser les web services
- `local/questionimporter:importquestions` - Importer des questions
- `moodle/question:add` - Ajouter des questions (capability standard Moodle)

Ces permissions sont accordees par defaut aux roles :
- Enseignant avec droits d'edition
- Manager

## Support

Pour toute question ou probleme, contactez l'administrateur de votre Moodle.
