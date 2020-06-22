import React, { useEffect, useContext, useState } from 'react';
import { NonIdealState, Toaster, Position, Callout, FormGroup, InputGroup, Button } from '@blueprintjs/core';
import { LangConfigContext } from 'coulomb/localizer/renderer/context';
import { AuthoritativeSource, Concept } from 'models/concepts';
import * as panels from '../panels';
import { ModuleConfig } from '../module-config';
import { EntryEdit } from '../concepts';
import { ConceptContext, ChangeRequestContext } from '../contexts';
import sharedStyles from '../styles.scss';
import styles from './translate.scss';
import { WithRevisions } from 'models/revisions';


const toaster = Toaster.create({ position: Position.TOP });


function initializeAuthSourceDraft(authSource?: AuthoritativeSource) {
return {
    ref: '',
    clause: '',
    link: 'https://example.com/',
};
}


const MainView: React.FC<{}> = function () {
  const lang = useContext(LangConfigContext);
  const ctx = useContext(ConceptContext);
  const cr = useContext(ChangeRequestContext);

  const [proposedAuthSource, setProposedAuthSource] =
    useState<undefined | AuthoritativeSource>
    (undefined);
  const [authSourceDraft, updateAuthSourceDraft] =
    useState<{ [K in keyof AuthoritativeSource]: string }>
    (initializeAuthSourceDraft());

  useEffect(() => {
    ctx.select(-1);
  }, [ctx.ref]);

  // Force switch to authoritative language
  useEffect(() => {
    if (lang.selected !== lang.default) {
      lang.select(lang.default);
    }
  }, [lang.selected]);

  function handleAuthSourceStringPropertyChange(field: keyof AuthoritativeSource) {
    return (evt: React.FormEvent<HTMLInputElement>) => {
      evt.persist();
      updateAuthSourceDraft(s => ({
        ...s,
        [field]: (evt.target as HTMLInputElement).value }));
    };
  }
  function handleAcceptAuthSourceDraft() {
    let link: URL;
    try {
      link = new URL(authSourceDraft.link);
    } catch (e) {
      toaster.show({
        icon: "error",
        intent: "danger",
        message: "You seem to have specified an incorrect URL as authoritative source link.",
      });
      return;
    }
    setProposedAuthSource({
      ref: authSourceDraft.ref,
      clause: authSourceDraft.clause,
      link: link,
    });
  }

  let entryWithSource: WithRevisions<Concept<any, any>> | undefined
  if (proposedAuthSource) {

    const revisionID: string = '123456';
    // TODO: Generate hex

    const entry: Concept<any, any> = {
      id: -1,
      language_code: lang.default,
      entry_status: 'valid',
      terms: [{ designation: '', type: 'expression', partOfSpeech: undefined }],
      definition: '',
      notes: [],
      examples: [],
      authoritative_source: proposedAuthSource,
    };
    entryWithSource = {
      ...entry,
      _revisions: {
        current: revisionID,
        tree: {
          [revisionID]: {
            parents: [],
            timeCreated: new Date(),
            object: entry,
          },
        },
      },
    };
  } else {
    entryWithSource = undefined;
  }

  if (cr.selected === null) {
    return <NonIdealState
      icon="edit"
      title="Change request, please!"
      description="To make changes, select or create a draft CR." />;
  }

  const authSourceForm = (
    <Callout
        className={styles.authSourceCallout}
        intent="primary"
        title="Authoritative source"
        key={`-1-${lang.default}`}>
      <p>
        Please specify the authoritative source you will use for this concept’s authoritative language entry.
      </p>
      <FormGroup label="Standard reference" labelInfo="(required)">
        <InputGroup large fill required
          type="text"
          placeholder="ISO 1234:2345"
          value={authSourceDraft.ref}
          onChange={handleAuthSourceStringPropertyChange('ref')} />
      </FormGroup>
      <FormGroup label="Clause" labelInfo="(required)">
        <InputGroup large fill required
          type="text"
          placeholder="3.4"
          value={authSourceDraft.clause}
          onChange={handleAuthSourceStringPropertyChange('clause')} />
      </FormGroup>
      <FormGroup label="Link" labelInfo="(must be a valid URL)">
        <InputGroup large fill required
          placeholder="http://example.com/"
          type="text"
          value={authSourceDraft.link}
          onChange={handleAuthSourceStringPropertyChange('link')} />
      </FormGroup>
      <Button large intent="primary" onClick={handleAcceptAuthSourceDraft}>
        Proceed to translation
      </Button>
    </Callout>
  );

  return (
    <div className={sharedStyles.backdrop}>
      <div>
        {entryWithSource
          ? <EntryEdit
              changeRequestID={cr.selected}
              key={`-1-${lang.default}`}
              entry={entryWithSource}
              parentRevisionID={null}
              isLoading={ctx.isLoading} />
          : authSourceForm}
      </div>
    </div>
  );
};

export default {
  hotkey: 'e',
  title: "Create",

  leftSidebar: [
    //panels.system,
    //panels.sourceRollTranslated,
    //panels.languages,
    panels.databases,
  ],

  MainView,
  mainToolbar: [],

  rightSidebar: [
    panels.draftChangeRequests,
  ],
} as ModuleConfig;
