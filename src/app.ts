import { AppConfig } from 'coulomb/config/app';


export const defaultLanguage = 'eng';


export const availableLanguages = {
  'eng': 'English',
  'fra': 'French',
  'dan': 'Danish',
  'ara': 'Arabic',
  'ger': 'German',
  'jpn': 'Japanese',
  'kor': 'Korean',
  'msa': 'Malay',
  'rus': 'Russian',
  'spa': 'Spanish',
  'swe': 'Swedish',
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
    reviews: {
      shortName: 'review',
      verboseName: 'concept review',
      verboseNamePlural: 'concept reviews',
    },
    relations: {
      shortName: 'relation',
      verboseName: 'concept relation',
      verboseNamePlural: 'concept relations',
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
        title: 'Glossarist',
        frameless: true,
        dimensions: { width: 800, height: 500, minWidth: 800, minHeight: 500 },
      },
    },
    default: {
      openerParams: {
        title: 'Glossarist Desktop',
        dimensions: { width: 1200, height: 700, minWidth: 800, minHeight: 500 },
      },
    },
    batchCommit: {
      openerParams: {
        title: 'Glossarist Desktop: Commit changes',
        dimensions: { width: 800, height: 700, minWidth: 800, minHeight: 500 },
      },
    },
    settings: {
      openerParams: {
        title: 'Glossarist Desktop: Settings',
        dimensions: { width: 800, height: 500, minWidth: 800, minHeight: 500 },
      },
    },
  },
  settingsWindowID: 'settings',
};