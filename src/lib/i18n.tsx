// Lightweight i18n — no external library. A plain TS object + Context.
//
// Coverage scope:
//   PUBLIC SURFACES (full coverage):
//     - VolunteerSignup (the volunteer\'s entry point)
//     - MySignup (the magic-link self-edit)
//     - WelcomeTable kiosk (greeters speak both languages at the door)
//     - Done/success screens
//     - Lockout / error pages
//
//   ADMIN SURFACES (partial coverage — Phase 34d):
//     - Settings (Account & Preferences) — section headers + key labels
//     - Signups (admin roster) — section headers + action buttons
//
// Other admin pages (AuditLog, Outbox, Badges, Security Center) stay
// English-only — leadership interfaces with SP HQ in English. Extending
// to ES is straightforward: drop more keys into the dictionary below.
// The translate() helper falls back to the key name if a translation is
// missing, so partial coverage doesn\'t crash.
//
// Interpolation: use {{name}} placeholders, pass values via the second arg
// to t(). e.g. t(\'signup.greeting\', { name: \'Maria\' }) →
//   "Welcome back, Maria!" / "¡Bienvenida, Maria!"
//
// Locale storage: localStorage key \'occ:locale\'. Defaults to navigator.language
// if the user hasn\'t picked. Auto-saves on toggle.

import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';

export type Locale = 'en' | 'es';

export const LOCALE_KEY = 'occ:locale';

