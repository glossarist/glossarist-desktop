import * as log from 'electron-log';
import { default as Manager } from 'coulomb/db/isogit-yaml/main/manager';

import { SupportedLanguages, Concept } from '../models/concepts';
import { Review } from 'models/reviews';
import { Revision, WithRevisions } from 'models/concepts';
import { app, conf } from '.';
import { listen } from 'coulomb/ipc/main';


interface ReviewManagerQuery {
  completed?: boolean
  objectType?: string
  objectIDs?: string[]
  onlyIDs?: string[] 
}
class ReviewManager
<R extends object>
extends Manager<Review, string, ReviewManagerQuery> {

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

  applyQuery<T extends Record<string, Review> | string[]>
  (query: ReviewManagerQuery, objects: T): T {
    var idx = objects.hasOwnProperty('entries')
      ? null
      : objects as Record<string, Review>;

    var ids: string[] = idx !== null
      ? Object.keys(objects)
      : (objects as string[])

    // Predicates operating on review ID only,
    // streamlined for listIDs()
    if (query.objectType !== undefined) {
      ids = ids.filter(rid => rid.split('-')[0] === query.objectType);
      if (query.objectIDs !== undefined) {
        ids = ids.filter(rid => query.objectIDs!.indexOf(rid.split('-')[1]) >= 0);
      }
    }

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
    if (query.completed !== undefined && idx !== null) {
      for (const rid of Object.keys(idx)) {
        const completed = idx[rid].timeCompleted !== undefined;
        if (completed !== query.completed) {
          delete idx[rid];
          ids = ids.filter(_rid => _rid !== rid);
        }
      }
    }

    return (idx !== null ? idx : ids) as T;
  }

  public async readAll(query?: ReviewManagerQuery) {
    const objs = await super.readAll();
    const result = query !== undefined ? this.applyQuery(query, objs) : objs;
    return result;
  }

  public async listIDs(query?: ReviewManagerQuery) {
    const queryIsEmpty =
      query === undefined ||
      Object.keys(query).length < 1 ||
      Object.values(query).filter(v => v !== undefined).length < 1;

    if (queryIsEmpty) {
      return await super.listIDs();
    }
    let result: string[];
    if (query!.completed !== undefined) {
      result = Object.keys(this.applyQuery(query!, await super.readAll()));
    } else {
      result = this.applyQuery(query!, await super.listIDs());
    }
    return result;
  }

  public async getRevision(
      objectType: keyof typeof conf.managers,
      objectID: string,
      revisionID: string): Promise<Revision<R>> {
    const obj = await this.getEntry(objectType, objectID);
    return obj._revisions.tree[revisionID];
  }

  setUpIPC(modelName: string) {
    super.setUpIPC(modelName);
    const prefix = `model-${modelName}`;

    listen<{ reviewID: string }, { toReview: Revision<R>, revisionID: string }>
    (`${prefix}-get-review-material`, async ({ reviewID }) => {
      const r = await this.read(reviewID);
      const toReview = await this.getRevision(r.objectType, r.objectID, r.revisionID);
      return {
        toReview,
        revisionID: r.revisionID,
      };
    });
  }
}


class ConceptReviewManager extends ReviewManager<Concept<any, any>> {
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

export default ConceptReviewManager;
