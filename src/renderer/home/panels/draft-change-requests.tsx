import * as crypto from 'crypto';
import React, { useState, useContext } from 'react';
import { ChangeRequestList } from "../change-requests/list";
import { PanelConfig } from "../panel-config";
import { Button } from '@blueprintjs/core';
import { useIPCValue, callIPC } from 'coulomb/ipc/renderer';
import { ChangeRequest } from 'models/change-requests';
import { WithRevisions } from 'models/revisions';
import { ChangeRequestContext } from '../contexts';


const Panel: React.FC<{}> = function () {
  const committerInfo = useIPCValue<{}, { email: string, name: string }>
  ('db-default-get-current-committer-info', { email: '', name: '' }).value;

  return <ChangeRequestList createdBy={committerInfo.email} submitted={false} />;
};


const AddChangeRequest: React.FC<{ isCollapsed?: boolean }> = function ({ isCollapsed }) {
  const [commitInProgress, setCommitInProgress] = useState(false);
  const cr = useContext(ChangeRequestContext);

  const committerInfo = useIPCValue<{}, { email: string, name: string }>
  ('db-default-get-current-committer-info', { email: '', name: '' }).value;

  async function addNewItem() {
    if (committerInfo.name !== '' && committerInfo.email !== '') {
      setCommitInProgress(true);

      const newCRID = crypto.randomBytes(3).toString('hex');
      const revisionID = crypto.randomBytes(3).toString('hex');

      const creationTS = new Date();

      const crStub: ChangeRequest ={
        id: newCRID,
        author: committerInfo,
        timeCreated: creationTS,
        revisions: {},
        meta: {
          registry: {
            stage: 'Draft',
          },
          submitter: {
            primaryPerson: {
              name: committerInfo.name,
              email: committerInfo.email,
              affiliation: '',
            },
          },
        },
      };

      const result = await callIPC
      <{ commit: boolean, object: WithRevisions<ChangeRequest> }, { success: true }>
      ('model-changeRequests-create-one', {
        object: {
          ...crStub,
          _revisions: {
            current: revisionID,
            tree: {
              [revisionID]: {
                object: crStub,
                parents: [],
                timeCreated: creationTS,
              },
            },
          },
        },
        commit: true,
      });

      if (result.success) {
        cr.select(newCRID);
      }

      setCommitInProgress(false);
    }
  }

  return <Button
    icon="add"
    title="Create new draft change request"
    small minimal
    disabled={!committerInfo.email || commitInProgress || isCollapsed}
    loading={commitInProgress}
    onClick={(evt: React.MouseEvent) => { evt.stopPropagation(); addNewItem(); }} />;
};


export default {
  Contents: Panel,
  title: "My draft change requests",
  TitleComponentSecondary: AddChangeRequest,
} as PanelConfig;