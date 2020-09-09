import { remote } from 'electron';
import React, { useState, useContext, useEffect, useRef } from 'react';
import { InputGroup, Button, ITreeNode, Tree, Tag } from '@blueprintjs/core';
import { callIPC } from '@riboseinc/coulomb/ipc/renderer';
import { LangConfigContext } from '@riboseinc/coulomb/localizer/renderer/context';
import { ConceptRef, MultiLanguageConcept, ConceptRelation } from 'models/concepts';
import { PanelContext } from 'coulomb-panel/panel';

import {
  ConceptContext,
  ConceptRelationshipsContextProvider,
  ConceptRelationshipsContext,
  UserRoleContext,
} from '../contexts';

import { LazyConceptItem } from '../concepts';
import { availableLanguages } from 'app';
import { PanelConfig } from '../panel-config';

import styles from './relationships.scss';
import sharedStyles from '../styles.scss';


const DEFAULT_RELATIONSHIP_TYPE = 'related';


interface RelationshipsPanelState {
  type?: string
  addingLink?: boolean
}


const Panel: React.FC<{}> = function () {
  const concept = useContext(ConceptContext);

  const panel = useContext(PanelContext);
  const panelState = panel.state as RelationshipsPanelState;
  const addingLink = panelState.addingLink || false;

  const [newLinkTarget, setNewLinkTarget] = useState<string>('');
  const [commitInProgress, setCommitInProgress] = useState(false);

  const newLinkType = panelState.type || DEFAULT_RELATIONSHIP_TYPE;

  const newLinkInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    newLinkInputRef.current?.focus();
  }, [addingLink]);

  function toggleAddingLink(state: boolean) {
    panel.setState({ addingLink: state });
  }

  function handleNewLinkChange(evt: React.FormEvent<HTMLInputElement>) {
    setNewLinkTarget((evt.target as HTMLInputElement).value.trim());
  }

  async function addNewLink() {
    let newLinkRef: number;
    try {
      newLinkRef = parseInt(newLinkTarget, 10);
    } catch (e) {
      return;
    }

    const existingRelations = concept.active?.relations || [];

    const alreadyExists =
      existingRelations.
      find(r => r.to === newLinkRef && r.type === newLinkType) !== undefined;

    if (newLinkRef !== concept.ref && alreadyExists === false && concept.ref && concept.active) {
      setCommitInProgress(true);

      const relations: ConceptRelation[] = [
        ...existingRelations,
        { to: newLinkRef, type: newLinkType },
      ];

      await callIPC
        <{ commit: boolean, objectID: number, object: MultiLanguageConcept<any> }, { success: true }>
        ('model-concepts-update-one', {
          objectID: concept.ref,
          object: { ...concept.active, relations },
          commit: true,
        });

      setNewLinkTarget('');
      setCommitInProgress(false);
      toggleAddingLink(false);
    }
  }

  async function handleRemoveOutgoingLink(type: string, to: ConceptRef) {
    toggleAddingLink(false);

    if (concept.ref && concept.active) {
      const existingRelations = concept.active.relations || [];

      const relations: ConceptRelation[] =
        existingRelations.filter(r => r.to !== to || r.type !== type);

      await callIPC
      <{ commit: boolean, objectID: number, object: MultiLanguageConcept<any> }, { success: true }>
      ('model-concepts-update-one', {
        objectID: concept.ref,
        object: { ...concept.active, relations },
        commit: true,
      });
    }
  }

  return (
    <>
      {addingLink
        ? <InputGroup small
            type="text"
            inputRef={(ref) => { newLinkInputRef.current = ref }}
            readOnly={commitInProgress}
            rightElement={
              <>
                <Button
                  small minimal intent="primary"
                  icon="tick-circle"
                  loading={commitInProgress}
                  disabled={newLinkTarget.trim() === ''}
                  onClick={addNewLink}
                  title="Commit new outgoing link" />
              </>
            }
            onChange={handleNewLinkChange}
            value={newLinkTarget}
            placeholder="ID of concept to link"
          />
        : null}

      <ConceptRelationshipsContextProvider>
        <ConceptRelations
          onRemoveOutgoingLink={handleRemoveOutgoingLink}
          onConceptSelect={(ref: ConceptRef) => concept.select(ref)}/>
      </ConceptRelationshipsContextProvider>
    </>
  );
};


