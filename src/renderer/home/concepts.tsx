import { debounce } from 'throttle-debounce';
import React, { useState, useRef, useContext, useEffect } from 'react';

import {
  H2, ButtonGroup, Button,
  FormGroup, InputGroup,
  Classes,
  Tooltip,
  Intent,
  IconName,
  IButtonProps,
  ControlGroup,
  HTMLSelect,
} from '@blueprintjs/core';

import { FixedSizeList as List } from 'react-window';

import { callIPC } from 'coulomb/ipc/renderer';

import { app } from '../index';

import {
  Concept,
  MultiLanguageConcept,
  ConceptRef,
  Designation,
  DESIGNATION_TYPES,
  DesignationType,
  NORMATIVE_STATUS_CHOICES,
  NormativeStatus,
  Expression,
  Noun,
} from '../../models/concepts';

import { availableLanguages } from '../../app';
import { ConceptContext } from './contexts';
import { AutoSizedTextArea } from './widgets';

import styles from './styles.scss';


interface ConceptListProps {
  concepts: MultiLanguageConcept<any>[]
  itemMarker?: (c: MultiLanguageConcept<any>) => JSX.Element
  itemMarkerRight?: (c: MultiLanguageConcept<any>) => JSX.Element

  buttonProps?: IButtonProps
  paddings?: number
  itemHeight?: number

  lang: keyof typeof availableLanguages
  className?: string

  isItemSelected: (ref: ConceptRef) => boolean
  onItemSelect: (ref: ConceptRef) => void
}
export const ConceptList: React.FC<ConceptListProps> =
function ({
    lang,
    concepts,
    className,
    itemMarker,
    itemMarkerRight,
    buttonProps,
    onItemSelect,
    paddings,
    itemHeight,
    isItemSelected }) {

  const CONTAINER_PADDINGS = paddings || 0;
  const ITEM_HEIGHT = itemHeight || 30;
  const isRTL = lang === 'ara';

  const listContainer = useRef<HTMLDivElement>(null);
  const [listHeight, setListHeight] = useState<number>(CONTAINER_PADDINGS);

  const conceptCtx = useContext(ConceptContext);
  const listEl = useRef<List>(null);

  useEffect(() => {
    const updateListHeight = debounce(100, () => {
      setListHeight(listContainer.current?.parentElement?.offsetHeight || CONTAINER_PADDINGS);

      setImmediate(() => {
        if (conceptCtx.ref) {
          scrollTo(conceptCtx.ref)
        }
      });
    });

    window.addEventListener('resize', updateListHeight);

    updateListHeight();

    return function cleanup() {
      window.removeEventListener('resize', updateListHeight);
    }
  }, [listContainer.current]);

  useEffect(() => {
    if (conceptCtx.ref) {
      scrollTo(conceptCtx.ref);
    }
  }, [conceptCtx.ref]);

  function scrollTo(ref: ConceptRef) {
    if (listEl && listEl.current) {
      listEl.current.scrollToItem(
        concepts.findIndex(c => c.termid === ref),
        'smart');
    }
  }

  const Row = ({ index, style }: { index: number, style: object }) => {
    const c = concepts[index];
    return (
      <Button
          fill minimal
          style={style}
          alignText="left"
          className={styles.lazyConceptListItem}
          active={isItemSelected(c.termid)}
          {...buttonProps}
          onClick={() => onItemSelect(c.termid)}>

        {itemMarker
          ? <span className={styles.itemMarker}>{itemMarker(c)}</span>
          : null}

        <ConceptItem
          lang={lang as keyof typeof availableLanguages}
          concept={c} />

        {itemMarkerRight
          ? <span className={styles.itemMarkerRight}>{itemMarkerRight(c)}</span>
          : null}

      </Button>
    );
  };

  return (
    <div ref={listContainer} className={className}>
      <List
          ref={listEl}
          className={styles.lazyConceptList}
          direction={isRTL ? "rtl" : undefined}
          itemCount={concepts.length}
          width="100%"
          height={listHeight - CONTAINER_PADDINGS}
          itemSize={ITEM_HEIGHT}>
        {Row}
      </List>
    </div>
  );
};


