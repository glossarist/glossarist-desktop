import React, { useContext } from 'react';
import { shell } from 'electron';
import { FormGroup, InputGroup, Button } from '@blueprintjs/core';
import { callIPC } from 'coulomb/ipc/renderer';
import { ConceptContext } from '../contexts';
import { PanelConfig } from '../panel-config';
import { refToString } from '../concepts';
import { ConceptRef } from 'models/concepts';


async function getFilesystemPath(ref: ConceptRef): Promise<string> {
  return (await callIPC<{ objectID: ConceptRef }, { path: string }>
  ('model-concepts-get-filesystem-path', { objectID: ref })).path;
}


const Panel: React.FC<{}> = function () {
  const concept = useContext(ConceptContext);
  const ref = concept?.ref ? refToString(concept.ref) : '—';

  return (
    <div>
      <FormGroup label="ID" inline={true}>
        <InputGroup readOnly={true} value={ref} />
      </FormGroup>
      <FormGroup label="File" inline={true}>
        <Button
          minimal
          disabled={concept?.ref === null}
          onClick={async () => concept?.ref !== null
            ? shell.showItemInFolder(await getFilesystemPath(concept?.ref))
            : void 0}>reveal</Button>
      </FormGroup>
    </div>
  );
};


const PanelTitleSecondary: React.FC<{ isCollapsed?: boolean }> = function ({ isCollapsed }) {
  const concept = useContext(ConceptContext);
  return isCollapsed ? <div>ID: {`${concept?.ref}`}</div> : null;
}


export default {
  title: "System",
  Contents: Panel,
  TitleComponentSecondary: PanelTitleSecondary,
} as PanelConfig;