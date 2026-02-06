export type Lang = "en" | "de" | "fr" | "it" | "es";

export const STRINGS = {
  en: {
    // errors
    handle_in_use: "Handle already in use",
    handle_required: "Please enter a handle",
    profile_update_failed: "Failed to update profile",

    // common menu
    edit_profile: "Edit profile",
    theme: "Theme",
    language: "Language",
    logoff: "Log off",

    // profile setup
    profile_complete_title: "Complete your profile",
    profile_complete_subtitle: "We need at least a handle and an avatar image.",
    profile_language_help: "Choose your language",
    profile_handle_label: "Handle",
    profile_handle_placeholder: "e.g. beda",
    profile_handle_hint_required: "Handle is required (e.g. beda)",
    profile_handle_hint_charset: "Only a-z, 0-9 and _",
    profile_handle_hint_len: "Max 20 characters",
    profile_name_label: "Name (optional)",
    profile_name_placeholder: "e.g. Beda",
    profile_avatar_label: "Avatar (jpg/png/webp)",
    profile_save: "Save & Continue",
    profile_saving: "Saving...",
    // course picker
    course_choose: "Choose course",
    course_search_placeholder: "Search…",
    course_clear_selection: "Clear selection",
    course_min_chars: "Type at least 2 characters…",
    course_searching: "Searching…",
    course_no_results: "No results.",
  },

  de: {
    handle_in_use: "Handle bereits in Verwendung",
    handle_required: "Bitte einen Handle eingeben",
    profile_update_failed: "Profil konnte nicht aktualisiert werden",

    edit_profile: "Profil bearbeiten",
    theme: "Anzeige",
    language: "Sprache",
    logoff: "Abmelden",

    profile_complete_title: "Profil abschliessen",
    profile_complete_subtitle:
      "Wir brauchen mindestens einen Handle und ein Avatar-Bild.",
    profile_language_help: "Sprache auswählen",
    profile_handle_label: "Handle",
    profile_handle_placeholder: "z.B. beda",
    profile_handle_hint_required: "Handle ist erforderlich (z.B. beda)",
    profile_handle_hint_charset: "Nur a-z, 0-9 und _",
    profile_handle_hint_len: "Max 20 Zeichen",
    profile_name_label: "Name (optional)",
    profile_name_placeholder: "z.B. Beda",
    profile_avatar_label: "Avatar (jpg/png/webp)",
    profile_save: "Speichern & weiter",
    profile_saving: "Speichern...",
    course_choose: "Platz auswählen",
    course_search_placeholder: "Suchen…",
    course_clear_selection: "Auswahl löschen",
    course_min_chars: "Mindestens 2 Buchstaben eingeben…",
    course_searching: "Suche…",
    course_no_results: "Kein Treffer.",
  },

  fr: {
    handle_in_use: "Nom d’utilisateur déjà utilisé",
    handle_required: "Veuillez entrer un nom d’utilisateur",
    profile_update_failed: "Échec de la mise à jour du profil",

    edit_profile: "Modifier le profil",
    theme: "Affichage",
    language: "Langue",
    logoff: "Se déconnecter",

    profile_complete_title: "Compléter votre profil",
    profile_complete_subtitle:
      "Nous avons besoin au minimum d’un nom d’utilisateur et d’un avatar.",
    profile_language_help: "Choisir la langue",
    profile_handle_label: "Nom d’utilisateur",
    profile_handle_placeholder: "ex. beda",
    profile_handle_hint_required: "Nom d’utilisateur requis (ex. beda)",
    profile_handle_hint_charset: "Uniquement a-z, 0-9 et _",
    profile_handle_hint_len: "Max 20 caractères",
    profile_name_label: "Nom (optionnel)",
    profile_name_placeholder: "ex. Beda",
    profile_avatar_label: "Avatar (jpg/png/webp)",
    profile_save: "Enregistrer & continuer",
    profile_saving: "Enregistrement...",
    course_choose: "Choisir un parcours",
    course_search_placeholder: "Rechercher…",
    course_clear_selection: "Effacer la sélection",
    course_min_chars: "Saisissez au moins 2 caractères…",
    course_searching: "Recherche…",
    course_no_results: "Aucun résultat.",
  },

  it: {
    handle_in_use: "Nome utente già in uso",
    handle_required: "Inserisci un nome utente",
    profile_update_failed: "Aggiornamento del profilo non riuscito",

    edit_profile: "Modifica profilo",
    theme: "Tema",
    language: "Lingua",
    logoff: "Disconnettersi",

    profile_complete_title: "Completa il tuo profilo",
    profile_complete_subtitle: "Serve almeno un nome utente e un avatar.",
    profile_language_help: "Scegli la lingua",
    profile_handle_label: "Nome utente",
    profile_handle_placeholder: "es. beda",
    profile_handle_hint_required: "Nome utente richiesto (es. beda)",
    profile_handle_hint_charset: "Solo a-z, 0-9 e _",
    profile_handle_hint_len: "Max 20 caratteri",
    profile_name_label: "Nome (opzionale)",
    profile_name_placeholder: "es. Beda",
    profile_avatar_label: "Avatar (jpg/png/webp)",
    profile_save: "Salva & continua",
    profile_saving: "Salvataggio...",
    course_choose: "Scegli un campo",
    course_search_placeholder: "Cerca…",
    course_clear_selection: "Cancella selezione",
    course_min_chars: "Inserisci almeno 2 caratteri…",
    course_searching: "Ricerca…",
    course_no_results: "Nessun risultato.",
  },

  es: {
    handle_in_use: "Nombre de usuario ya en uso",
    handle_required: "Introduce un nombre de usuario",
    profile_update_failed: "Error al actualizar el perfil",

    edit_profile: "Editar perfil",
    theme: "Tema",
    language: "Idioma",
    logoff: "Cerrar sesión",

    profile_complete_title: "Completa tu perfil",
    profile_complete_subtitle:
      "Necesitamos al menos un nombre de usuario y un avatar.",
    profile_language_help: "Elige el idioma",
    profile_handle_label: "Nombre de usuario",
    profile_handle_placeholder: "p.ej. beda",
    profile_handle_hint_required: "Nombre de usuario requerido (p.ej. beda)",
    profile_handle_hint_charset: "Solo a-z, 0-9 y _",
    profile_handle_hint_len: "Máx. 20 caracteres",
    profile_name_label: "Nombre (opcional)",
    profile_name_placeholder: "p.ej. Beda",
    profile_avatar_label: "Avatar (jpg/png/webp)",
    profile_save: "Guardar y continuar",
    profile_saving: "Guardando...",
    course_choose: "Elegir campo",
    course_search_placeholder: "Buscar…",
    course_clear_selection: "Borrar selección",
    course_min_chars: "Introduce al menos 2 caracteres…",
    course_searching: "Buscando…",
    course_no_results: "Sin resultados.",
  },
} as const;

export type StringKey = keyof typeof STRINGS.en;

const LANG_KEY = "fairwayd_lang";

export function getLang(): Lang {
  const saved = localStorage.getItem(LANG_KEY) as Lang | null;
  if (
    saved === "en" ||
    saved === "de" ||
    saved === "fr" ||
    saved === "it" ||
    saved === "es"
  ) {
    return saved;
  }

  const nav = (navigator.language || "en").toLowerCase();
  if (nav.startsWith("de")) return "de";
  if (nav.startsWith("fr")) return "fr";
  if (nav.startsWith("it")) return "it";
  if (nav.startsWith("es")) return "es";
  return "en";
}

export function setLang(l: Lang) {
  localStorage.setItem(LANG_KEY, l);
  window.location.reload(); // MVP-simple
}

export function t(key: StringKey): string {
  const lang = getLang();
  return (STRINGS[lang] as any)[key] ?? STRINGS.en[key] ?? key;
}