interface ConceptItemProps {
  concept: MultiLanguageConcept<any>
  lang: keyof typeof availableLanguages
  className?: string 
}
export const ConceptItem: React.FC<ConceptItemProps> =
function ({ lang, concept, className }) {

  const c = concept[lang as keyof typeof availableLanguages] || concept.eng;

  const designation = c.terms[0].designation;
  const isValid = c ? ['retired', 'superseded'].indexOf(c.entry_status) < 0 : undefined;
  const designationValidityClass = isValid === false ? styles.invalidDesignation : '';

  return (
    <span
        className={`
          ${styles.conceptItem} ${className || ''}
          ${designationValidityClass}
        `}>
      {designation}
    </span>
  );
};


interface LazyConceptItemProps {
  conceptRef: ConceptRef
  lang: keyof typeof availableLanguages
  className?: string
}
export const LazyConceptItem: React.FC<LazyConceptItemProps> = function ({ conceptRef, lang, className }) {
  /* Fetches concept data from backend, defers display to ConceptItem.
     NOTE: Should not be used in large lists, too slow.
     For large lists, fetch all concepts in one request and use LazyConceptList.
  */
  const concept = app.useOne<MultiLanguageConcept<any>, ConceptRef>('concepts', conceptRef);

  if (concept.object) {
    return <ConceptItem
      concept={concept.object}
      lang={lang}
      className={className}
    />;
  } else {
    return <span className={`${Classes.SKELETON} ${styles.conceptItem} ${className || ''}`}>
      Loading…
    </span>
  }
};


// Viewing terminological entries

const Designation: React.FC<{ d: Designation }> = function ({ d }) {
  function partOfSpeechLabel(d: Expression): JSX.Element | null {
    if (d.partOfSpeech === 'noun') {
      return <><span>{d.gender}</span> <span>{d.grammaticalNumber}</span> noun</>
    } else if (d.partOfSpeech === 'adjective' && d.isParticiple) {
      return <>adj. participle</>
    } else if (d.partOfSpeech === 'adverb' && d.isParticiple) {
      return <>adv. participle</>
    } else {
      return <>{d.partOfSpeech}</>
    }
  }

  return <span className={styles.designation}>
    {d.designation}

    <span className={styles.designationMarkers}>
      {d.type === 'expression' && d.geographicalArea
        ? <strong title="Geographical area of usage">{d.geographicalArea}</strong>
        : null}
      {d.type === 'expression' && d.partOfSpeech
        ? <span className={styles.partOfSpeech}>{partOfSpeechLabel(d)}</span>
        : null}
      {d.type === 'expression' && d.isAbbreviation
        ? <span title="Acronym or abbreviation">abbr.</span>
        : null}
    </span>
  </span>
};

interface EntryDetailsProps {
  isLoading?: boolean
  entry: Concept<any, any>
  className?: string
}
export const EntryDetails: React.FC<EntryDetailsProps> = function ({ isLoading, entry, className }) {
  const loadingClass = isLoading ? Classes.SKELETON : undefined;

  const primaryDesignation = entry.terms[0];

  let synonyms: Designation[];
  if (entry.terms.length > 1) {
    synonyms = entry.terms.slice(1, entry.terms.length);
  } else {
    synonyms = [];
  }

  return (
    <div className={`${styles.entryDetails} ${entry.language_code === 'ara' ? Classes.RTL : ''} ${className || ''}`}>
      {entry.domain ? <span className={styles.legacyDomain}>&lt;{entry.domain}&gt;</span> : null}

      <H2 className={`${styles.primaryDesignation} ${loadingClass}`}>
        <Designation d={primaryDesignation} />
      </H2>

      {synonyms.length > 0
        ? <div className={styles.synonyms}>
            {[...synonyms.entries()].map(([idx, s]) => <Designation key={idx} d={s} />)}
          </div>
        : null}

      <div className={`${Classes.RUNNING_TEXT} ${styles.basics}`}>
        <p className={`${styles.definition} ${loadingClass}`}>
          {entry.usageInfo ? <span className={styles.usageInfo}>&lt;{entry.usageInfo}&gt;</span> : null}
          {entry?.definition}
        </p>

        {[...entry.examples.entries()].map(([idx, item]) =>
          <p className={`${styles.example} ${loadingClass}`} key={`example-${idx}`}>
            <span className={styles.label}>EXAMPLE:</span>
            {item}
          </p>
        )}

        {[...entry.notes.entries()].map(([idx, item]) =>
            <p className={`${styles.note} ${loadingClass}`} key={`note-${idx}`}>
            <span className={styles.label}>NOTE:</span>
              {item}
            </p>
          )}
      </div>
    </div>
  );
};


