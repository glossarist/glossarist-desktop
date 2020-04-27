import * as path from 'path';
import { app as electronApp } from 'electron';

import { MainConfig } from 'coulomb/config/main';
import { initMain } from 'coulomb/app/main';

import { listen } from 'coulomb/ipc/main';
import { default as Manager, ManagerOptions } from 'coulomb/db/isogit-yaml/main/manager';
import { default as BackendCls } from 'coulomb/db/isogit-yaml/main/base';
import { default as ModelManagerCls } from 'coulomb/db/isogit-yaml/main/manager';
import { default as FSWrapper } from 'coulomb/db/isogit-yaml/main/yaml/file';

import { MultiLanguageConcept, ConceptCollection } from '../models/concepts';
import { conf as appConf } from '../app';

import { default as ConceptManagerCls } from './concept-manager';
import { default as ConceptReviewManagerCls } from './review-manager';
import { Review } from 'models/reviews';


const appDataPath = electronApp.getPath('userData');


export const conf: MainConfig<typeof appConf> = {
  app: appConf,

  singleInstance: true,
  disableGPU: true,

  appDataPath: appDataPath,
  settingsFileName: 'glossarist-settings',

  databases: {
    default: {
      backend: BackendCls,
      options: {
        workDir: path.join(appDataPath, 'glossarist-database'),
        upstreamRepoURL: 'https://github.com/ISO-TC211/geolexica-database',
        corsProxyURL: 'https://cors.isomorphic-git.org',
        fsWrapperClass: FSWrapper,
      },
    },
  },

  managers: {
    reviews: {
      dbName: 'default',
      options: {
        cls: ConceptReviewManagerCls,
        workDir: 'reviews',
        idField: 'id',
      } as ManagerOptions<Review>,
    },
    concepts: {
      dbName: 'default',
      options: {
        cls: ConceptManagerCls,
        workDir: 'concepts',
        idField: 'termid',
      } as ManagerOptions<MultiLanguageConcept<any>>,
    },
    collections: {
      dbName: 'default',
      options: {
        cls: ModelManagerCls,
        workDir: 'collections',
        idField: 'id',
      } as ManagerOptions<ConceptCollection>,
    },
  },
};


export const app = initMain(conf);


/* This is a temporary endpoint serving for data migration.
   It creates an initial set of collections based on concept lineage source.
   This will be removed once collections are committed to the database. */

listen<{}, {}>
('initialize-standards-collections', async () => {

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
      const localized = concept.eng;
      if (localized) {
        const lineage = localized.lineage_source;
        if (lineage) {
          const standard = lineage.split(',')[0].split('(')[0].trim();
          standards[standard] = [ ...(standards[standard] || []), ref ];
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

      await collectionManager.reportUpdatedData();
    }, 4000);
  }

  return {};
})