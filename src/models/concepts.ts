import { availableLanguages } from '../app';

import { StandardRef, StandardClause } from './standards';
// import { ReviewRef } from './reviews';


export type ConceptRelation =
  { type: string, to: ConceptRef };

export type IncomingConceptRelation =
  { type: string, from: ConceptRef };


export type MultiLanguageConcept<Ref extends ConceptRef> = {
  termid: Ref
  relations?: ConceptRelation[]
  eng: Concept<Ref, AuthoritativeLanguage>
  // English is required, others optional
} & _Concepts<Ref>;


export type _Concepts<Ref extends ConceptRef> = {
  [Lang in keyof OptionalLanguages]?: Concept<Ref, Lang>
}


export interface Concept<Ref extends ConceptRef, Lang extends keyof SupportedLanguages> {
  id: Ref
  language_code: Lang
  entry_status: ConceptStatus

  //subject_field: SubjectFieldLabel

  term: Designation

  // Superfluous in current data schema,
  // which allows only one designation per concept,
  // which would hence be the preferred one.
  // When designations are decoupled from concept,
  // there may be preferred and non-preferred designations.
  //is_preferred: boolean

  definition: Definition
  notes: Note[]
  examples: Example[]

  // These apply to the definition.
  authoritative_source: AuthoritativeSource

  //lineage_source: LineageSource

  // Date concept was first introduced?
  date_accepted?: Date

  // ?
  release?: string

  //pending_review: ConceptReview
  //review_history: AcceptedConceptReview[]


  // Deprecated:

  classification?: 'preferred'

  review_date?: Date
  review_status?: string
  review_decision?: 'accepted' | 'rejected'

  lineage_source?: string
  lineage_source_similarity?: number
}

// type ConceptReview = {
//   /* Represents a completed (accepted) review. */
//   review: ReviewRef
//   reviewer_notes: string
// }

// type AcceptedConceptReview = ConceptReview & {
//   accepted_version: GitHash
// }

// type LineageSource = {
//   ref: StandardRef
//   similarity: number
// }

export type AuthoritativeSource = {
  ref: StandardRef
  clause: StandardClause
  link: URL
}


export type SubjectFieldLabel = string;

type Designation = string;
// Plain text

type Definition = string;
// Rich text

type Note = string;
// Rich text

type Example = string;
// Rich text

type ConceptStatus = 'retired' | 'valid' | 'superseded' | 'proposed'

export type ConceptRef = number;


// Misc.

export interface ConceptCollection {
  id: string
  // ID is global across all collections,
  // regardless of nesting

  parentID?: string
  label: string
  items: ConceptRef[]
}

// type GitHash = string;

type SupportedLanguages = typeof availableLanguages;

type AuthoritativeLanguage = 'eng';

type OptionalLanguages = Omit<SupportedLanguages, 'eng'>;