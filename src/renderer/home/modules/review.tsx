import moment from 'moment';
import * as log from 'electron-log';
import React, { useContext, useEffect, useState } from 'react';
import VisualDiff from 'react-visual-diff';

import {
  NonIdealState, Icon, Callout, FormGroup,
  InputGroup, Button, ButtonGroup,
} from '@blueprintjs/core';
import { useIPCValue, callIPC } from 'coulomb/ipc/renderer';
import { Concept, MultiLanguageConcept, SupportedLanguages, LifecycleStage, ConceptRef } from 'models/concepts';
import { Revision } from 'models/revisions';
import { app } from 'renderer';
import { LangConfigContext } from 'coulomb/localizer/renderer/context';
import * as panels from '../panels';
import { ModuleConfig } from '../module-config';
import { ConceptContext, SourceContext, ChangeRequestContext } from '../contexts';
import { EntryDetails } from '../concepts';
import sharedStyles from '../styles.scss';
import styles from './review.scss';
import { PanelConfig } from '../panel-config';
import { ChangeRequestList } from '../change-requests/list';
import { PanelContext } from 'coulomb-panel/panel';
import { remote, shell } from 'electron';
import { ChangeRequest } from 'models/change-requests';


type ConceptRevision = Revision<Concept<any, any>>;

const MainView: React.FC<{}> = function () {
  const source = useContext(SourceContext);
  const ctx = useContext(ConceptContext);
  const crCtx = useContext(ChangeRequestContext);
  const lang = useContext(LangConfigContext);
  const crID = crCtx.selected;
  const crObjectID = crCtx.selectedItem;


  const reviewMaterial = useIPCValue
  <{ changeRequestID: string | null, objectType: string, objectID: string | null }, { toReview?: ConceptRevision }>
  ('model-changeRequests-read-revision', {}, { changeRequestID: crID, objectType: 'concepts', objectID: crObjectID }).value;

  const revisionToReview = reviewMaterial.toReview ? reviewMaterial.toReview.object : null;
  const revisionToCompare = ctx.revision;

  useEffect(() => {
    if (reviewMaterial.toReview) {
      lang.select(reviewMaterial.toReview.object.language_code);
      ctx.select(reviewMaterial.toReview.object.id);
      //selectComparableRevision();
    }
  }, [reviewMaterial.toReview]);

  if (crID === null) {
    return <NonIdealState
      title="No change request is selected"
      description={source.active.type !== 'change-request' ? <>
        <Callout intent="primary">
          Select a pending change request on the left.
        </Callout>
      </> : undefined}
    />;
  } else if (revisionToReview === null) {
    return <NonIdealState
      title="Nothing to show"
      description="Looks like selected change request has no revisions yet." />;
  }

  let material: JSX.Element;

  const toReview = <EntryDetails entry={revisionToReview} />;

  if (revisionToCompare) {
    const toCompare = <EntryDetails entry={revisionToCompare} />;
    material = <VisualDiff left={toCompare} right={toReview} />
  } else {
    material = toReview;
  }

  return (
    <div className={sharedStyles.backdrop}>
      <div className={styles.reviewForm}>
        {material}
      </div>
    </div>
  );
};


