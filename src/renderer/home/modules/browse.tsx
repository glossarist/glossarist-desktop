import { debounce } from 'throttle-debounce';
import React, { useContext, useEffect, useRef, useState } from 'react';
import { Icon, Tooltip, InputGroup, Button } from '@blueprintjs/core';
import { LangConfigContext } from 'coulomb/localizer/renderer/context';

import { ConceptRef, MultiLanguageConcept } from 'models/concepts';
import { LangSelector } from 'renderer/lang';
import {
  SourceContext,
  ConceptContext,
  TextSearchContext,
} from '../contexts';
import { ConceptList } from '../concepts';
import * as panels from '../panels';
import { ModuleConfig, ToolbarItem } from '../module-config';
import { availableLanguages } from 'app';
import sharedStyles from '../styles.scss';
import styles from './browse.scss';


const MainView: React.FC<{}> = function () {
  const source = useContext(SourceContext);
  const concepts = source.objects;
  const concept = useContext(ConceptContext);
  const lang = useContext(LangConfigContext);

  return (
    <div className={styles.conceptBrowser}>
      <ConceptList
        lang={lang.selected as keyof typeof availableLanguages}
        concepts={concepts}
        isItemSelected={(ref: ConceptRef) => concept.ref === ref}
        onItemSelect={(ref: ConceptRef) => concept.select(ref)}
        itemMarker={(c: MultiLanguageConcept<any>) =>
          <span className={sharedStyles.conceptID}>{c.termid}</span>}
        itemMarkerRight={(c: MultiLanguageConcept<any>) => <>
          {!c[lang.selected as keyof typeof availableLanguages]
            ? <Icon htmlTitle={`Missing entry in ${lang.available[lang.selected]}`}intent="warning" icon="translate" />
            : c[lang.selected as keyof typeof availableLanguages]?.lifecycle_stage ||
                <Icon htmlTitle={`Missing lifecycle stage in ${lang.available[lang.selected]}`} intent="warning" icon="flow-linear" />}
        </>}
      />
    </div>
  );
};


const SearchByText: ToolbarItem = function () {
  const searchCtx = useContext(TextSearchContext);
  const searchFieldRef = useRef<HTMLInputElement | null>(null);
  const [query, setQuery] = useState(searchCtx.query || '' as string);

  const handleChange = function (evt: React.FormEvent<HTMLInputElement>) {
    setQuery((evt.target as HTMLInputElement).value);
  }
  const updateQuery = debounce(400, searchCtx.setQuery);

  useEffect(() => {
    updateQuery(query);
    return function cleanup() {
      updateQuery.cancel();
    }
  }, [query]);

  useEffect(() => {
    Mousetrap.bind('mod+f', () => searchFieldRef.current?.focus());

    Mousetrap.bindGlobal('escape', () => {
      if (searchFieldRef.current && document.activeElement === searchFieldRef.current) {
        searchFieldRef.current.blur();
      }
    });

    return function cleanup() {
      Mousetrap.unbind('mod+f');
      Mousetrap.unbind('escape');
    }
  }, []);

  return <InputGroup round
    value={query}
    onChange={handleChange}
    inputRef={(ref: HTMLInputElement | null) => { searchFieldRef.current = ref }}
    leftIcon="search"
    placeholder="Type to search…"
    title="Search is performed across English designations and definitions, as well as concept identifiers. (mod+f)"
    rightElement={<Button minimal icon="cross" onClick={() => setQuery('')} />}
  />;
};


const SortOrder: ToolbarItem = function () {
  const src = useContext(SourceContext).active;
  if (src.type === 'catalog-preset' && src.presetName === 'all') {
    return <Button disabled icon="sort-numerical">Concept ID</Button>;
  } else {
    return <Button disabled icon="sort">Custom order</Button>;
  }
};


export default {
  hotkey: 'b',
  title: "Browse",

  leftSidebar: [
    panels.system,
    panels.catalog,
    panels.collections,
    panels.databases,
  ],

  MainView,
  mainToolbar: [() => <LangSelector />, SearchByText, SortOrder],

  rightSidebar: [
    panels.basics,
    panels.relationships,
    panels.lifecycle,
    panels.reviews,
    panels.status,
    panels.lineage,
  ],
} as ModuleConfig;