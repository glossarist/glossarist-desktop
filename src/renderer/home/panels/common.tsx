import React from 'react';
import { IInputGroupProps } from "@blueprintjs/core";
import { ConceptContextSpec } from "../contexts";

import styles from './common.scss';


export function panelFieldProps(concept: ConceptContextSpec) {
  /* Props shared across BP3 input groups, textareas in panel fields. */

  return {
    fill: true,
    intent: (concept.activeLocalized === undefined
      ? 'danger'
      : undefined
    ) as IInputGroupProps["intent"],
    disabled: concept.isLoading,
    readOnly: true,
  };
}


export const PanelPlaceholder: React.FC<{}> = function () {
  return (
    <div className={styles.panelPlaceholder}>
      Coming soon.
    </div>
  );
};