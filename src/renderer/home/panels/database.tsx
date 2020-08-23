import React, { useMemo } from 'react';
import { conf as appConf } from 'app';
import { conf as rendererConf } from 'renderer';
import { DatabaseList } from '@riboseinc/coulomb/db/renderer/status';
import { PanelConfig } from '../panel-config';


const Panel: React.FC<{}> = function() {
  return useMemo(() => (
    <DatabaseList
      databases={appConf.databases}
      databaseStatusComponents={rendererConf.databaseStatusComponents} />
  ), Object.keys(appConf.databases));
};


export default {
  Contents: Panel,
  title: "Repositories",
} as PanelConfig;