// ── Dictionary ────────────────────────────────────────────────────────────
// Keys are dot-namespaced by surface. Spanish translations done by a fluent
// speaker (NOT machine-translated) for production-quality output.
const DICT: Record<Locale, Record<string, string>> = {
  en: {
    // Brand / global
    'brand.tagline': 'In Jesus\' Name',
    'brand.trust': "Samaritan's Purse · Operation Christmas Child · Since 1993",
    'lang.english': 'English',
    'lang.spanish': 'Español',

    // Volunteer signup — Intro
    'signup.intro.kicker': 'Volunteer · Collection Week 2026',
    'signup.intro.heroH1': 'Yes, we\'d love your help.',
    'signup.intro.heroSub': 'Thank you for showing up.',
    'signup.intro.bodyP': '{{week}}. A few minutes here puts your name on the team — we\'ll follow up with details a week before.',
    'signup.intro.fact.shift': 'Avg shift',
    'signup.intro.fact.shiftValue': '~3 hrs',
    'signup.intro.fact.days': 'Days open',
    'signup.intro.fact.cost': 'Just your time',
    'signup.intro.fact.costValue': '0 cost',
    'signup.intro.cta': 'Sign me up',
    'signup.intro.alreadyVolunteer': 'Already signed up?',
    'signup.intro.signIn': 'Find my edit link',

    // Volunteer signup — Contact step
    'signup.contact.title': 'Let\'s start with you.',
    'signup.contact.italic': 'Three quick things.',
    'signup.contact.nameLabel': 'Your name',
    'signup.contact.namePlaceholder': 'First and last',
    'signup.contact.emailLabel': 'Email',
    'signup.contact.emailPlaceholder': 'you@email.com',
    'signup.contact.phoneLabel': 'Phone',
    'signup.contact.phonePlaceholder': '(404) 555-0101',
    'signup.contact.zipLabel': 'ZIP (optional)',
    'signup.contact.zipPlaceholder': '30301',
    'signup.contact.privacy': 'We only use this to coordinate the week. No marketing, no sharing — we promise.',
    'signup.contact.next': 'Continue',

    // Volunteer signup — Details step
    'signup.details.title': 'Almost done.',
    'signup.details.italic': 'A few quick details to plan the week.',
    'signup.details.firstTime': 'First time volunteering with OCC?',
    'signup.details.firstTime.yes': 'Yes, first time',
    'signup.details.firstTime.no': 'Done this before',
    'signup.details.shirt': 'T-shirt size',
    'signup.details.emergency.title': 'Emergency contact (optional)',
    'signup.details.emergency.name': 'Name',
    'signup.details.emergency.phone': 'Phone',
    'signup.details.notes.title': 'Anything we should know? (optional)',
    'signup.details.notes.placeholder': 'Bringing my kids · I have a van for transport · ...',
    'signup.details.agree': 'I agree to serve with the Samaritan\'s Purse Operation Christmas Child team.',
    'signup.details.submit': 'Sign me up',
    'signup.details.back': 'Back',
    'signup.details.botBlocked': 'Hmm, that didn\'t go through. Please refresh the page and try again.',
    'signup.details.throttled': 'Please wait {{seconds}}s before submitting again.',
    'signup.details.captchaRequired': 'Please complete the human verification first.',
    'signup.details.captchaPrompt': 'I\'m not a robot',
    'signup.details.captchaVerifying': 'Verifying…',
    'signup.details.captchaVerified': 'Verified.',
    'signup.details.dupeWarning': 'We already have a signup with this {{field}}.',
    'signup.details.dupeBody': 'If that\'s you, use your edit link instead of submitting again — search your inbox for "Operation Christmas Child." Multiple family members sharing one email? Just submit; we\'ll dedupe later.',
    'signup.details.shirtNone': 'No preference',
    'signup.details.notesPlaceholder': 'Anything we should know? (optional)',
    'signup.details.notesHelp': 'Bringing my kids · I have a van for transport · I\'m available the day before for setup · …',
    'signup.details.emergencyHelp': 'Someone we can reach in an emergency.',
    'signup.details.firstTimeYesShort': 'Yes',
    'signup.details.firstTimeNoShort': 'No',
    'signup.details.agreeShort': 'I agree.',

    // Volunteer signup — Done step
    'signup.done.kicker': 'You\'re on the team',
    'signup.done.title': 'See you Collection Week.',
    'signup.done.italic': 'Thank you for serving.',
    'signup.done.body': 'We\'ll send a reminder a week before with parking, what to wear, and a friendly face to look for at the welcome table.',
    'signup.done.summary': 'Quick summary',
    'signup.done.summary.servingAt': 'Serving at',
    'signup.done.summary.phone': 'Phone',
    'signup.done.summary.email': 'Email',
    'signup.done.summary.shirt': 'Shirt',
    'signup.done.magic.title': 'Your personal edit link',
    'signup.done.magic.intro': 'We also emailed this to {{email}} — check your inbox in a few minutes. Bookmark this link as a backup; update your phone, shirt size, or notes anytime. Don\'t share it — anyone with the link can edit your signup.',
    'signup.done.magic.copy': 'Copy',
    'signup.done.magic.copied': 'Copied',
    'signup.done.shareLine': 'Until then, share with a friend:',
    'signup.done.signAnother': 'Sign up another volunteer',
    'signup.done.magic.warning': 'Keep this link private — anyone with it can edit your signup.',
    'signup.done.magic.note': 'Bookmark it for the next time something changes.',

    // MySignup
    'mysignup.kicker': 'Volunteer Self-Service',
    'mysignup.welcome': 'Welcome back{{name}}.',
    'mysignup.subtitle': 'Your signup details.',
    'mysignup.body': 'Update anything that\'s changed.',
    'mysignup.saved': 'Saved. Your team lead will see the latest info.',
    'mysignup.save': 'Save changes',
    'mysignup.nothingToSave': 'Nothing to save',
    'mysignup.disclaimer': 'Your edits go straight to your Central Drop-off Leader. They\'ll see the most current info when they plan the week.',
    'mysignup.expiring': 'Your edit link expires in {{days}} {{daysWord}}.',
    'mysignup.expiring.body': 'Save any change below to extend it another 14+ days. After that you\'d need to ask your CDO Leader for a fresh link.',

    // Welcome Table kiosk
    'kiosk.title': 'Welcome Table · Live',
    'kiosk.day': 'Day {{day}} of Collection Week',
    'kiosk.empty': 'No volunteers signed up here yet.',
    'kiosk.fullHouse': 'Everyone\'s here. Full house.',
    'kiosk.tapToCheckIn': 'Tap to check in',
    'kiosk.checkedInAt': 'Checked in at {{time}}',
    'kiosk.welcomeBig': 'Welcome',
    'kiosk.firstTimer': 'First-Timer — find a red-shirt team lead to get started.',
    'kiosk.returner': 'Welcome back! Find your team lead in a red shirt.',
    'kiosk.exit': 'Exit',

    // Lockout / errors
    'lockout.title': 'Slow down.',
    'lockout.subtitle': 'Too many attempts.',
    'lockout.body': 'We\'ve paused this browser for {{minutes}} {{minutesWord}} to protect everyone\'s signup info. If you\'re trying to edit your own signup, find your magic link in the email we sent you after signing up — and come back then.',
    'lockout.contact': 'If you think this is a mistake, contact your Central Drop-off Leader — they can issue a fresh link.',

    // Settings page (admin) — Phase 34d, partial coverage
    'settings.kicker': 'Account & Preferences',
    'settings.title': 'Make it',
    'settings.titleEm': 'yours.',
    'settings.profile.editLabel': 'Edit profile',
    'settings.appMode.title': 'App Mode',
    'settings.appMode.subtitle': 'Production locks shoebox + carton entry. Testing unlocks it for demos and training.',
    'settings.appMode.production': 'Production',
    'settings.appMode.testing': 'Testing',
    'settings.appMode.current': 'Current',
    'settings.notifications.title': 'Notifications',
    'settings.notifications.subtitle': 'Pick which moments are worth a buzz.',
    'settings.privacy.title': 'Privacy & Lock',
    'settings.privacy.subtitle': 'Who sees what, and how the iPad stays safe.',
    'settings.accessibility.title': 'Accessibility',
    'settings.accessibility.subtitle': 'Make the screen easier on your eyes.',
    'settings.danger.title': 'Sign out',
    'settings.danger.subtitle': 'You\'ll be sent back to the role picker.',
    'settings.danger.cta': 'Sign out',

    // Signups admin page — Phase 34d, partial coverage
    'signupsAdmin.kicker': 'Signups & Schedule',
    'signupsAdmin.title': 'Volunteer',
    'signupsAdmin.titleEm': 'roster.',
    'signupsAdmin.subtitle': 'Who\'s on the team this Collection Week.',
    'signupsAdmin.section.schedule': 'Collection Week schedule',
    'signupsAdmin.section.roster': 'Volunteers',
    'signupsAdmin.section.attendance': 'Day-of attendance',
    'signupsAdmin.search.placeholder': 'Search name, email, phone…',
    'signupsAdmin.action.resend': 'Resend link',
    'signupsAdmin.action.reissue': 'Reissue link',
    'signupsAdmin.action.transfer': 'Transfer',
    'signupsAdmin.action.remove': 'Remove',
    'signupsAdmin.empty': 'No volunteers signed up yet.',
    'signupsAdmin.locked.title': 'Restricted area.',
    'signupsAdmin.locked.body': 'Volunteer information is private. Only Super Admins, SP Admins, and Regional Admins can view the full roster.',
  },

  es: {
    // Brand / global
    'brand.tagline': 'En el Nombre de Jesús',
    'brand.trust': 'Samaritan\'s Purse · Operation Christmas Child · Desde 1993',
    'lang.english': 'English',
    'lang.spanish': 'Español',

    // Volunteer signup — Intro
    'signup.intro.kicker': 'Voluntario · Semana de Recolección 2026',
    'signup.intro.heroH1': 'Sí, nos encantaría tu ayuda.',
    'signup.intro.heroSub': 'Gracias por venir.',
    'signup.intro.bodyP': '{{week}}. Unos minutos aquí ponen tu nombre en el equipo — te contactaremos con los detalles una semana antes.',
    'signup.intro.fact.shift': 'Turno promedio',
    'signup.intro.fact.shiftValue': '~3 hrs',
    'signup.intro.fact.days': 'Días abiertos',
    'signup.intro.fact.cost': 'Solo tu tiempo',
    'signup.intro.fact.costValue': '$0',
    'signup.intro.cta': 'Inscríbeme',
    'signup.intro.alreadyVolunteer': '¿Ya te inscribiste?',
    'signup.intro.signIn': 'Buscar mi enlace de edición',

    // Volunteer signup — Contact step
    'signup.contact.title': 'Empecemos contigo.',
    'signup.contact.italic': 'Tres cosas rápidas.',
    'signup.contact.nameLabel': 'Tu nombre',
    'signup.contact.namePlaceholder': 'Nombre y apellido',
    'signup.contact.emailLabel': 'Correo electrónico',
    'signup.contact.emailPlaceholder': 'tu@correo.com',
    'signup.contact.phoneLabel': 'Teléfono',
    'signup.contact.phonePlaceholder': '(404) 555-0101',
    'signup.contact.zipLabel': 'Código postal (opcional)',
    'signup.contact.zipPlaceholder': '30301',
    'signup.contact.privacy': 'Solo usamos esto para coordinar la semana. No es marketing, ni compartimos tu información — te lo prometemos.',
    'signup.contact.next': 'Continuar',

    // Volunteer signup — Details step
    'signup.details.title': 'Casi listo.',
    'signup.details.italic': 'Unos detalles rápidos para planear la semana.',
    'signup.details.firstTime': '¿Es tu primera vez como voluntario con OCC?',
    'signup.details.firstTime.yes': 'Sí, primera vez',
    'signup.details.firstTime.no': 'Lo he hecho antes',
    'signup.details.shirt': 'Talla de camiseta',
    'signup.details.emergency.title': 'Contacto de emergencia (opcional)',
    'signup.details.emergency.name': 'Nombre',
    'signup.details.emergency.phone': 'Teléfono',
    'signup.details.notes.title': '¿Algo que debamos saber? (opcional)',
    'signup.details.notes.placeholder': 'Traigo a mis hijos · Tengo una camioneta para transporte · ...',
    'signup.details.agree': 'Acepto servir con el equipo de Samaritan\'s Purse Operation Christmas Child.',
    'signup.details.submit': 'Inscríbeme',
    'signup.details.back': 'Atrás',
    'signup.details.botBlocked': 'Hmm, eso no funcionó. Por favor actualiza la página e intenta de nuevo.',
    'signup.details.throttled': 'Por favor espera {{seconds}}s antes de enviar de nuevo.',
    'signup.details.captchaRequired': 'Por favor completa la verificación humana primero.',
    'signup.details.captchaPrompt': 'No soy un robot',
    'signup.details.captchaVerifying': 'Verificando…',
    'signup.details.captchaVerified': 'Verificado.',
    'signup.details.dupeWarning': 'Ya tenemos una inscripción con este {{field}}.',
    'signup.details.dupeBody': 'Si eres tú, usa tu enlace de edición en vez de enviar otra vez — busca en tu bandeja "Operation Christmas Child." ¿Varios familiares compartiendo un correo? Envía nomás; lo arreglamos después.',
    'signup.details.shirtNone': 'Sin preferencia',
    'signup.details.notesPlaceholder': '¿Algo que debamos saber? (opcional)',
    'signup.details.notesHelp': 'Traigo a mis hijos · Tengo camioneta para transporte · Disponible el día antes para preparativos · …',
    'signup.details.emergencyHelp': 'Alguien a quien podamos contactar en una emergencia.',
    'signup.details.firstTimeYesShort': 'Sí',
    'signup.details.firstTimeNoShort': 'No',
    'signup.details.agreeShort': 'Acepto.',

    // Volunteer signup — Done step
    'signup.done.kicker': 'Estás en el equipo',
    'signup.done.title': 'Nos vemos en la Semana de Recolección.',
    'signup.done.italic': 'Gracias por servir.',
    'signup.done.body': 'Te enviaremos un recordatorio una semana antes con información de estacionamiento, qué ponerte, y una cara amable que buscar en la mesa de bienvenida.',
    'signup.done.summary': 'Resumen',
    'signup.done.summary.servingAt': 'Sirviendo en',
    'signup.done.summary.phone': 'Teléfono',
    'signup.done.summary.email': 'Correo',
    'signup.done.summary.shirt': 'Camiseta',
    'signup.done.magic.title': 'Tu enlace personal de edición',
    'signup.done.magic.intro': 'También te enviamos esto por correo a {{email}} — revisa tu bandeja en unos minutos. Guarda este enlace como respaldo; actualiza tu teléfono, talla de camiseta o notas en cualquier momento. No lo compartas — cualquiera con el enlace puede editar tu inscripción.',
    'signup.done.magic.copy': 'Copiar',
    'signup.done.magic.copied': 'Copiado',
    'signup.done.shareLine': 'Mientras tanto, comparte con un amigo:',
    'signup.done.signAnother': 'Inscribir a otro voluntario',
    'signup.done.magic.warning': 'Mantén este enlace privado — cualquiera con él puede editar tu inscripción.',
    'signup.done.magic.note': 'Guárdalo para la próxima vez que algo cambie.',

    // MySignup
    'mysignup.kicker': 'Autoservicio de Voluntario',
    'mysignup.welcome': 'Bienvenido de vuelta{{name}}.',
    'mysignup.subtitle': 'Tus detalles de inscripción.',
    'mysignup.body': 'Actualiza lo que haya cambiado.',
    'mysignup.saved': 'Guardado. Tu líder de equipo verá la información más reciente.',
    'mysignup.save': 'Guardar cambios',
    'mysignup.nothingToSave': 'Nada que guardar',
    'mysignup.disclaimer': 'Tus ediciones llegan directo a tu Líder de Centro de Recolección. Verán la información más actual cuando planeen la semana.',
    'mysignup.expiring': 'Tu enlace de edición expira en {{days}} {{daysWord}}.',
    'mysignup.expiring.body': 'Guarda cualquier cambio abajo para extenderlo otros 14+ días. Después necesitarás pedirle a tu Líder de CDO un enlace nuevo.',

    // Welcome Table kiosk
    'kiosk.title': 'Mesa de Bienvenida · En Vivo',
    'kiosk.day': 'Día {{day}} de la Semana de Recolección',
    'kiosk.empty': 'Aún no hay voluntarios inscritos aquí.',
    'kiosk.fullHouse': 'Todos están aquí. Lleno.',
    'kiosk.tapToCheckIn': 'Toca para registrarte',
    'kiosk.checkedInAt': 'Registrado a las {{time}}',
    'kiosk.welcomeBig': 'Bienvenido',
    'kiosk.firstTimer': 'Primera vez — busca al líder con camiseta roja para empezar.',
    'kiosk.returner': '¡Bienvenido de vuelta! Busca a tu líder de equipo con camiseta roja.',
    'kiosk.exit': 'Salir',

    // Lockout / errors
    'lockout.title': 'Más despacio.',
    'lockout.subtitle': 'Demasiados intentos.',
    'lockout.body': 'Hemos pausado este navegador por {{minutes}} {{minutesWord}} para proteger la información de todos. Si estás tratando de editar tu propia inscripción, busca tu enlace mágico en el correo que te enviamos después de inscribirte — y vuelve entonces.',
    'lockout.contact': 'Si crees que esto es un error, contacta a tu Líder de Centro de Recolección — pueden emitir un enlace nuevo.',

    // Settings page (admin) — Phase 34d, partial coverage
    'settings.kicker': 'Cuenta y Preferencias',
    'settings.title': 'Hazlo',
    'settings.titleEm': 'tuyo.',
    'settings.profile.editLabel': 'Editar perfil',
    'settings.appMode.title': 'Modo de la App',
    'settings.appMode.subtitle': 'El modo Producción bloquea la entrada de cajas y cartones. El modo Pruebas lo desbloquea para demos y capacitación.',
    'settings.appMode.production': 'Producción',
    'settings.appMode.testing': 'Pruebas',
    'settings.appMode.current': 'Actual',
    'settings.notifications.title': 'Notificaciones',
    'settings.notifications.subtitle': 'Elige qué momentos vale la pena que te avisen.',
    'settings.privacy.title': 'Privacidad y Bloqueo',
    'settings.privacy.subtitle': 'Quién ve qué, y cómo se mantiene seguro el iPad.',
    'settings.accessibility.title': 'Accesibilidad',
    'settings.accessibility.subtitle': 'Haz que la pantalla sea más fácil para tus ojos.',
    'settings.danger.title': 'Cerrar sesión',
    'settings.danger.subtitle': 'Te enviaremos de vuelta al selector de rol.',
    'settings.danger.cta': 'Cerrar sesión',

    // Signups admin page — Phase 34d, partial coverage
    'signupsAdmin.kicker': 'Inscripciones y Horario',
    'signupsAdmin.title': 'Lista de',
    'signupsAdmin.titleEm': 'voluntarios.',
    'signupsAdmin.subtitle': 'Quiénes están en el equipo esta Semana de Recolección.',
    'signupsAdmin.section.schedule': 'Horario de la Semana de Recolección',
    'signupsAdmin.section.roster': 'Voluntarios',
    'signupsAdmin.section.attendance': 'Asistencia del día',
    'signupsAdmin.search.placeholder': 'Buscar nombre, correo, teléfono…',
    'signupsAdmin.action.resend': 'Reenviar enlace',
    'signupsAdmin.action.reissue': 'Emitir enlace nuevo',
    'signupsAdmin.action.transfer': 'Transferir',
    'signupsAdmin.action.remove': 'Eliminar',
    'signupsAdmin.empty': 'Aún no hay voluntarios inscritos.',
    'signupsAdmin.locked.title': 'Área restringida.',
    'signupsAdmin.locked.body': 'La información del voluntario es privada. Solo los Super Admins, SP Admins y Admins Regionales pueden ver la lista completa.',
  },
};

