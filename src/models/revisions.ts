import * as crypto from 'crypto';

export const getNewRevisionID = () => crypto.randomBytes(3).toString('hex');

export interface Revision<T> {
  object: T

  parents: string[]
  // parent revision IDs

  timeCreated: Date

  changeRequestID?: string

  author?: {
    name: string
    email: string
  }
}

export type WithRevisions<T> = T & {
  _revisions: {
    current: string
    /* Points to existing revision ID from the tree */

    tree: { [revisionID: string]: Revision<T> }
    /* revision ID is 6 hexadecimal characters */
    /* When new version is saved,
       new revision is created with current object data and current revision ID as parent;
       new revision is assigned a randomly generated ID and added to the tree;
       current revision pointer is updated with that ID. */
  }
}
