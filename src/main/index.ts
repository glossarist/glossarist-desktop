import * as path from 'path';
import { app as electronApp } from 'electron';

import { MainConfig } from 'coulomb/config/main';
import { initMain } from 'coulomb/app/main';

import { default as Manager, ManagerOptions } from 'coulomb/db/isogit-yaml/main/manager';
import { default as BackendCls } from 'coulomb/db/isogit-yaml/main/base';
import { default as FSWrapper } from 'coulomb/db/isogit-yaml/main/yaml/file';

import { MultiLanguageConcept, ConceptCollection } from '../models/concepts';
import { conf as appConf } from '../app';

import { default as ConceptManagerCls } from './concept-manager';
import { default as ConceptReviewManagerCls } from './review-manager';
import { default as CollectionManagerCls } from './collection-manager';
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
        cls: CollectionManagerCls,
        workDir: 'collections',
        idField: 'id',
      } as ManagerOptions<ConceptCollection>,
    },
  },
};


export const app = initMain(conf);

