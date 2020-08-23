import * as path from 'path';
import { app as electronApp } from 'electron';

import { MainConfig } from '@riboseinc/coulomb/config/main';
import { initMain } from '@riboseinc/coulomb/app/main';

import { default as BackendCls } from '@riboseinc/coulomb/db/isogit-yaml/main/base';
import { default as FSWrapper } from '@riboseinc/coulomb/db/isogit-yaml/main/yaml/file';
import { ManagerOptions } from '@riboseinc/coulomb/db/isogit-yaml/main/manager';


import { MultiLanguageConcept, ConceptCollection } from '../models/concepts';
import { conf as appConf } from '../app';

import { default as ConceptManagerCls } from './concept-manager';
import { default as ConceptChangeRequestManagerCls } from './change-request-manager';
import { default as CollectionManagerCls } from './collection-manager';
import { ChangeRequest } from 'models/change-requests';


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
        fsWrapperClass: FSWrapper,
      },
    },
  },

  managers: {
    changeRequests: {
      dbName: 'default',
      options: {
        cls: ConceptChangeRequestManagerCls,
        workDir: 'change-requests',
        idField: 'id',
      } as ManagerOptions<ChangeRequest>,
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
