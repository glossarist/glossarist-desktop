import React, { useContext } from 'react';
import { shell } from 'electron';
import { FormGroup, InputGroup, Button } from '@blueprintjs/core';
import { callIPC } from 'coulomb/ipc/renderer';
import { ConceptContext } from '../contexts';
import { PanelConfig } from '../panel-config';
import { refToString } from '../concepts';
import { ConceptRef } from 'models/concepts';
import { useHelp } from 'renderer/help';


async function getFilesystemPath(ref: ConceptRef): Promise<string> {
  return (await callIPC<{ objectID: ConceptRef }, { path: string }>
  ('model-concepts-get-filesystem-path', { objectID: ref })).path;
}


const Panel: React.FC<{}> = function () {
  const concept = useContext(ConceptContext);
  const ref = concept?.ref ? refToString(concept.ref) : '—';
  const helpRef = useHelp('item-id');

  return (
    <div>
      <FormGroup label="ID" inline={true}>
        <InputGroup readOnly value={ref} inputRef={helpRef as (el: HTMLInputElement | null) => void} />
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
  title: "Item",
  Contents: Panel,
  TitleComponentSecondary: PanelTitleSecondary,
  helpResourceID: 'item',
} as PanelConfig;