import moment from 'moment';
import React, { useContext } from 'react';
import { FormGroup, InputGroup } from '@blueprintjs/core';
import { app } from 'renderer';
import { ConceptContext } from '../contexts';
import { PanelConfig } from '../panel-config';
import { CommitterPic } from '../widgets';
import { ChangeRequest } from 'models/change-requests';


const Panel: React.FC<{}> = function () {
  const ctx = useContext(ConceptContext);

  const entry = ctx.activeLocalized;
  const selectedRevisionID = ctx.revisionID;
  const revision = entry && selectedRevisionID ? entry._revisions.tree[selectedRevisionID] : null;
  const changeRequestID = revision?.changeRequestID;

  const cr = app.useOne<ChangeRequest, string>('changeRequests', changeRequestID || null).object;

  if (!entry || !selectedRevisionID) {
    return null;
  }

  if (!revision) {
    console.error("Revision missing—probably on-the-fly migration")
    return null;
  }

  let authorString: string;
  if (revision.author !== undefined) {
    authorString = `${revision.author.name} <${revision.author.email}>`;
  } else {
    authorString = "(not recorded)"
  }

  return (
    <>
      <FormGroup
          label="Creator"
          inline
          helperText={cr !== null ? "Member who accepted the requested change." : undefined}>
        <InputGroup
          readOnly
          type="text"
          value={authorString}
          leftElement={revision.author !== undefined
            ? <CommitterPic email={revision.author.email} />
            : undefined} />
      </FormGroup>
      <FormGroup label="Time" inline>
        <InputGroup readOnly type="text" defaultValue={moment(revision.timeCreated).toLocaleString()} />
      </FormGroup>
      {changeRequestID !== undefined && changeRequestID !== ''
        ? <FormGroup label="CR ID" inline>
            <InputGroup
              readOnly
              type="text"
              title="ID of change request containing this revision"
              value={changeRequestID} />
          </FormGroup>
        : null}
      {cr !== null
        ? <FormGroup label="CR&nbsp;author" inline>
            <InputGroup
              readOnly
              title="Author of change request containing this revision"
              type="text"
              value={cr.meta.submitter.primaryPerson.name}
              leftElement={<CommitterPic email={cr.meta.submitter.primaryPerson.email} />} />
          </FormGroup>
        : null}
    </>
  );
};


const PanelTitleSecondary: React.FC<{ isCollapsed?: boolean }> = function ({ isCollapsed }) {
  const ctx = useContext(ConceptContext);
  return <div>{`${ctx.revisionID}`}</div>;
}


export default {
  Contents: Panel,
  title: "Selected revision",
  TitleComponentSecondary: PanelTitleSecondary,
} as PanelConfig;