const SuggestedRevisionPanel: React.FC<{}> = function () {
  const ctx = useContext(ConceptContext);
  const crCtx = useContext(ChangeRequestContext);
  const lang = useContext(LangConfigContext);

  const [acceptInProgress, setAcceptInProgress] = useState<boolean>(false);

  const crID = crCtx.selected;
  const crObjectID = crCtx.selectedItem;

  const cr = app.useOne<ChangeRequest, string>('changeRequests', crID || null).object;

  const reviewMaterial = useIPCValue
  <{ changeRequestID: string | null, objectType: string, objectID: string | null }, { toReview?: ConceptRevision }>
  ('model-changeRequests-read-revision', {}, { changeRequestID: crID, objectType: 'concepts', objectID: crObjectID }).value;

  const revisionToReview = reviewMaterial.toReview || null;

  const _original = app.useOne<MultiLanguageConcept<any>, number>
  ('concepts', revisionToReview ? revisionToReview.object.id : null).object;

  if (!revisionToReview) {
    return null;
  }

  const original = _original ? _original[revisionToReview.object.language_code as keyof SupportedLanguages] : null;

  const suggestedRevisionParent = revisionToReview.parents[0];

  const crIsUnderReview = cr ? (cr.timeSubmitted !== undefined && cr.timeResolved === undefined) : undefined;

  // If data item has a revision referencing the ID of the CR containing this suggested revision,
  // then consider this suggested revision accepted.
  const suggestedRevisionWasAccepted = original
    ? Object.values(original._revisions.tree).find(rev => rev.changeRequestID === crID) !== undefined
    : undefined;

  const suggestedRevisionWasAcceptedAndIsCurrent = original
    ? original._revisions.tree[original._revisions.current].changeRequestID === crID
    : undefined;

  const suggestedRevisionNeedsRebase = original
    ? (suggestedRevisionWasAccepted === false && suggestedRevisionParent !== original._revisions.current)
    : undefined;

  async function applyRevision() {
    if (revisionToReview === null || !original || acceptInProgress) {
      log.error("Cannot apply revision: No revision to review");
      throw new Error("Cannot apply revision: No revision to review");
    }

    setAcceptInProgress(true);

    const parent = revisionToReview.parents[0];

    await callIPC<{ objID: ConceptRef, data: Concept<any, any>, lang: keyof SupportedLanguages, parentRevision: string }, { newRevisionID: string }>
    ('model-concepts-create-revision', { objID: original.id, data: revisionToReview.object, lang: revisionToReview.object.language_code, parentRevision: parent });

    setAcceptInProgress(false);
  }

  let acceptHelperText: undefined | string;
  if (suggestedRevisionWasAccepted) {
    acceptHelperText = `This revision was accepted, and is ${suggestedRevisionWasAcceptedAndIsCurrent ? 'current' : 'no longer current'}.`;
  } else if (suggestedRevisionNeedsRebase) {
    acceptHelperText = `Between the moment this change was proposed and now, a new revision of the original item was created.`;
  } else if (crIsUnderReview === false) {
    acceptHelperText = 'This change request is not under review, hence this change cannot be accepted.';
  } else if (cr && original) {
    acceptHelperText = 'Add this revision to original item.';
  } else {
    acceptHelperText = undefined;
  }

  return (
    <>
      <FormGroup
          label="Accept"
          intent={suggestedRevisionNeedsRebase ? 'warning' : undefined}
          helperText={acceptHelperText}
          inline>
        <Button
            intent={suggestedRevisionNeedsRebase ? "warning" : "primary"}
            icon={suggestedRevisionWasAccepted ? 'tick-circle' : 'confirm'}
            rightIcon={(suggestedRevisionWasAccepted === false && suggestedRevisionNeedsRebase === true) ? 'warning-sign' : undefined}
            loading={acceptInProgress}
            disabled={acceptInProgress || crIsUnderReview !== true || !original || suggestedRevisionWasAccepted || suggestedRevisionNeedsRebase}
            onClick={applyRevision}>
          Accept revision
        </Button>
      </FormGroup>
      <FormGroup label="Parent&nbsp;revision" inline>
        <InputGroup
          rightElement={
            <Button
              onClick={() => {
                ctx.selectRevision(revisionToReview.parents[0]);
                lang.select(revisionToReview.object.language_code);
              }}
              icon="locate"
              title="Select parent revision as comparison target."
            >diff</Button>
          }
          disabled
          type="text"
          value={revisionToReview.parents[0]} />
      </FormGroup>
    </>
  );
};
const suggestedRevision: PanelConfig = {
  Contents: SuggestedRevisionPanel,
  title: "Proposed revision",
};


type ChangeRequestLifecyclePhase = 'drafts' | 'submitted' | 'resolved';
interface ChangeRequestsPanelContext {
  filter: { lcPhase: ChangeRequestLifecyclePhase, onlyMine: boolean }
}
const ChangeRequestsPanel: React.FC<{}> = function () {
  const settings: ChangeRequestsPanelContext = useContext(PanelContext).state;
  const committerEmail = useIPCValue<{}, { email: string }>
  ('db-default-get-current-committer-info', { email: '' }).value.email;

  const phase = settings.filter?.lcPhase || 'drafts';
  const onlyMine = settings.filter?.onlyMine !== false;

  return <ChangeRequestList
    submitted={phase !== 'drafts'}
    resolved={phase === 'resolved'}
    createdBy={onlyMine ? committerEmail : undefined} />;
};

const ChangeRequestFilter: React.FC<{}> = function () {
  const panelCtx = useContext(PanelContext);

  function invokeFilterNenu() {
    const m = new remote.Menu();

    function selectLCPhase(phase: ChangeRequestLifecyclePhase) {
      panelCtx.setState((state: ChangeRequestsPanelContext) =>
        ({ ...state, filter: { ...(state.filter || {}), lcPhase: phase }}));
    }

    m.append(new remote.MenuItem({
      label: "Drafts",
      type: 'radio',
      checked: (panelCtx.state.filter?.lcPhase || 'drafts') === 'drafts',
      click: () => selectLCPhase('drafts'),
    }));
    m.append(new remote.MenuItem({
      label: "Submitted",
      type: 'radio',
      checked: panelCtx.state.filter?.lcPhase === 'submitted',
      click: () => selectLCPhase('submitted'),
    }));
    m.append(new remote.MenuItem({
      label: "Resolved",
      type: 'radio',
      checked: panelCtx.state.filter?.lcPhase === 'resolved',
      click: () => selectLCPhase('resolved'),
    }));

    m.append(new remote.MenuItem({
      type: 'separator',
    }));

    m.append(new remote.MenuItem({
      label: "My only",
      type: 'checkbox',
      checked: panelCtx.state.filter?.onlyMine !== false,
      click: () =>
        panelCtx.setState((state: ChangeRequestsPanelContext) =>
          ({ ...state, filter: { ...state.filter, onlyMine: panelCtx.state.filter?.onlyMine !== false ? false : true } })),
    }));
    m.popup({ window: remote.getCurrentWindow() });
  }

  return <Button
    minimal
    icon="filter"
    onClick={(evt: React.MouseEvent) => { evt.stopPropagation(); invokeFilterNenu(); }}
    title="Filter change requests" />
}