const PanelTitleSecondary: React.FC<{ isCollapsed?: boolean }> = function ({ isCollapsed }) {
  const concept = useContext(ConceptContext);
  const panel = useContext(PanelContext);
  const panelState = panel.state as RelationshipsPanelState;
  const addingLink = panelState.addingLink || false;
  const userIsManager = useContext(UserRoleContext).isManager === true;

  useEffect(() => {
    toggleAddingLink(false);
  }, [isCollapsed]);

  function toggleAddingLink(state: boolean) {
    panel.setState({ addingLink: state });
  }

  function invokeRelationshipTypeMenu() {
    const m = new remote.Menu();
    const type = panel.state.type || DEFAULT_RELATIONSHIP_TYPE;

    function selectType(type: string) {
      toggleAddingLink(true);
      panel.setState((state: RelationshipsPanelState) =>
        ({ ...state, type }));
    }

    m.append(new remote.MenuItem({
      label: "Parent (domain/broader)",
      type: 'radio',
      checked: type === 'parent',
      click: () => selectType('parent'),
    }));

    m.append(new remote.MenuItem({
      label: "Related",
      type: 'radio',
      checked: type === 'related',
      click: () => selectType('related'),
    }));

    m.popup({ window: remote.getCurrentWindow() });
  }

  if (userIsManager) {
    return (
      <Button
          minimal
          icon="add"
          disabled={!concept.active}
          active={addingLink}
          onClick={(evt: React.MouseEvent<HTMLElement>) => {
            evt.stopPropagation();
            if (!addingLink) {
              invokeRelationshipTypeMenu();
            } else {
              toggleAddingLink(false);
            }
          }} />
    );
  } else {
    return null;
  }

};


interface ConceptRelationsProps {
  onRemoveOutgoingLink: (relationType: string, relationTarget: ConceptRef) => void
  onConceptSelect: (ref: ConceptRef) => void
}
const ConceptRelations: React.FC<ConceptRelationsProps> =
function ({ onRemoveOutgoingLink, onConceptSelect }) {
  const ctx = useContext(ConceptRelationshipsContext);
  const lang = useContext(LangConfigContext);

  const nodesLinksTo: ITreeNode[] = ctx.linksTo.map(r => ({
    id: r.to,
    hasCaret: false,
    label: <LazyConceptItem
      lang={lang.selected as keyof typeof availableLanguages}
      conceptRef={r.to} />,
    icon: <span className={`${sharedStyles.conceptID} ${styles.conceptID}`}>{r.to}</span>,
    secondaryLabel: <>
      <Tag minimal>{r.type}</Tag>
      <Button small minimal
        onClick={(evt: React.FormEvent) => {
          evt.preventDefault();
          evt.stopPropagation();
          onRemoveOutgoingLink(r.type, r.to);
        }}
        icon="cross" />
    </>,
    nodeData: {
      type: r.type,
      to: r.to,
      ref: r.to,
    },
  }));

  const nodesLinkedFrom: ITreeNode[] = ctx.linkedFrom.map(r => ({
    id: r.from,
    hasCaret: false,
    icon: <span className={`${sharedStyles.conceptID} ${styles.conceptID}`}>{r.from}</span>,
    label: <LazyConceptItem
      lang={lang.selected as keyof typeof availableLanguages}
      conceptRef={r.from} />,
    secondaryLabel: <>
      <Tag minimal>{r.type}</Tag>
      <Button disabled small minimal icon="cross" />
    </>,
    nodeData: {
      type: r.type,
      ref: r.from,
    },
  }));

  var nodes: ITreeNode[] = []
  if (nodesLinksTo.length > 0) {
    nodes.push({
      id: 'outgoing',
      label: "Links to",
      hasCaret: true,
      isExpanded: true,
      childNodes: nodesLinksTo,
    });
  }
  if (nodesLinkedFrom.length > 0) {
    nodes.push({
      id: 'incoming',
      label: "Linked from",
      hasCaret: true,
      isExpanded: true,
      childNodes: nodesLinkedFrom,
    });
  }

  function handleNodeClick(node: ITreeNode) {
    const data = node?.nodeData as { ref: ConceptRef } | undefined;
    if (data) {
      onConceptSelect(data.ref);
    }
  }

  return (
    <Tree contents={nodes} onNodeClick={handleNodeClick} />
  );
};


export default {
  Contents: Panel,
  title: "Relationships",
  TitleComponentSecondary: PanelTitleSecondary,
  helpResourceID: 'relationships',
} as PanelConfig;
