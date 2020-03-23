import React, { useContext } from 'react';
import { FormGroup, InputGroup } from '@blueprintjs/core';
import { ConceptContext } from '../contexts';
import { PanelConfig } from '../panel-config';


const Panel: React.FC<{}> = function () {
  const concept = useContext(ConceptContext);
  return (
    <div>
      <FormGroup label="ID" inline={true}>
        <InputGroup readOnly={true} value={`${concept?.ref}` || '—'} />
      </FormGroup>
    </div>
  );
};


export default {
  title: "System",
  Contents: Panel,
} as PanelConfig;