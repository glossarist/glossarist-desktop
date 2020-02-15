import { AppConfig } from 'coulomb/config/app';


export const availableLanguages = {
  'eng': 'English',
  'fra': 'Francias',
  'chn': 'Chinese',
};


export type ObjectSource =
  { type: 'collection', collectionID: string } |
  { type: 'catalog-preset', presetName: string };


export const conf: AppConfig = {
  data: {
    concepts: {
      shortName: 'concept',
      verboseName: 'concept',
      verboseNamePlural: 'concepts',
    },
    collections: {
      shortName: 'collection',
      verboseName: 'collection',
      verboseNamePlural: 'collections',
    },
  },

  databases: {
    default: {
      verboseName: 'Concept database',
    }
  },

  help: {
    rootURL: 'https://geolexica.org/desktop/help/',
  },

  windows: {
    splash: {
      openerParams: {
        title: 'ISO/TC 211 Geolexica',
        frameless: true,
        dimensions: { width: 800, height: 500, minWidth: 800, minHeight: 500 },
      },
    },
    default: {
      openerParams: {
        title: 'ISO/TC 211 Geolexica Desktop',
        frameless: false,
        dimensions: { width: 1200, height: 700, minWidth: 800, minHeight: 500 },
      },
    },
    settings: {
      openerParams: {
        title: 'ISO/TC 211 Geolexica Desktop Settings',
        frameless: true,
        dimensions: { width: 800, height: 500, minWidth: 800, minHeight: 500 },
      },
    },
  },
  settingsWindowID: 'settings',
};