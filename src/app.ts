import { AppConfig } from 'coulomb/config/app';


export const defaultLanguage = 'eng';


export const availableLanguages = {
  'eng': 'English',
  'fra': 'French',
  'ara': 'Arabic',
  'chi': 'Chinese',
  'ces': 'Czech',
  'dan': 'Danish',
  'fin': 'Finnish',
  'ita': 'Italian',
  'ger': 'German',
  'jpn': 'Japanese',
  'kor': 'Korean',
  'msa': 'Malay',
  'nno': 'Norwegian Nynorsk',
  'nob': 'Norwegian Bokmål',
  'pol': 'Polish',
  'por': 'Portuguese',
  'rus': 'Russian',
  'slv': 'Slovenian',
  'spa': 'Spanish',
  'srp': 'Serbian',
  'swe': 'Swedish',
};


export type CatalogPresetName = 'all' | 'current-proposal';

export type ObjectSource =
  { type: 'collection', collectionID: string } |
  { type: 'change-request', crID: string } |
  { type: 'catalog-preset', presetName: CatalogPresetName };


export const conf: AppConfig = {
  data: {
    concepts: {
      shortName: 'concept',
      verboseName: 'concept',
      verboseNamePlural: 'concepts',
    },
    changeRequests: {
      shortName: 'cr',
      verboseName: 'change request',
      verboseNamePlural: 'change requests',
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