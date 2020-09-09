import { AnyIDType } from '@riboseinc/coulomb/db/models';
import { Revision } from './revisions';


/* Generic */


export type RevisionInCR<T> = Omit<Revision<T>, 'changeRequestID' | 'author'> & {
  createdObjectID?: AnyIDType
  createdRevisionID?: string
};


interface _ChangeRequest<SubmitterMeta extends object, RegistryMeta extends { stage: string }> {
  id: string
  /* 6 hexadecimal characters */

  revisions: {
    [objectType: string]: {
      [objectID: string]: RevisionInCR<any>
    }
  }
  /* Changes contained in this CR.
     Must not change once stage is past Draft.
     Object ID must uniquely */

  reviewerNotes?: string

  timeCreated: Date
  timeSubmitted?: Date // Submitted CRs cannot be edited
  timeResolved?: Date // Submitted CRs cannot be reviewed or edited

  author: {
    name: string
    email: string
  }

  meta: {
    submitter: SubmitterMeta
    registry: RegistryMeta
  }
}


/* Specific */

export type LCStageInPreparation = 'Draft';
export type LCStageInReview = 'Proposal' | 'Evaluation' | 'Validation' | 'Extended procedure';
export type LCStageArchived = 'Resolved' | 'Withdrawn' | 'Rejected';
export type LCStage = LCStageInPreparation | LCStageInReview | LCStageArchived | 'Test';

export const LIFECYCLE_STAGES_IN_PREPARATION: readonly LCStageInPreparation[] = [
  'Draft',
] as const;

export const LIFECYCLE_STAGES_IN_REVIEW: readonly LCStageInReview[] = [
  'Proposal',
  'Evaluation',
  'Validation',
  'Extended procedure',
] as const;

export const LIFECYCLE_STAGES_SUCCESS: readonly LCStageArchived[] = [
  'Resolved',
] as const;

export const LIFECYCLE_STAGES_ARCHIVED: readonly LCStageArchived[] = [
  'Resolved',
  'Withdrawn',
  'Rejected',
] as const;

export const LIFECYCLE_STAGES: readonly LCStage[] = [
  'Proposal',
  'Evaluation',
  'Validation',
  'Rejected',
  'Withdrawn',
  'Resolved',
  'Extended procedure',
  'Test',
  'Draft',
] as const;

export interface RegistryMeta {
  stage: typeof LIFECYCLE_STAGES[number]
}

export interface SubmitterMeta {
  primaryPerson: {
    name: string
    affiliation: string
    email: string
  }
}

export interface ChangeRequest extends _ChangeRequest<SubmitterMeta, RegistryMeta> {}