// Context
interface I18nContext {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
}

const Ctx = createContext<I18nContext | null>(null);

function detectInitialLocale(): Locale {
  if (typeof window === 'undefined') return 'en';
  const stored = window.localStorage.getItem(LOCALE_KEY);
  if (stored === 'en' || stored === 'es') return stored;
  // Auto-detect from browser language. Match es-MX, es-ES, es-419, etc.
  const lang = navigator.language?.toLowerCase() ?? '';
  if (lang.startsWith('es')) return 'es';
  return 'en';
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(() => detectInitialLocale());

  // Persist + reflect on the <html lang> attribute so screen readers
  // announce content in the right voice and CSS :lang() selectors work.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(LOCALE_KEY, locale);
    document.documentElement.lang = locale;
  }, [locale]);

  const setLocale = useCallback((l: Locale) => setLocaleState(l), []);

  const t = useCallback(
    (key: string, vars?: Record<string, string | number>) => {
      let s = DICT[locale][key] ?? DICT.en[key] ?? key;
      if (vars) {
        for (const [k, v] of Object.entries(vars)) {
          s = s.replaceAll(`{{${k}}}`, String(v));
        }
      }
      return s;
    },
    [locale],
  );

  return <Ctx.Provider value={{ locale, setLocale, t }}>{children}</Ctx.Provider>;
}

export function useTranslation(): I18nContext {
  const v = useContext(Ctx);
  if (!v) throw new Error('useTranslation must be used within I18nProvider');
  return v;
}
