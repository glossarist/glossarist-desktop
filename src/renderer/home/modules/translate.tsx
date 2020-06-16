// Concept edit non-authoritative versions

import React, { useState, useContext, useEffect } from 'react';

import {
  Button,
  InputGroup,
  NonIdealState,
  Callout, FormGroup, Toaster, Position, Icon,
 } from '@blueprintjs/core';

import { LangConfigContext } from 'coulomb/localizer/renderer/context';

import { AuthoritativeSource, Concept, WithRevisions } from 'models/concepts';
import { availableLanguages } from 'app';
import * as panels from '../panels';
import { ConceptContext, ModuleContext } from '../contexts';
import { EntryEdit, EntryDetails } from '../concepts';
import { ToolbarItem, ModuleConfig } from '../module-config';
import sharedStyles from '../styles.scss'
import styles from './translate.scss';


const toaster = Toaster.create({ position: Position.TOP });


const MainView: React.FC<{}> = function () {
  const lang = useContext(LangConfigContext);
  const ctx = useContext(ConceptContext);
  const mod = useContext(ModuleContext);

  const active = ctx.active;
  const entry = active
    ? active[lang.selected as keyof typeof availableLanguages]
    : undefined;

  const authVersion = ctx.active ? ctx.active[lang.default as keyof typeof availableLanguages] : null;
  const authIsValid: boolean | undefined = authVersion
    ? ['retired', 'superseded'].indexOf(authVersion.entry_status) < 0
    : undefined;

  const comparing = mod.opts.compareAuthoritative && authVersion;

  // Force switch to non-authoritative language
  useEffect(() => {
    if (lang.selected === lang.default) {
      lang.select(Object.keys(lang.available).filter(id => id !== lang.default)[0]);
    }
  }, [lang.selected]);

  const [proposedAuthSource, setProposedAuthSource] =
    useState<undefined | AuthoritativeSource>
    (entry?.authoritative_source);
  const [authSourceDraft, updateAuthSourceDraft] =
    useState<{ [K in keyof AuthoritativeSource]: string }>
    (initializeAuthSourceDraft(entry?.authoritative_source));

  useEffect(() => {
    setProposedAuthSource(entry?.authoritative_source);
    updateAuthSourceDraft(
      initializeAuthSourceDraft(entry?.authoritative_source));
  }, [lang.selected, active?.termid]);

  if (active === null) {
    return <NonIdealState title="No concept is selected" />;
  }

  function initializeAuthSourceDraft(authSource?: AuthoritativeSource) {
    return {
      ref: proposedAuthSource?.ref ||'',
      clause: proposedAuthSource?.clause || '',
      link: proposedAuthSource?.link?.toString() || '',
    };
  }

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
  if (entry) {
    entryWithSource = entry;
  } else if (proposedAuthSource) {
    return <Callout intent="danger" title="Adding new entries is not supported yet">
      <p>
        Sorry about that! This functionality is being updated
        to work with the new revision and review model.
      </p>
    </Callout>
    // entryWithSource = {
    //   id: active?.termid,
    //   language_code: lang.selected,
    //   entry_status: 'proposed',
    //   terms: [{ designation: '', type: 'expression', partOfSpeech: undefined }],
    //   definition: '',
    //   notes: [],
    //   examples: [],
    //   authoritative_source: proposedAuthSource,
    //   _revisions: {
    //     current: undefined,
    //     tree: [],
    //   },
    // };
  } else {
    entryWithSource = undefined;
  };

  const authSourceForm = (
    <Callout
        className={styles.authSourceCallout}
        intent={authIsValid === true ? "primary" : "warning"}
        title="Authoritative source"
        key={`${active.termid}-${lang.selected}`}>
      <p>
        {authVersion && authIsValid === false
          ? <>
              Note: The authoritative language entry for this concept ({lang.available[authVersion.language_code]})
              has status {authVersion.entry_status}. If you are sure, please </>
          : <>Please </>}
        specify the authoritative source you will use for translating this concept to {lang.available[lang.selected]}.
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
      <Button large intent={authIsValid ? "primary" : undefined} onClick={handleAcceptAuthSourceDraft}>
        Proceed to translation
      </Button>
    </Callout>
  );

  return (
    <div className={sharedStyles.backdrop}>

      <div>
        {entryWithSource && ctx.revisionID
          ? <EntryEdit
              key={`${active.termid}-${lang.selected}`}
              concept={active}
              entry={entryWithSource}
              parentRevisionID={ctx.revisionID}
              onCreateRevision={(rev) => ctx.selectRevision(rev)}
              isLoading={ctx.isLoading} />
          : authSourceForm}
      </div>

      {comparing && authVersion
        ? <div className={styles.examineConcept}>
            <EntryDetails entry={authVersion} />
          </div>
        : null}

    </div>
  );
};


const CompareAuthoritative: ToolbarItem = function () {
  const modCtx = useContext(ModuleContext);
  const compare = modCtx.opts.compareAuthoritative === true;

  return <Button
    icon="comparison"
    title="Compare with authoritative language"
    active={compare}
    onClick={() => { modCtx.setOpts({ ...modCtx.opts, compareAuthoritative: !compare }); }} />
};


export default {
  hotkey: 't',
  title: "Translate",

  leftSidebar: [
    panels.system,
    panels.sourceRollTranslated,
    panels.languages,
    panels.databases,
  ],

  MainView,
  mainToolbar: [CompareAuthoritative],

  rightSidebar: [
    panels.lifecycle,
    panels.status,
    panels.relationships,
    { className: sharedStyles.flexiblePanelSeparator,
      Contents: () => <span><Icon icon="chevron-down" />{" "}Lineage</span>,
      collapsed: 'never' },
    panels.lineage,
    panels.revision,
  ],
} as ModuleConfig;