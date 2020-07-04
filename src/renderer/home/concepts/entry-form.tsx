import React from 'react';

import {
  Button, FormGroup, ButtonGroup,
  InputGroup, ControlGroup,
  HTMLSelect,
} from '@blueprintjs/core';

import {
  Concept, Designation, DesignationType,
  NormativeStatus, Expression, Noun,
  NORMATIVE_STATUS_CHOICES, DESIGNATION_TYPES,
} from 'models/concepts';

import { AutoSizedTextArea } from '../widgets';
import styles from './styles.scss';


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
  onDomainChange?: (newVal: string) => void
}
export const EntryForm: React.FC<EntryFormProps> = function (props) {

  function openHelpPage(link: string) {
    require('electron').shell.openExternal(link);
  }

  function handleDesignationTypeEdit(idx: number, t: DesignationType) {
    if (!props.onDesignationEdit) { return; }
    props.onDesignationEdit(idx, { ...props.entry.terms[idx], type: t } as Designation);
  }

  function handleDesignationNormativeStatusEdit(idx: number, ns: NormativeStatus) {
    if (!props.onDesignationEdit) { return; }
    props.onDesignationEdit(idx, { ...props.entry.terms[idx], normative_status: ns } as Designation);
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
            active={ns === d.normative_status}
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
                : <>{d.normative_status || '(unspecified)'}</>}
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
                      disabled={!props.onDesignationEdit}
                      onChange={(evt: React.FormEvent<HTMLInputElement>) =>
                        handleExpressionArea(idx, evt.currentTarget.value)}
                      maxLength={5} />

                    <HTMLSelect
                        value={d.partOfSpeech}
                        disabled={!props.onDesignationEdit}
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
                        disabled={!props.onDesignationEdit}
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
            disabled={!props.onDomainChange}
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
