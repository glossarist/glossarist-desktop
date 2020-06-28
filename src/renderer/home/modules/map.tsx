import React, { useContext, useEffect, useState, useRef } from 'react';

import { Button, Tag } from '@blueprintjs/core';
import CytoscapeComponent from 'react-cytoscapejs';
import { Core as Cy, NodeSingular as CyNode, ElementDefinition } from 'cytoscape';

import { LangConfigContext } from 'coulomb/localizer/renderer/context';

import { ConceptRef, MultiLanguageConcept } from 'models/concepts';
import { availableLanguages } from 'app';
import {
  SourceContext,
  ConceptContext,
  ConceptRelationshipsContext,
  ConceptRelationshipsContextProvider,
  ModuleContext,
 } from '../contexts';
import * as panels from '../panels';
import { ModuleConfig, ToolbarItem } from '../module-config';


const ConceptMap: React.FC<{}> = function () {
  return (
    <ConceptRelationshipsContextProvider>
      <ConceptNeighborhood />
    </ConceptRelationshipsContextProvider>
  );
};


const ConceptNeighborhood: React.FC<{}> = function () {
  const ctx = useContext(ConceptContext);
  const relationCtx = useContext(ConceptRelationshipsContext);

  const mod = useContext(ModuleContext);
  const showGlobal = mod.opts.mapShowGlobal;

  const cyRef = useRef<Cy | null>(null);
  const lang = useContext(LangConfigContext);
  const source = useContext(SourceContext);
  const conceptIndex = source.index;
  const conceptList = source.objects;

  const linksTo = relationCtx.linksTo;
  const linkedFrom = relationCtx.linkedFrom;

  function label(c: MultiLanguageConcept<any> | undefined) {
    if (c !== undefined) {
      return (
        (c[lang.selected as keyof typeof availableLanguages] ||
        c[lang.default as keyof typeof availableLanguages])?.terms[0]?.designation
      );
    } else {
      // Concept with this ID does not exist
      return "(concept not found)";
    }
  }

  const [elements, setElements] = useState<ElementDefinition[]>([]);

  const divRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    mod.setOpts({ ...mod.opts, fitMap: () => {
      cyRef.current?.fit();
    }});
  }, [cyRef, showGlobal]);

  useEffect(() => {
    function onSelect(evt: { target: CyNode }) {
      const node = evt.target;
      const conceptID = parseInt(node.id(), 10);

      if (conceptIndex[conceptID] !== undefined) {
        ctx.select(conceptID);
      }
    }

    if (cyRef.current) {
      cyRef.current.on('tap', 'node', onSelect);
    } else {
      console.error("No Cytoscape found :(");
    }

    return function cleanup() {
      cyRef.current?.off('tap', 'node', onSelect);
      cyRef.current?.destroy();
    }
  }, []);

  useEffect(() => {
    if (ctx.ref && ctx.active && !ctx.isLoading && !source.isLoading) {
      let concepts: ElementDefinition[];
      let relations: ElementDefinition[];

      const selectedConceptRelations = [
        ...linksTo.
          map(r => getEdge(ctx.ref!, r.to, r.type, showGlobal)).
          filter(v => v !== undefined) as ElementDefinition[],
        ...linkedFrom.
          map(ir => getEdge(ir.from, ctx.ref!, ir.type, showGlobal)).
          filter(v => v !== undefined) as ElementDefinition[],
      ];

      if (showGlobal) {
        concepts = conceptList.map(c => ({
          selected: c.termid == ctx.ref,
          data: {
            id: c.termid,
            label: label(c),
          },
        }));

        // TODO: Show all concept relations
        relations = selectedConceptRelations;
      } else {
        concepts = [
          {
            data: {
              id: `${ctx.ref}`,
              label: label(ctx.active) || '-',
              selected: true,
            }
          },
          ...linksTo.map(r => ({
            selectable: conceptIndex[r.to] !== undefined,
            data: {
              id: `${r.to}`,
              label: label(conceptIndex[r.to]) || '-',
            },
          })),
          ...linkedFrom.map(ir => ({
            selectable: conceptIndex[ir.from] !== undefined,
            data: {
              id: `${ir.from}`,
              label: label(conceptIndex[ir.from]) || '-',
            },
          })),
        ];
        relations = selectedConceptRelations;
      }

      setElements([
        ...concepts,
        ...relations,
      ]);
    }
  }, [source.isLoading, showGlobal, ctx.ref, JSON.stringify(linkedFrom)]);

  useEffect(() => {
    if (cyRef.current) {
      const zoom = cyRef.current.zoom();

      // Causes layout to break. Supposedly since elements become locked.
      // However, this also breaks layout when called after layout.run().
      //cyRef.current.$('*').lock();

      const layout = cyRef.current.elements().layout({
        name: 'grid',
        nodeDimensionsIncludeLabels: true,
      });

      layout.run();

      setImmediate(() => {
        if (showGlobal) {
          // Restore zoom after layout.run() resets it
          cyRef.current?.zoom(zoom);
        } else {
          cyRef.current?.fit();
          cyRef.current?.center();
        }
      });

      cyRef.current.$(':selected').unselect();
      cyRef.current.getElementById(`${ctx.ref}`).select();
    } else {
      console.error("No Cytoscape found :(");
    }
  }, [!showGlobal ? JSON.stringify(elements) : elements.length]);


  function getEdge(from: ConceptRef, to: ConceptRef, label: string, onlyExisting?: boolean) {
    return onlyExisting !== true || conceptIndex[to] !== undefined
      ? {
        data: {
          source: `${from}`,
          target: `${to}`,
          label: label,
        },
      }
      : undefined;
  }

  return (
    <div ref={divRef}>
      <CytoscapeComponent
        cy={cy => cyRef.current = cy}
        elements={elements}
        style={{
          width: divRef.current?.offsetWidth || 0,
          height: divRef.current?.offsetHeight,
        }}
        stylesheet={CONCEPT_MAP_ELEMENT_STYLES}
        layout={{ name: 'grid', nodeDimensionsIncludeLabels: true }} />
    </div>
  );
};


const ShowGlobalMap: ToolbarItem = function () {
  const modCtx = useContext(ModuleContext);
  const globalMap = modCtx.opts.mapShowGlobal === true;

  return (
    <Button
        icon="layout"
        title="Show all concepts"
        active={globalMap}
        onClick={() => { modCtx.setOpts({ ...modCtx.opts, mapShowGlobal: !globalMap }); }}>
      <Tag minimal>alpha</Tag>
    </Button>
  );
};


const FitMap: ToolbarItem = function () {
  const modCtx = useContext(ModuleContext);

  return <Button
    icon="zoom-to-fit"
    title="Fit map to viewport"
    onClick={() => modCtx.opts.fitMap ? modCtx.opts.fitMap() : console.debug("No fitMap") } />;
};


const CONCEPT_MAP_ELEMENT_STYLES = [
  {
    selector: 'node',
    style: {
      boundsExpansion: 10,
      label: 'data(label)',
      textWrap: 'ellipsis',
      textMaxWidth: 150,
    },
  },
  {
    selector: 'edge',
    style: {
      width: 15,
    },
  },
];


export default {
  hotkey: 'm',
  title: "Graph",

  leftSidebar: [
    panels.system,
    panels.sourceRollTranslated,
    panels.help,
  ],

  MainView: ConceptMap,
  mainToolbar: [ShowGlobalMap, FitMap],

  rightSidebar: [
    panels.status,
    panels.relationships,
  ],
} as ModuleConfig;