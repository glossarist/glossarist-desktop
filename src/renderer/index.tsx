import { RendererConfig } from 'coulomb/config/renderer';
import { renderApp } from 'coulomb/app/renderer';
import { conf as appConf, availableLanguages, defaultLanguage } from '../app';
//import { callIPC } from 'coulomb/ipc/renderer';


export const conf: RendererConfig<typeof appConf> = {
  app: appConf,

  windowComponents: {
    default: () => import('./home'),
    batchCommit: () => import('./batch-commit'),
    settings: () => import('coulomb/settings/renderer'),
  },

  databaseStatusComponents: {
    default: () => import('coulomb/db/isogit-yaml/renderer/status'),
  },

  contextProviders: [{
    cls: () => import('coulomb/localizer/renderer/context-provider'),
    getProps: async () => {
      // const registerMeta = callIPC
      // ('db-default-read', { objectID: 'branding' }).value.object;

      return {
        available: availableLanguages,
        selected: defaultLanguage,
        default: defaultLanguage,
        // NOTE: Default language is treated as authoritative language.
        // TODO: Support more than one authoritative language.
      };
    },
  }, {
    cls: () => import('coulomb/db/renderer/single-db-status-context-provider'),
    getProps: () => ({ dbName: 'default' }),
  }],
};


export const app = renderApp(conf);
