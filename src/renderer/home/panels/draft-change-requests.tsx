import React, { useContext } from 'react';
import { ChangeRequestList } from "../change-requests/list";
import { PanelConfig } from "../panel-config";
import { Tree } from '@blueprintjs/core';
import { useIPCValue } from '@riboseinc/coulomb/ipc/renderer';
import { ChangeRequestContext } from '../contexts';


const Panel: React.FC<{}> = function () {
  const committerInfo = useIPCValue<{}, { email: string, name: string }>
  ('db-default-get-current-committer-info', { email: '', name: '' }).value;
  const crCtx = useContext(ChangeRequestContext);

  return <>
    <Tree
      onNodeClick={() => crCtx.select(null)}
      contents={[{
        id: 'new-draft',
        icon: "plus",
        label: '(new CR draft)',
        isSelected: crCtx.selected === null,
      }]} />
    <ChangeRequestList createdBy={committerInfo.email} submitted={false} />
  </>;
};


export default {
  Contents: Panel,
  title: "My draft change requests",
  helpResourceID: 'my-draft-change-requests',
} as PanelConfig;