const changeRequests: PanelConfig = {
  Contents: ChangeRequestsPanel,
  title: "Change requests",
  TitleComponentSecondary: ChangeRequestFilter,
};


const CRDetailsPanel: React.FC<{}> = function () {
  const committerEmail = useIPCValue<{}, { email: string }>
  ('db-default-get-current-committer-info', { email: '' }).value.email;

  const crID = useContext(ChangeRequestContext).selected;

  const cr = app.useOne<ChangeRequest, string>('changeRequests', crID || null).object;

  const [stageInProgress, setStageInProgress] = useState<boolean>(false);

  async function getFilesystemPath(crID: string): Promise<string> {
    return (await callIPC<{ objectID: string }, { path: string }>
    ('model-changeRequests-get-filesystem-path', { objectID: crID })).path;
  }

  if (!crID || !cr) {
    return null;
  }

  const isInReview = cr.timeSubmitted !== undefined && cr.timeResolved === undefined;
  const isResolved = cr.timeResolved !== undefined;
  const isDraft = !isInReview && !isResolved;

  const crHasRevisions = Object.values(cr.revisions).
    find(objectTypeChanges => Object.keys(objectTypeChanges).length > 0);

  async function updateStage(newStage: LifecycleStage) {
    if (crID === null || stageInProgress) {
      return;
    }

    setStageInProgress(true);

    await callIPC<{ changeRequestID: string, newStage: LifecycleStage }, { success: true }>
    ('model-changeRequests-update-stage', { changeRequestID: crID, newStage });

    setStageInProgress(false);
  }

  return (
    <>
      <FormGroup label="ID" inline>
        <InputGroup
          disabled
          type="text"
          value={crID || '—'} />
      </FormGroup>

      {isDraft
        ? <FormGroup label="Created" inline>
            <InputGroup
              disabled
              type="text"
              value={moment(cr.timeCreated).toLocaleString()} />
          </FormGroup>
        : null}

      {isResolved
        ? <FormGroup label="Resolved" inline>
            <InputGroup
              disabled
              type="text"
              value={moment(cr.timeResolved).toLocaleString()} />
          </FormGroup>
        : null}

      {isInReview || isResolved
        ? <FormGroup label="Proposed" inline>
            <InputGroup
              disabled
              type="text"
              value={moment(cr.timeSubmitted).toLocaleString()} />
          </FormGroup>
        : null}

      <FormGroup label="CR&nbsp;stage" inline>
        <InputGroup
          readOnly
          type="text"
          rightElement={<>
            {cr.author.email === committerEmail && isDraft
              ? <Button disabled={stageInProgress || !crHasRevisions} intent="success" onClick={async () => await updateStage('Proposal')}>Propose</Button>
              : null}
            {cr.author.email === committerEmail && isInReview
              ? <Button disabled={stageInProgress} intent="warning" onClick={async () => await updateStage('Withdrawn')}>Withdraw</Button>
              : null}
            {cr.author.email !== committerEmail && isInReview
              ? <ButtonGroup>
                  <Button disabled={stageInProgress} intent="success" onClick={async () => await updateStage('Resolved')}>Resolve</Button>
                  <Button disabled={stageInProgress} intent="danger" onClick={async () => await updateStage('Rejected')}>Reject</Button>
                </ButtonGroup>
              : null}
          </>}
          value={cr.meta.registry.stage || '—'} />
      </FormGroup>
      <FormGroup label="File" inline={true}>
        <Button
          minimal
          disabled={crID === null}
          onClick={async () => crID !== null
            ? shell.showItemInFolder(await getFilesystemPath(crID))
            : void 0}>reveal</Button>
      </FormGroup>
    </>
  );
};
const CRDetailsTitleSecondary: React.FC<{ isCollapsed?: boolean }> = function ({ isCollapsed }) {
  const crID = useContext(ChangeRequestContext).selected;
  return isCollapsed ? <div>ID: {`${crID}`}</div> : null;
}
const crDetails: PanelConfig = {
  Contents: CRDetailsPanel,
  title: "Change request",
  TitleComponentSecondary: CRDetailsTitleSecondary,
};


export default {
  hotkey: 'r',
  title: "Review",

  leftSidebar: [
    crDetails,
    panels.changeRequestRevisions,
    changeRequests,
    panels.databases,
  ],

  MainView: MainView,
  mainToolbar: [],

  rightSidebar: [
    suggestedRevision,
    { className: sharedStyles.flexiblePanelSeparator,
      Contents: () => <span><Icon icon="chevron-down" />{" "}Comparison target</span>,
      collapsed: 'never' },
    { ...panels.languages, collapsed: 'by-default' },
    panels.lineage,
    panels.revision,
  ],
} as ModuleConfig;