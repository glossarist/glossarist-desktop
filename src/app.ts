import { AppConfig } from '@riboseinc/coulomb/config/app';


export const defaultLanguage = 'eng';


export function isRTL(lang: keyof typeof availableLanguages) {
  return lang === 'ara';
}


export const availableLanguages = {
  'eng': 'English',
  'ara': 'Arabic',
  'zho': 'Chinese',
  'dan': 'Danish',
  'nld': 'Dutch',
  'fin': 'Finnish',
  'fra': 'French',
  'deu': 'German',
  'jpn': 'Japanese',
  'kor': 'Korean',
  'msa': 'Malay',
  'pol': 'Polish',
  'rus': 'Russian',
  'spa': 'Spanish',
  'swe': 'Swedish',

  'ces': 'Czech',
  'ita': 'Italian',
  'nno': 'Norwegian Nynorsk',
  'nob': 'Norwegian Bokmål',
  'por': 'Portuguese',
  'slv': 'Slovenian',
  'srp': 'Serbian',
} as const;


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
        dimensions: { width: 1200, height: 700, minWidth: 1200, minHeight: 500 },
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