// Editing terminological entries

interface EntryFormProps {
  entry: Concept<any, any>
  className?: string
  onDefinitionChange?: (newVal: string) => void
  onUsageInfoChange?: (newVal: string) => void
  onDesignationEdit?: (idx: number, newVal: Designation) => void
  onDesignationDeletion?: (idx: number) => void
  onNoteEdit?: (idx: number, newVal: string) => void
  onNoteDeletion?: (idx: number) => void
  onExampleEdit?: (idx: number, newVal: string) => void
  onExampleDeletion?: (idx: number) => void
}
const EntryForm: React.FC<EntryFormProps> = function (props) {

  function openHelpPage(link: string) {
    require('electron').shell.openExternal(link);
  }

  function handleDesignationTypeEdit(idx: number, t: DesignationType) {
    if (!props.onDesignationEdit) { return; }
    props.onDesignationEdit(idx, { ...props.entry.terms[idx], type: t } as Designation);
  }

  function handleDesignationNormativeStatusEdit(idx: number, ns: NormativeStatus) {
    if (!props.onDesignationEdit) { return; }
    props.onDesignationEdit(idx, { ...props.entry.terms[idx], normativeStatus: ns } as Designation);
  }

  function handleDesignationEdit(idx: number, d: string) {
    if (!props.onDesignationEdit) { return; }
    props.onDesignationEdit(idx, { ...props.entry.terms[idx], designation: d });
  }

  function handleExpressionPartOfSpeech(idx: number, pos: Expression["partOfSpeech"]) {
    if (!props.onDesignationEdit) { return; }
    const designation = props.entry.terms[idx];
    if (pos === 'noun') {
      props.onDesignationEdit(idx, { ...designation, partOfSpeech: pos });
    } else {
      // Reset properties only applicable to nouns
      props.onDesignationEdit(idx, { ...designation, partOfSpeech: pos, gender: undefined, grammaticalNumber: undefined } as Designation);
    }
  }

  function handleExpressionArea(idx: number, val: string) {
    if (!props.onDesignationEdit) { return; }
    const designation = props.entry.terms[idx];
    if (designation.type === 'expression') {
      props.onDesignationEdit(idx, { ...designation, geographicalArea: val.trim() || undefined });
    }
  }

  function handleNounGender(idx: number, gnd: Noun["gender"] | '') {
    if (!props.onDesignationEdit) { return; }
    props.onDesignationEdit(idx, { ...props.entry.terms[idx], partOfSpeech: 'noun', gender: gnd || undefined });
  }

  function handleNounNumber(idx: number, nmb: Noun["grammaticalNumber"] | '') {
    if (!props.onDesignationEdit) { return; }
    props.onDesignationEdit(idx, { ...props.entry.terms[idx], partOfSpeech: 'noun', grammaticalNumber: nmb || undefined });
  }

  function designationTypeLabel(idx: number, dt: DesignationType): string {
    if (idx === 0) {
      return "Designation";
    } else if (dt === "symbol") {
      return "Symbol";
    } else {
      return "Synonym";
    }
  }

  function normativeStatusChoices(idx: number, d: Designation) {
    return <>
      {[...NORMATIVE_STATUS_CHOICES.entries()].map(([nsIdx, ns]) => 
        <Button small minimal
            key={nsIdx}
            active={ns === d.normativeStatus}
            onClick={() => handleDesignationNormativeStatusEdit(idx, ns)}>
          {ns}
        </Button>
      )}
    </>
  }

  function handleExpAbbrToggle(idx: number) {
    if (!props.onDesignationEdit) { return; }
    const designation = props.entry.terms[idx];
    if (designation.type === 'expression') {
      props.onDesignationEdit(idx, { ...designation, isAbbreviation: (!designation.isAbbreviation) || undefined });
    }
  }

  function handleExpParticipleToggle(idx: number) {
    if (!props.onDesignationEdit) { return; }
    const designation = props.entry.terms[idx];
    if (designation.type === 'expression' && (designation.partOfSpeech === 'adjective' || designation.partOfSpeech === 'adverb')) {
      props.onDesignationEdit(idx, { ...designation, isParticiple: (!designation.isParticiple) || undefined });
    }
  }

  return (
    <div className={styles.entryForm}>
      {[...props.entry.terms.entries()].map(([idx, d]) =>
        <FormGroup
            key={`designation-${idx}`}
            label={designationTypeLabel(idx, d.type)}
            labelFor={`designation-${idx}`}
            labelInfo={<>
              {props.onDesignationEdit
                ? <ButtonGroup title="Select normative status">
                    {normativeStatusChoices(idx, d)}
                  </ButtonGroup>
                : <>{d.normativeStatus || '(unspecified)'}</>}
              {" "}
              {props.onExampleDeletion
                ? <Button small
                    title="Delete this designation"
                    icon="cross"
                    disabled={idx === 0}
                    onClick={() => props.onDesignationDeletion
                      ? props.onDesignationDeletion(idx)
                      : void 0} />
                : undefined}
            </>}
            intent={d.designation.trim() === '' ? 'danger' : undefined}>

          <InputGroup fill className={styles.designation}
            value={d.designation}
            id={`designation-${idx}`}
            disabled={!props.onDesignationEdit}
            onChange={(evt: React.FormEvent<HTMLInputElement>) => {
              evt.persist();
              handleDesignationEdit(idx, (evt.target as HTMLInputElement).value);
            }} />

          <div className={styles.designationProps}>
            <ControlGroup>
              {props.onDesignationEdit
                ? <HTMLSelect
                      onChange={(evt: React.FormEvent<HTMLSelectElement>) => {
                        handleDesignationTypeEdit(idx, evt.currentTarget.value as DesignationType);
                      }}
                      value={d.type}
                      options={DESIGNATION_TYPES.map(dt => ({ value: dt }))} />
                : <Button disabled>{d.type}</Button>}

              {d.type === 'expression'
                ? <>
                    <InputGroup
                      className={styles.usageArea}
                      placeholder="Area…"
                      onChange={(evt: React.FormEvent<HTMLInputElement>) =>
                        handleExpressionArea(idx, evt.currentTarget.value)}
                      maxLength={5} />

                    <HTMLSelect
                        value={d.partOfSpeech}
                        onChange={(evt: React.FormEvent<HTMLSelectElement>) =>
                          handleExpressionPartOfSpeech(idx, evt.currentTarget.value as Expression["partOfSpeech"])}>
                      <option value={undefined}>PoS</option>
                      <option value="noun" title="Noun">n.</option>
                      <option value="adjective" title="Adjective">adj.</option>
                      <option value="verb" title="Verb">v.</option>
                      <option value="adverb" title="Adverb">adv.</option>
                    </HTMLSelect>

                    {d.partOfSpeech === 'adjective' || d.partOfSpeech === 'adverb'
                      ? <Button small
                            title="This is a participle form"
                            onClick={() => handleExpParticipleToggle(idx)}
                            active={d.isParticiple}>
                          prp.
                        </Button>
                      : null}

                    <Button small
                        title="This is an abbreviated form"
                        onClick={() => handleExpAbbrToggle(idx)}
                        active={d.isAbbreviation}>
                      abbr.
                    </Button>

                    {d.partOfSpeech === 'noun'
                      ? <>
                          <HTMLSelect key="gender"
                            title="Grammatical gender"
                            value={d.gender}
                            onChange={(evt: React.FormEvent<HTMLSelectElement>) =>
                              handleNounGender(idx, evt.currentTarget.value as Noun["gender"] || '')}>
                            <option value="">gender</option>
                            <option value="masculine" title="Masculine">m.</option>
                            <option value="feminine" title="Feminine">f.</option>
                            <option value="common" title="Common gender">comm.</option>
                            <option value="neuter" title="Neuter/neutral gender">nt.</option>
                          </HTMLSelect>
                          <HTMLSelect key="number"
                            title="Grammatical number"
                            value={d.grammaticalNumber}
                            onChange={(evt: React.FormEvent<HTMLSelectElement>) =>
                              handleNounNumber(idx, evt.currentTarget.value as Noun["grammaticalNumber"] || '')}>
                            <option value="">number</option>
                            <option value="singular">sing.</option>
                            <option value="plural">pl.</option>
                            <option value="mass">mass</option>
                          </HTMLSelect>
                        </>
                      : null}
                  </>
                : null}
            </ControlGroup>
          </div>
        </FormGroup>
      )}

      <div className={styles.usageInfo}>
        <FormGroup
            label="Usage notes"
            labelFor="usageInfo">
          <InputGroup fill
            value={props.entry.usageInfo || ''}
            id="usageInfo"
            disabled={!props.onUsageInfoChange}
            onChange={(evt: React.FormEvent<HTMLInputElement>) =>
              props.onUsageInfoChange
                ? props.onUsageInfoChange((evt.target as HTMLInputElement).value)
                : void 0} />
        </FormGroup>
        <FormGroup
            label="Domain"
            helperText="Legacy."
            labelFor="domainLegacy">
          <InputGroup fill
            defaultValue={props.entry.domain || ''}
            readOnly
            disabled
            id="domainLegacy" />
        </FormGroup>
      </div>

      <FormGroup
          className={styles.definition}
          label="Definition"
          labelFor="definition"
          intent={!props.entry.definition ? 'danger' : undefined}
          helperText={<>
            <p>
              Use a single phrase specifying the concept and, if possible, reflecting the position of the concept in the concept system.
            </p>
            <p>
              Refer to
              {" "}
              <a onClick={() => openHelpPage("https://www.iso.org/standard/40362.html")}>ISO 10241-1:2011, 6.4</a>
              {" "}
              and
              {" "}
              <a onClick={() => openHelpPage("https://www.iso.org/standard/38109.html")}>ISO 704:2009, 6.3</a> for more details about what constitutes a good definition.
            </p>
          </>}
          labelInfo="(required)">
        <AutoSizedTextArea fill
          value={props.entry.definition || ''}
          id="definition"
          disabled={!props.onDefinitionChange}
          intent={!props.entry.definition ? 'danger' : undefined}
          onChange={(evt: React.FormEvent<HTMLTextAreaElement>) =>
            props.onDefinitionChange
              ? props.onDefinitionChange((evt.target as HTMLTextAreaElement).value)
              : void 0} />
      </FormGroup>

      {[...props.entry.examples.entries()].map(([idx, item]) =>
        <FormGroup
            key={`example-${idx}`}
            label={`EXAMPLE ${idx + 1}`}
            labelFor={`example-${idx}`}
            labelInfo={props.onExampleDeletion
              ? <Button small
                  title="Delete this example"
                  icon="cross"
                  onClick={() => props.onExampleDeletion
                    ? props.onExampleDeletion(idx)
                    : void 0} />
              : undefined}
            intent={item.trim() === '' ? 'danger' : undefined}>
          <AutoSizedTextArea fill
            value={item}
            id={`example-${idx}`}
            growVertically
            disabled={!props.onExampleEdit}
            onChange={(evt: React.FormEvent<HTMLTextAreaElement>) => {
              evt.persist();
              props.onExampleEdit
                ? props.onExampleEdit(idx, (evt.target as HTMLTextAreaElement).value)
                : void 0}} />
        </FormGroup>
      )}

      {[...props.entry.notes.entries()].map(([idx, item]) =>
        <FormGroup
            key={`note-${idx}`}
            labelFor={`note-${idx}`}
            label={`NOTE ${idx + 1}`}
            labelInfo={props.onNoteDeletion
              ? <Button small
                  title="Delete this note"
                  icon="cross"
                  onClick={() => props.onNoteDeletion
                    ? props.onNoteDeletion(idx)
                    : void 0} />
              : undefined}
            intent={item.trim() === '' ? 'danger' : undefined}>
          <AutoSizedTextArea fill
            value={item}
            growVertically
            id={`note-${idx}`}
            readOnly={!props.onNoteEdit}
            onChange={(evt: React.FormEvent<HTMLTextAreaElement>) => {
              evt.persist();
              props.onNoteEdit
                ? props.onNoteEdit(idx, (evt.target as HTMLTextAreaElement).value)
                : void 0}} />
        </FormGroup>
      )}
    </div>
  );
};


