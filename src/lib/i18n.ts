import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Fallback translations
const resources = {
    en: {
        translation: {
            "login_title": "NMG Marine Management System",
            "login_subtitle": "Secure Access for Fleet Operations",
            "email_label": "Email Address",
            "password_label": "Password",
            "login_button": "Sign In",
            "forgot_password": "Forgot password?",
            "remember_me": "Remember me",
            "welcome_back": "Welcome back",
            "dashboard": "Dashboard",
            "ships": "Ships",
            "tasks": "Tasks",
            "crew": "Crew",
            "audits": "Audits",
            "incidents": "Incidents",
            "cargo": "Cargo",
            "pms": "PMS",
            "Sign Up": "Sign Up",
            "Processing...": "Processing...",
            "Already have an account? Sign In": "Already have an account? Sign In",
            "Need an account? Sign Up": "Need an account? Sign Up",
            "loading_system": "Loading system...",
            "account_inactive": "Account Inactive",
            "account_deactivated_msg": "Your account has been deactivated. Please contact your system administrator.",
            "refresh": "Refresh",
            "menu_dashboard": "Dashboard",
            "menu_manuals": "Manuals",
            "menu_form_templates": "Form Templates",
            "menu_submissions": "Submissions",
            "menu_pms": "PMS",
            "menu_daily_work_logs": "Daily Work Logs",
            "menu_emergency": "Emergency Preparedness",
            "menu_incidents": "Incident Reporting",
            "menu_audits": "Audits & Reviews",
            "menu_cargo": "Cargo Operations",
            "menu_clients": "Clients",
            "menu_vessels": "Vessels",
            "menu_staff": "Staff",
            "menu_crew": "Crew",
            "menu_recruitment": "Recruitment",
            "menu_onboarding": "Onboarding",
            "menu_dg_communication": "DG Communication",
            "menu_invoices": "Invoices",
            "menu_settings": "Settings"
        }
    },
    es: {
        translation: {
            "login_title": "Sistema de gestión marina de NMG",
            "login_subtitle": "Acceso seguro para operaciones de flota",
            "email_label": "Correo electrónico",
            "password_label": "Contraseña",
            "login_button": "Iniciar sesión",
            "forgot_password": "¿Olvidaste tu contraseña?",
            "remember_me": "Recordarme",
            "welcome_back": "Bienvenido de nuevo",
            "dashboard": "Panel",
            "ships": "Buques",
            "tasks": "Tareas",
            "crew": "Tripulación",
            "audits": "Auditorías",
            "incidents": "Incidentes",
            "cargo": "Carga",
            "pms": "PMS",
            "Sign Up": "Registrarse",
            "Processing...": "Procesando...",
            "Already have an account? Sign In": "¿Ya tienes una cuenta? Iniciar sesión",
            "Need an account? Sign Up": "¿Necesitas una cuenta? Regístrate",
            "loading_system": "Cargando sistema...",
            "account_inactive": "Cuenta inactiva",
            "account_deactivated_msg": "Tu cuenta ha sido desactivada. Por favor, contacta con el administrador del sistema.",
            "refresh": "Refrescar",
            "menu_dashboard": "Panel de control",
            "menu_manuals": "Manuales",
            "menu_form_templates": "Plantillas de formularios",
            "menu_submissions": "Envíos",
            "menu_pms": "PMS",
            "menu_daily_work_logs": "Registros de trabajo diarios",
            "menu_emergency": "Preparación para emergencias",
            "menu_incidents": "Reporte de incidentes",
            "menu_audits": "Auditorías y revisiones",
            "menu_cargo": "Operaciones de carga",
            "menu_clients": "Clientes",
            "menu_vessels": "Buques",
            "menu_staff": "Personal",
            "menu_crew": "Tripulación",
            "menu_recruitment": "Reclutamiento",
            "menu_onboarding": "Incorporación",
            "menu_dg_communication": "Comunicación DG",
            "menu_invoices": "Facturas",
            "menu_settings": "Configuración"
        }
    },
    hi: {
        translation: {
            "login_title": "एनएमजी समुद्री प्रबंधन प्रणाली",
            "login_subtitle": "बेड़े संचालन के लिए सुरक्षित पहुंच",
            "email_label": "ईमेल पता",
            "password_label": "पासवर्ड",
            "login_button": "साइन इन करें",
            "forgot_password": "पासवर्ड भूल गए?",
            "remember_me": "मुझे याद रखें",
            "welcome_back": "वापसी पर स्वागत है",
            "dashboard": "डैशबोर्ड",
            "ships": "जहाज़",
            "tasks": "कार्य",
            "crew": "क्रू",
            "audits": "ऑडिट",
            "incidents": "घटनाएं",
            "cargo": "कार्गो",
            "pms": "पीएमएस",
            "Sign Up": "साइन अप करें",
            "Processing...": "प्रसंस्करण...",
            "Already have an account? Sign In": "क्या आपका पहले से ही खाता है? साइन इन करें",
            "Need an account? Sign Up": "एक खाते की आवश्यकता है? साइन अप करें",
            "loading_system": "प्रणाली लोड हो रही है...",
            "account_inactive": "अक्षम खाता",
            "account_deactivated_msg": "आपका खाता निष्क्रिय कर दिया गया है। कृपया अपने सिस्टम व्यवस्थापक से संपर्क करें।",
            "refresh": "ताज़ा करें",
            "menu_dashboard": "डैशबोर्ड",
            "menu_manuals": "नियमावली",
            "menu_form_templates": "फॉर्म टेम्पलेट्स",
            "menu_submissions": "प्रस्तुतियाँ",
            "menu_pms": "पीएमएस",
            "menu_daily_work_logs": "दैनिक कार्य लॉग",
            "menu_emergency": "आपातकालीन तैयारी",
            "menu_incidents": "घटना की रिपोर्टिंग",
            "menu_audits": "ऑडिट और समीक्षाएं",
            "menu_cargo": "कार्गो संचालन",
            "menu_clients": "ग्राहक",
            "menu_vessels": "जहाज़",
            "menu_staff": "कर्मचारी",
            "menu_crew": "क्रू",
            "menu_recruitment": "भर्ती",
            "menu_onboarding": "ऑनबोर्डिंग",
            "menu_dg_communication": "डीजी संचार",
            "menu_invoices": "चालान",
            "menu_settings": "सेटिंग्स"
        }
    },
    de: {
        translation: {
            "login_title": "NMG Meeresmanagement-System",
            "login_subtitle": "Sicherer Zugang für den Flottenbetrieb",
            "email_label": "E-Mail-Adresse",
            "password_label": "Passwort",
            "login_button": "Anmelden",
            "forgot_password": "Passwort vergessen?",
            "remember_me": "Erinnere dich an mich",
            "welcome_back": "Willkommen zurück",
            "dashboard": "Armaturenbrett",
            "ships": "Schiffe",
            "tasks": "Aufgaben",
            "crew": "Besatzung",
            "audits": "Audits",
            "incidents": "Vorfälle",
            "cargo": "Fracht",
            "pms": "PMS",
            "Sign Up": "Anmelden",
            "Processing...": "Verarbeitung...",
            "Already have an account? Sign In": "Haben Sie bereits ein Konto? Anmelden",
            "Need an account? Sign Up": "Benötigen Sie ein Konto? Registrieren",
            "loading_system": "System wird geladen...",
            "account_inactive": "Konto inaktiv",
            "account_deactivated_msg": "Ihr Konto wurde deaktiviert. Bitte kontaktieren Sie Ihren Systemadministrator.",
            "refresh": "Aktualisieren",
            "menu_dashboard": "Dashboard",
            "menu_manuals": "Handbücher",
            "menu_form_templates": "Formularvorlagen",
            "menu_submissions": "Einreichungen",
            "menu_pms": "PMS",
            "menu_daily_work_logs": "Tägliche Arbeitsprotokolle",
            "menu_emergency": "Notfallvorsorge",
            "menu_incidents": "Incident-Reporting",
            "menu_audits": "Audits & Überprüfungen",
            "menu_cargo": "Ladungsumschlag",
            "menu_clients": "Kunden",
            "menu_vessels": "Schiffe",
            "menu_staff": "Mitarbeiter",
            "menu_crew": "Besatzung",
            "menu_recruitment": "Personalbeschaffung",
            "menu_onboarding": "Onboarding",
            "menu_dg_communication": "DG Kommunikation",
            "menu_invoices": "Rechnungen",
            "menu_settings": "Einstellungen"
        }
    }
};

i18n
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
        resources,
        fallbackLng: 'en',
        interpolation: {
            escapeValue: false // react already safes from xss
        },
        detection: {
            order: ['querystring', 'cookie', 'localStorage', 'navigator', 'htmlTag', 'path', 'subdomain'],
            caches: ['localStorage', 'cookie']
        }
    });

// Optional: Custom function to force switch by country if detected via external API
export const detectLocationAndSetLanguage = async () => {
    try {
        const response = await fetch('https://ipapi.co/json/');
        const data = await response.json();
        const country = data.country_code.toLowerCase();

        const countryToLangMap: { [key: string]: string } = {
            'us': 'en',
            'gb': 'en',
            'es': 'es',
            'mx': 'es',
            'ar': 'es',
            'in': 'hi',
            'de': 'de',
            'at': 'de',
            'ch': 'de'
        };

        if (countryToLangMap[country]) {
            i18n.changeLanguage(countryToLangMap[country]);
        }
    } catch (err) {
        console.error("Location detection failed", err);
    }
};

export default i18n;
