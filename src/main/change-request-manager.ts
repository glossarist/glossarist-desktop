import * as crypto from 'crypto';
import * as log from 'electron-log';
import { default as Manager } from '@riboseinc/coulomb/db/isogit-yaml/main/manager';
import { listen } from '@riboseinc/coulomb/ipc/main';

import { SupportedLanguages, Concept, LifecycleStage } from '../models/concepts';
import { Revision, WithRevisions } from 'models/revisions';
import { app, conf } from '.';
import { ChangeRequest, LIFECYCLE_STAGES_IN_REVIEW, LIFECYCLE_STAGES_ARCHIVED, RevisionInCR } from 'models/change-requests';
import { AnyIDType } from '@riboseinc/coulomb/db/models';


interface ChangeRequestManagerQuery {
  submitted?: boolean
  resolved?: boolean
  creatorEmail?: string
  onlyIDs?: string[]
}
class ChangeRequestManager
<R extends object>
extends Manager<WithRevisions<ChangeRequest>, string, ChangeRequestManagerQuery> {

  public async getManager(objectType: keyof typeof conf.managers): Promise<Manager<any, any>> {
    return (await app).managers[objectType] as Manager<any, any>;
  }

  public async getEntry(
      objectType: keyof typeof conf.managers,
      objectID: string): Promise<WithRevisions<R>> {
    const mgr = await this.getManager(objectType);
    const obj = await mgr.read(objectID) as WithRevisions<R>;

    if (!obj._revisions) {
      log.error("Entry format is not under revision management", objectType, objectID);
      throw new Error("Entry format is not under revision management")
    }
    return obj;
  }

  applyQuery<T extends Record<string, WithRevisions<ChangeRequest>> | string[]>
  (query: ChangeRequestManagerQuery, objects: T): T {
    var idx = objects.hasOwnProperty('entries')
      ? null
      : objects as Record<string, WithRevisions<ChangeRequest>>;

    var ids: string[] = idx !== null
      ? Object.keys(objects)
      : (objects as string[])


    // Predicates operating on review ID only,
    // streamlined for listIDs()

    if (query.onlyIDs !== undefined) {
      ids = ids.filter((rid) => query.onlyIDs!.indexOf(rid) >= 0);
    }

    if (idx !== null) {
      for (const key of Object.keys(idx)) {
        if (ids.indexOf(key) < 0) {
          delete idx[key];
        }
      }
    }


    // Predicates operating on whole objects,
    // not applied if full index is not given

    if (idx !== null) {
      if (query.creatorEmail !== undefined) {
        for (const rid of Object.keys(idx)) {
          if (idx[rid].author.email !== query.creatorEmail) {
            delete idx[rid];
            ids = ids.filter(_rid => _rid !== rid);
          }
        }
      }

      if (query.resolved !== undefined) {
        for (const rid of Object.keys(idx)) {
          const resolved = idx[rid].timeResolved !== undefined;
          if (resolved !== query.resolved) {
            delete idx[rid];
            ids = ids.filter(_rid => _rid !== rid);
          }
        }
      }

      if (query.submitted !== undefined) {
        for (const rid of Object.keys(idx)) {
          const submitted = idx[rid].timeSubmitted !== undefined;
          if (submitted !== query.submitted) {
            delete idx[rid];
            ids = ids.filter(_rid => _rid !== rid);
          }
        }
      }
    }

    return (idx !== null ? idx : ids) as T;
  }

  public async readAll(query?: ChangeRequestManagerQuery) {
    const objs = await super.readAll();
    const result = query !== undefined ? this.applyQuery(query, objs) : objs;
    return result;
  }

  public async listIDs(query?: ChangeRequestManagerQuery) {
    const queryIsEmpty =
      query === undefined ||
      Object.keys(query).length < 1 ||
      Object.values(query).filter(v => v !== undefined).length < 1;

    if (queryIsEmpty) {
      return await super.listIDs();
    }
    let result: string[];
    if (query!.resolved !== undefined || query!.submitted !== undefined || query!.creatorEmail !== undefined) {
      result = Object.keys(this.applyQuery(query!, await super.readAll()));
    } else {
      result = this.applyQuery(query!, await super.listIDs());
    }
    return result;
  }

  private async initializeChangeRequest(): Promise<WithRevisions<ChangeRequest>> {
    const committerInfo = await this.db.getCurrentCommitterInformation();
    const newCRID = crypto.randomBytes(3).toString('hex');
    const revisionID = crypto.randomBytes(3).toString('hex');

    const creationTS = new Date();

    const crStub: ChangeRequest ={
      id: newCRID,
      author: committerInfo,
      timeCreated: creationTS,
      revisions: {},
      meta: {
        registry: {
          stage: 'Draft',
        },
        submitter: {
          primaryPerson: {
            name: committerInfo.name,
            email: committerInfo.email,
            affiliation: '',
          },
        },
      },
    };

    const crWithRevisions = {
      ...crStub,
      _revisions: {
        current: revisionID,
        tree: {
          [revisionID]: {
            object: crStub,
            parents: [],
            timeCreated: creationTS,
          },
        },
      },
    };

    await this.create(crWithRevisions, true);

    return crWithRevisions;
  }

  setUpIPC(modelName: string) {
    super.setUpIPC(modelName);
    const prefix = `model-${modelName}`;

    listen<{ changeRequestID: string, objectType: string, objectID: string }, { success: true }>
    (`${prefix}-delete-revision`, async ({ changeRequestID, objectType, objectID }) => {
      var cr = await this.read(changeRequestID);

      if (cr.timeSubmitted !== undefined) {
        log.error("CR manager: Trying to delete a revision from an already submitted CR.");
        throw new Error("Tried to delete a revision from an already submitted CR");
      }

      delete cr.revisions[objectType][objectID];

      if (Object.keys(cr.revisions[objectType] || {}).length < 1) {
        delete cr.revisions[objectType];
      }

      if (Object.keys(cr.revisions).length > 0) {
        await this.update(changeRequestID, cr, `Remove ${objectType}/${objectID} from CR ${changeRequestID}`);
      } else {
        // Delete CR draft if it has no more revisions
        await this.delete(changeRequestID, true);
      }

      return { success: true };
    });

    listen<{ changeRequestID: string, newStage: LifecycleStage }, { success: true }>
    (`${prefix}-update-stage`, async ({ changeRequestID, newStage }) => {
      // TODO: Check against possible next stages and current committer email
      var cr = await this.read(changeRequestID);

      if (cr.meta.registry.stage === newStage) {
        return { success: true };
      }

      if (cr.meta.registry.stage === 'Draft' && (LIFECYCLE_STAGES_IN_REVIEW as string[]).indexOf(newStage) >= 0) {
        cr.timeSubmitted = new Date();
      } else if ((LIFECYCLE_STAGES_IN_REVIEW as string[]).indexOf(cr.meta.registry.stage) >= 0 && (LIFECYCLE_STAGES_ARCHIVED as string[]).indexOf(newStage) >= 0) {
        cr.timeResolved = new Date();
      }

      cr.meta.registry.stage = newStage;

      await this.update(changeRequestID, cr, `Move CR ${changeRequestID} to ${newStage}`);

      return { success: true };
    });

    listen<{ changeRequestID: string, objectType: string, objectID: string, createdObjectID?: AnyIDType, createdRevisionID?: string }, { success: boolean }>
    (`${prefix}-mark-revision-as-accepted`, async ({ changeRequestID, objectType, objectID, createdObjectID, createdRevisionID }) => {
      const cr = await this.read(changeRequestID);
      const revision = cr.revisions[objectType][objectID];

      if (!revision) {
        log.error("Cannot find revision to mark as accepted", changeRequestID, objectType, objectID);
        return { success: false };
      }

      if (revision.parents.length < 1) {
        if (createdObjectID !== undefined) {
          cr.revisions[objectType][objectID].createdObjectID = createdObjectID;
        } else {
          log.error("Cannot mark revision for new item as accepted: missing ID for created item",
            changeRequestID, objectType, objectID, createdObjectID);
          return { success: false };
        }
      } else {
        if (createdRevisionID !== undefined) {
          cr.revisions[objectType][objectID].createdRevisionID = createdRevisionID;
        } else {
          log.error("Cannot mark new revision for existing item as accepted: missing ID for created revision",
            changeRequestID, objectType, objectID, createdRevisionID);
          return { success: false };
        }
      }

      await this.update(
        changeRequestID,
        cr,
        `Mark ${objectType}/${objectID} in CR ${changeRequestID} as accepted, creating ${createdObjectID || createdRevisionID}`)

      return { success: true };
    });

    listen<{ changeRequestID?: string, objectType: string, objectID: string, data: object, parentRevisionID: string | null }, { success: true, crID: string }>
    (`${prefix}-save-revision`, async ({ changeRequestID, objectType, objectID, data, parentRevisionID }) => {
      var cr: WithRevisions<ChangeRequest>;
      let effectiveChangeRequestID: string;

      if (changeRequestID) {
        cr = await this.read(changeRequestID);
        effectiveChangeRequestID = changeRequestID;
      } else {
        cr = await this.initializeChangeRequest();
        effectiveChangeRequestID = cr.id;
      }

      cr.revisions[objectType] = {
        ...cr.revisions[objectType],
        [objectID]: {
          object: data,
          parents: parentRevisionID ? [parentRevisionID] : [],
          timeCreated: new Date(),
        },
      };

      await this.update(
        effectiveChangeRequestID,
        cr,
        `Save ${objectType}/${objectID} in CR ${effectiveChangeRequestID}`);

      return { success: true, crID: effectiveChangeRequestID };
    });

    listen<{ changeRequestID: string | null }, { [objectType: string]: { [objectID: string]: Revision<any> } }>
    (`${prefix}-list-revisions`, async ({ changeRequestID }) => {
      if (changeRequestID === null) {
        return {};
      }
      var cr = await this.read(changeRequestID);
      return cr.revisions;
    });

    // TODO: toReview is confusing, change to revision (get-revision)
    listen<{ changeRequestID: string | null, objectType: string, objectID: string | null }, { toReview?: RevisionInCR<R> }>
    (`${prefix}-read-revision`, async ({ changeRequestID, objectType, objectID }) => {
      if (changeRequestID === null || objectID === null) {
        return {};
      }
      const cr = await this.read(changeRequestID);
      const toReview = (cr.revisions[objectType] || {})[objectID] || undefined;
      return {
        toReview,
      };
    });
  }
}


class ConceptChangeRequestManager extends ChangeRequestManager<Concept<any, any>> {
  public async getEntry(
      objectType: keyof typeof conf.managers,
      objectID: string): Promise<WithRevisions<Concept<any, any>>> {
    const mgr = await this.getManager(objectType);
    const idParts = objectID.split('_');
    const conceptID = parseInt(idParts[0], 10);
    const langCode = idParts[1] as keyof SupportedLanguages;
    const concept = await mgr.read(conceptID);
    const localized = concept[langCode];

    if (localized) {
      return localized;
    } else {
      log.error("Localized entry for concept is not found", objectID);
      throw new Error("Error fetching concept entry for review");
    };
  }
}

export default ConceptChangeRequestManager;

