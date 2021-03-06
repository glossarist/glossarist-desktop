import React, { useEffect, useContext, useState } from 'react';
import { Toaster, Position, Callout, FormGroup, InputGroup, Button } from '@blueprintjs/core';
import { LangConfigContext } from '@riboseinc/coulomb/localizer/renderer/context';
import { AuthoritativeSource, Concept, ConceptRef } from 'models/concepts';
import * as panels from '../panels';
import { ModuleConfig } from '../module-config';
import { EntryEdit } from '../concepts';
import { app } from 'renderer';
import {
  initializeAuthSourceDraft,
  convertDraftToAuthSource,
  AuthoritativeSourceDraft,
} from '../concepts/auth-source';
import { ConceptContext, ChangeRequestContext } from '../contexts';
import sharedStyles from '../styles.scss';
import styles from './translate.scss';
import { ChangeRequest } from 'models/change-requests';


const toaster = Toaster.create({ position: Position.TOP });


const MainView: React.FC<{}> = function () {
  const lang = useContext(LangConfigContext);
  const ctx = useContext(ConceptContext);
  const crCtx = useContext(ChangeRequestContext);
  const cr = app.useOne<ChangeRequest, string>('changeRequests', crCtx.selected || null).object;

  const [proposedAuthSource, setProposedAuthSource] =
    useState<undefined | AuthoritativeSource>
    (undefined);
  const [authSourceDraft, updateAuthSourceDraft] =
    useState<AuthoritativeSourceDraft>
    (initializeAuthSourceDraft());

  const newRevisionID: ConceptRef = 0 - Object.values(cr?.revisions.concepts || []).map(revision => revision.parents.length < 1).length - 1;

  useEffect(() => {
    if (cr !== null && cr?.meta.registry.stage !== 'Draft') {
      crCtx.select(null);
    }
    ctx.select(newRevisionID);
  }, [cr, ctx.ref]);

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
    const [authSource, errors] = convertDraftToAuthSource(authSourceDraft);

    for (const message of errors) {
      toaster.show({ icon: "error", intent: "danger", message });
    }
    if (errors.length > 0) { return; }
    setProposedAuthSource(authSource);
  }

  let entryWithSource: Concept<any, any> | undefined
  if (proposedAuthSource) {

    entryWithSource = {
      id: newRevisionID,
      language_code: lang.default,
      entry_status: 'valid',
      terms: [{ designation: '', type: 'expression', partOfSpeech: undefined }],
      definition: '',
      notes: [],
      examples: [],
      authoritative_source: proposedAuthSource,
    };
  } else {
    entryWithSource = undefined;
  }

  const authSourceForm = (
    <Callout
        className={styles.authSourceCallout}
        intent="primary"
        title="Authoritative source"
        key={`${newRevisionID}-${lang.default}`}>
      <p>
        Please specify the authoritative source you will use
        for this concept’s authoritative language entry.
        <br />
        A link and/or a standard reference is recommended.
      </p>
      <FormGroup label="Standard reference">
        <InputGroup large fill required
          type="text"
          placeholder="ISO 1234:2345"
          value={authSourceDraft.ref}
          onChange={handleAuthSourceStringPropertyChange('ref')} />
      </FormGroup>
      <FormGroup label="Clause">
        <InputGroup large fill required
          type="text"
          placeholder="3.4"
          value={authSourceDraft.clause}
          onChange={handleAuthSourceStringPropertyChange('clause')} />
      </FormGroup>
      <FormGroup label="Link" labelInfo="(if provided, must be a valid URL)">
        <InputGroup large fill required
          placeholder="http://example.com/"
          type="text"
          value={authSourceDraft.link}
          onChange={handleAuthSourceStringPropertyChange('link')} />
      </FormGroup>
      <Button large intent="primary" onClick={handleAcceptAuthSourceDraft}>
        Proceed
      </Button>
    </Callout>
  );

  return (
    <div className={sharedStyles.backdrop}>
      <div>
        {entryWithSource
          ? <EntryEdit
              changeRequestID={crCtx.selected || undefined}
              key={`${newRevisionID}-${lang.default}`}
              entry={entryWithSource}
              parentRevisionID={null}
              latestRevisionID={null}
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
    panels.system,
    //panels.sourceRollTranslated,
    //panels.languages,
    panels.help,
  ],

  MainView,
  mainToolbar: [],

  rightSidebar: [
    panels.draftChangeRequests,
  ],
} as ModuleConfig;
