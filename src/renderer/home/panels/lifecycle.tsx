import React, { useContext } from 'react';
import { FormGroup, InputGroup } from '@blueprintjs/core';
import { ConceptContext } from '../contexts';
import { PanelConfig } from '../panel-config';
import { panelFieldProps } from './common';


const Panel: React.FC<{}> = function () {
  const concept = useContext(ConceptContext);
  const localized = concept.activeLocalized;

  return (
    <div>
      {localized !== null && localized !== undefined
        ? <>
            <FormGroup
                label={<>Lifecycle&nbsp;stage</>}
                inline>
              <InputGroup
                value={localized.lifecycle_stage || '—'}
                {...panelFieldProps(concept)} />
            </FormGroup>
          </>
        : null}
    </div>
  );
};


export default {
  Contents: Panel,
  title: "Lifecycle",
} as PanelConfig;
