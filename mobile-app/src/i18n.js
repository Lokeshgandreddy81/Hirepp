import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';

const resources = {
    en: {
        translation: {
            welcome: "Welcome to HireApp",
            findJob: "Find a Job",
            postJob: "Post a Need",
            login: "Log In",
            register: "Create Account",
            smartInterview: "Smart Interview",
            // ... expand this iteratively
        }
    },
    es: {
        translation: {
            welcome: "Bienvenido a HireApp",
            findJob: "Encontrar un trabajo",
            postJob: "Publicar una necesidad",
            login: "Iniciar sesión",
            register: "Crear cuenta",
            smartInterview: "Entrevista Inteligente",
        }
    }
};

i18n
    .use(initReactI18next)
    .init({
        resources,
        lng: Localization.locale || 'en', // Automatically detect device language
        fallbackLng: 'en',
        interpolation: {
            escapeValue: false // react already safes from xss
        }
    });

export default i18n;