interface EntryEditProps {
  concept: MultiLanguageConcept<any>
  entry: Concept<any, any>
  isLoading: boolean
  className?: string
}
export const EntryEdit: React.FC<EntryEditProps> = function (props) {
  const [entry, updateEntry] = useState(props.entry);
  const [sanitized, updateSanitized] = useState<Concept<any, any> | undefined>(undefined);
  const [commitInProgress, setCommitInProgress] = useState(false);

  useEffect(() => {
    updateSanitized(sanitizeEntry(entry));
  }, [JSON.stringify(entry)]);

  const commitChanges = async () => {
    if (sanitized !== undefined) {
      setCommitInProgress(true);

      try {
        await callIPC<{ commit: boolean, objectID: number, object: MultiLanguageConcept<any> }, { success: true }>
        ('model-concepts-update-one', {
          objectID: props.concept.termid,
          object: { ...props.concept, [entry.language_code]: sanitized },
          commit: true,
        });
        setCommitInProgress(false);
      } catch (e) {
        setCommitInProgress(false);
      }
    }
  };

  function sanitizeEntry(entry: Concept<any, any>): Concept<any, any> | undefined {
    const hasEmptyDesignations = entry.terms.filter(t => t.designation.trim() === '').length > 0;
    if (hasEmptyDesignations || (entry.definition || '').trim() === '') {
      return undefined;
    }
    return {
      ...entry,
      notes: entry.notes.filter(i => i.trim() !== ''),
      examples: entry.examples.filter(i => i.trim() !== ''),
    };
  }

  function handleDesignationAddition() {
    updateEntry((e): Concept<number, any> => {
      if (e) {
        const newTerm: Designation = { type: 'expression', designation: '', partOfSpeech: undefined };
        return { ...e, terms: [...e.terms, newTerm] }
      }
      return e;
    });
  }
  function handleDesignationChange(idx: number, val: Designation) {
    updateEntry(e => {
      if (e) {
        var items = [ ...e.terms ];
        items[idx] = val;

        return { ...e, terms: items.sort((i1, i2) => {
          if (NORMATIVE_STATUS_CHOICES.indexOf(i1.normativeStatus || 'admitted') >
              NORMATIVE_STATUS_CHOICES.indexOf(i2.normativeStatus || 'admitted')) {
             return 1;
           } else if (NORMATIVE_STATUS_CHOICES.indexOf(i1.normativeStatus || 'admitted') <
                      NORMATIVE_STATUS_CHOICES.indexOf(i2.normativeStatus || 'admitted')) {
             return -1;
           } else {
             return 0;
           }
        })};
      }
      return e;
    });
  }
  function handleDefChange(val: string) {
    updateEntry(e => ( e ? { ...e, definition: val } : e));
  }
  function handleUsageInfoChange(val: string) {
    updateEntry(e => ( e ? { ...e, usageInfo: val } : e));
  }
  function handleItemAddition(field: 'notes' | 'examples') {
    return () => {
      updateEntry(e => ( e ? { ...e, [field]: [...e[field], ''] } : e));
    };
  }
  function handleItemDeletion(field: 'notes' | 'examples' | 'terms') {
    return (idx: number) => {
      updateEntry(e => {
        if (e) {
          var items = [ ...e[field] ];
          items.splice(idx, 1);
          return { ...e, [field]: items };
        }
        return e;
      });
    };
  }
  function handleItemEdit(field: 'notes' | 'examples') {
    return (idx: number, val: string) => {
      updateEntry(e => {
        if (e) {
          var items = [ ...e[field] ];
          items[idx] = val;
          return { ...e, [field]: items };
        }
        return e;
      });
    };
  }

  const conceptForm = (
    <EntryForm
      entry={entry}
      onDefinitionChange={handleDefChange}
      onUsageInfoChange={handleUsageInfoChange}
      onDesignationDeletion={handleItemDeletion('terms')}
      onDesignationEdit={handleDesignationChange}
      onExampleDeletion={handleItemDeletion('examples')}
      onExampleEdit={handleItemEdit('examples')}
      onNoteDeletion={handleItemDeletion('notes')}
      onNoteEdit={handleItemEdit('notes')}
    />
  );

  const hasUncommittedChanges = sanitized && entry && props.entry &&
    JSON.stringify([props.entry.usageInfo, props.entry.terms, props.entry.definition, props.entry.notes, props.entry.examples]) !==
    JSON.stringify([sanitized.usageInfo, sanitized?.terms, sanitized?.definition, sanitized?.notes, sanitized?.examples]);

  const isValid = ['retired', 'superseded'].indexOf(props.entry.entry_status) < 0;

  let saveIntent: Intent | undefined;
  let saveIconSecondary: IconName | undefined;

  if (!isValid) {
    saveIntent = "warning";
    saveIconSecondary = "warning-sign";
  } else {
    saveIntent = "success";
    saveIconSecondary = undefined;
  }

  return (
    <div className={`${styles.conceptEntryForm} ${props.className || ''}`}>

      <div className={styles.entryFormToolbar}>
        <ButtonGroup>
          <Button icon="add" onClick={handleDesignationAddition} title="Add another designation/synonym">Designation</Button>
          <Button icon="add" onClick={handleItemAddition('examples')} title="Add an EXAMPLE">EX.</Button>
          <Button icon="add" onClick={handleItemAddition('notes')} title="Add a NOTE">NOTE</Button>
        </ButtonGroup>

        <ButtonGroup>
          <Button
              onClick={() => updateEntry(props.entry)}
              disabled={
                props.isLoading ||
                !entry ||
                !hasUncommittedChanges}>
            Revert
          </Button>
          <Tooltip
              openOnTargetFocus={false}
              interactionKind="hover"
              intent={saveIntent}
              disabled={!hasUncommittedChanges && isValid}
              content={`Committing new version will make your changes visible to others. ${!isValid ? "NOTE: You are editing a non-valid entry." : ''}`}>
            <Button
                onClick={commitInProgress ? undefined : commitChanges}
                active={commitInProgress}
                icon="git-commit"
                rightIcon={saveIconSecondary}
                intent={saveIntent}
                disabled={
                  sanitized === undefined ||
                  props.isLoading ||
                  !entry ||
                  !hasUncommittedChanges}>
                Commit&nbsp;version
            </Button>
          </Tooltip>
        </ButtonGroup>
      </div>

      {conceptForm}
    </div>
  );
};