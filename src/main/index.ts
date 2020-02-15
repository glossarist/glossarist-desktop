import * as log from 'electron-log';
import * as path from 'path';
import { app as electronApp } from 'electron';

import { MainConfig } from 'coulomb/config/main';
import { initMain } from 'coulomb/app/main';

import { default as Manager, ManagerOptions } from 'coulomb/db/isogit-yaml/main/manager';

import { listen } from 'coulomb/ipc/main';

import { MultiLanguageConcept, ConceptCollection } from '../models/concepts';
import { conf as appConf, availableLanguages } from '../app';


const appDataPath = electronApp.getPath('userData');


export const conf: MainConfig<typeof appConf> = {
  app: appConf,

  singleInstance: true,
  disableGPU: true,

  appDataPath: appDataPath,
  settingsFileName: 'glossarist-settings',

  databases: {
    default: {
      backend: () => import('coulomb/db/isogit-yaml/main/base'),
      options: {
        workDir: path.join(appDataPath, 'glossarist-database'),
        upstreamRepoURL: 'https://github.com/ISO-TC211/geolexica-database',
        corsProxyURL: 'https://cors.isomorphic-git.org',
        fsWrapperClass: async () => await import('coulomb/db/isogit-yaml/main/yaml/file'),
      },
    },
  },

  managers: {
    concepts: {
      dbName: 'default',
      options: {
        cls: () => import('./concept-manager'),
        workDir: 'concepts',
        idField: 'termid',
      } as ManagerOptions<MultiLanguageConcept<any>>,
    },
    collections: {
      dbName: 'default',
      options: {
        cls: () => import('coulomb/db/isogit-yaml/main/manager'),
        workDir: 'collections',
        idField: 'id',
      } as ManagerOptions<ConceptCollection>,
    },
  },
};


export const app = initMain(conf);


(async () => {
  // Create and write standards collection, with sub-collections being standards
  // mentioned in concept authoritative sources / lineage sources / review events.
  const _app = await app;

  const collectionManager = _app.managers.collections as Manager<ConceptCollection, string>;
  const conceptManager = _app.managers.concepts as Manager<MultiLanguageConcept<any>, number>;

  try {
    await collectionManager.read('standards');

  } catch (e) {

    const concepts = await conceptManager.readAll();
    var standards: Record<string, string[]> = {};
    for (const [ref, concept] of Object.entries(concepts)) {
      for (const lang of Object.keys(availableLanguages)) {
        const localized = concept[lang as keyof typeof availableLanguages];
        if (localized) {
          const lineage = localized.lineage_source;
          if (lineage) {
            const standard = lineage.split(',')[0].split('(')[0].trim();
            standards[standard] = [ ...(standards[standard] || []), ref ];
          }
        }
      }
    }

    setTimeout(async () => {
      const topLevelCollection: ConceptCollection = {
        id: 'standards',
        items: [],
        label: "Standards",
      }

      await collectionManager.create(topLevelCollection, "Initialize standards collection");

      for (const [idx, [standard, conceptsUsing]] of Object.entries(standards).entries()) {
        const collection = {
          id: `standard-${idx}`,
          parentID: 'standards',
          items: conceptsUsing.map(id => parseInt(id, 10)),
          label: standard,
        };
        await collectionManager.create(collection, `Create subcollection for standard  ${standard}`);
      }
    }, 4000);
  }

  return {};
})();