import React from 'react';
import { WindowComponentProps } from '@riboseinc/coulomb/config/renderer';
import { getRequiredSettings, SettingsScreen } from '@riboseinc/coulomb/settings/renderer';
import upstreamStyles from '@riboseinc/coulomb/settings/styles.scss';
import { Button, Callout, FormGroup } from '@blueprintjs/core';
import { callIPC } from '@riboseinc/coulomb/ipc/renderer';


const SettingsWindow: React.FC<WindowComponentProps> = function ({ query }) {

  async function handleClearSavedPassword() {
    await callIPC('db-default-git-clear-password');
  }

  async function handleClearWorkingCopy() {
    await callIPC('clear-working-copy');
  }

  async function handleClearAppData() {
    await callIPC('clear-app-data');
  }

  return (
    <div className={upstreamStyles.base}>
      <SettingsScreen requiredSettingIDs={getRequiredSettings(query)} />

      <Callout intent="warning" title="Saved password removal" style={{ marginBottom: '1em' }}>
        <p>
          Normally this program remembers the password for each repository using your operating system’s facilities.
          If the password you provided does not match (e.g., you changed it), this program will simply ask for it again,
          and you don’t need to do anything.
        </p>
        <p>You probably don’t want to do this unless instructed by integration team.</p>
        <FormGroup intent="warning" helperText="This will remove the password for the above repository saved using your operating system’s facilities. You will be asked for repository password next time you synchronize.">
          <Button intent="warning" onClick={handleClearSavedPassword}>Clear saved password</Button>
        </FormGroup>
      </Callout>

      <Callout intent="danger" title="Working copy reset" style={{ marginBottom: '1em' }}>
        <p>This will remove local copy of the above register.</p>
        <p>
          Any changes and change requests that were not successfully synchronized will be lost.
          Please double-check that any changes you made and want to keep have been successfully synchronized.
        </p>
        <p>You probably don’t want to do this unless instructed by integration team.</p>
        <FormGroup intent="danger" helperText="This will remove local working copy. The application will subsequently quit. The application will re-download register data on next launch.">
          <Button intent="danger" onClick={handleClearWorkingCopy}>Clear working copy</Button>
        </FormGroup>
      </Callout>

      <Callout intent="danger" title="Full data reset">
        <p>This will remove this application’s data, including settings, except for the application itself.</p>
        <p>
          Any changes and change requests that were not successfully synchronized will be lost.
          Please double-check that any changes you made and want to keep have been successfully synchronized.
        </p>
        <p>You probably don’t want to do this unless instructed by integration team.</p>
        <FormGroup intent="danger" helperText="This will remove application runtime data. The application will subsequently quit. You will need to enter repository URL, your name, etc. on next start.">
          <Button intent="danger" onClick={handleClearAppData}>Clear all application data</Button>
        </FormGroup>
      </Callout>
    </div>
  );
};

export default SettingsWindow;
