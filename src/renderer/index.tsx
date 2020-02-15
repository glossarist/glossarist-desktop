import { RendererConfig } from 'coulomb/config/renderer';
import { renderApp } from 'coulomb/app/renderer';
import { conf as appConf, availableLanguages } from '../app';


require('events').EventEmitter.defaultMaxListeners = 10000;


export const conf: RendererConfig<typeof appConf> = {
  app: appConf,

  windowComponents: {
    default: () => import('./home'),
    settings: () => import('coulomb/settings/renderer'),
  },

  databaseStatusComponents: {
    default: () => import('coulomb/db/isogit-yaml/renderer/status'),
  },

  contextProviders: [{
    cls: () => import('coulomb/localizer/renderer/context-provider'),
    getProps: () => ({
      available: availableLanguages,
      selected: 'eng',
      default: 'eng',
    }),
  }],
};


export const app = renderApp(conf);