//import * as yaml from 'js-yaml';
import * as crypto from 'crypto';
import * as log from 'electron-log';
import { default as Manager } from 'coulomb/db/isogit-yaml/main/manager';

import { MultiLanguageConcept, ConceptCollection, ConceptRef, IncomingConceptRelation, Concept, Revision, SupportedLanguages, WithRevisions } from '../models/concepts';
import { ObjectSource } from '../app';
import { app } from '.';
import { listen } from 'coulomb/ipc/main';
import { migrateConcept } from './legacy';
import ConceptReviewManager from './review-manager';


export interface Query {
  // TODO: Make querying more flexible via a tree of predicates.

  onlyIDs?: number[]
  inSource?: ObjectSource 
  matchingText?: string
  localization?: {
    lang: keyof SupportedLanguages
    status: 'missing' | 'possiblyOutdated'
  }
}


class ConceptManager
extends Manager<MultiLanguageConcept<any>, number, Query> {
  protected getDBRef(objID: number) {
    return super.getDBRef(`concept-${objID}`);
  }

  protected getObjID(dbRef: string) {
    const filename = super.getObjID(dbRef) as unknown as string;
    return parseInt(filename.replace('concept-', ''), 10);
  }

  public async saveRevision(objID: number, lang: keyof SupportedLanguages, parentRev: string, data: Concept<any, any>) {
    const concept = await this.read(objID);

    const langEntry: WithRevisions<Concept<any, any>> | undefined = concept[lang];

    if (!langEntry) {
      log.error("Glossarist: Failed to save revision, unable to locate concept language entry", objID, lang);
      throw new Error("Failed to save revision: Unable to read localized concept entry");
    }

    if (!langEntry._revisions?.tree[parentRev]) {
      log.warn("Glossarist: Unable to locate parent revision, auto-filling", objID, lang, parentRev);
      delete langEntry._revisions;
      langEntry._revisions = {
        tree: {
          [parentRev]: {
            object: { ...langEntry } as Concept<any, any>,
            parents: [],
            timeCreated: new Date()
          },
        },
        current: parentRev,
      };
    }

    const newRevisionID = crypto.randomBytes(3).toString('hex');

    const newRevision: Revision<Concept<any, any>> = {
      object: data,
      timeCreated: new Date(),
      parents: [parentRev],
    };

    const newRevisionTree = {
      ...langEntry._revisions.tree,
      [newRevisionID]: newRevision,
    };

    const newEntry: WithRevisions<Concept<any, any>> = {
      ...data,
      _revisions: {
        current: newRevisionID,
        tree: newRevisionTree,
      },
    };

    const newConcept: MultiLanguageConcept<any> = {
      ...concept,
      [lang]: newEntry,
    };

    //log.debug("saving concept1", yaml.dump(newConcept))
    //log.debug("saving concept1", yaml.dump(data))

    await this.update(objID, newConcept, true);

    return newRevisionID;
  }

  public async read(objID: number) {
    const obj = (await super.read(objID)) as MultiLanguageConcept<any>;
    // Possibly legacy data.

    return migrateConcept(obj);
  }

  public async listIDs(query?: Omit<Query, 'matchingText' | 'onlyIDs'>) {
    const ids = await super.listIDs();
    const src = query?.inSource || { type: 'catalog-preset', presetName: 'all' };
    const _app = await app;
    const collectionManager = _app.managers.collections as Manager<ConceptCollection, string>;
    const reviewManager = _app.managers.reviews as ConceptReviewManager;

    if (src) {
      if (src.type === 'catalog-preset') {
        if (src.presetName === 'pendingReview') {
          const reviewIDs = await reviewManager.listIDs({ completed: false });
          const conceptIDs = reviewIDs.
            filter(rid => rid.startsWith('concepts-')).
            map(crid => parseInt(crid.replace('concepts-', '').split('_')[0], 10));
          return ids.filter(cid => conceptIDs.indexOf(cid) >= 0);
        }
      } else if (src.type === 'collection') {
        const collection = await collectionManager.read(src.collectionID);
        const collectionItemIDs = collection.items;
        const idsInCollection = ids.filter(id => collectionItemIDs.includes(id));
        return idsInCollection;
      } else {
        log.error("Glossarist: Invalid concept source", src);
        throw new Error("Invalid source in query");
      }
    }

    return ids;
  }

  public async findIncomingRelations(ref: ConceptRef | null):
  Promise<IncomingConceptRelation[]> {
    if (ref === null) { return []; }

    const all = await this.readAll();

    const incomingRelations = Object.values(all).
      filter(c => (c.relations || []).find(r => r.to === ref) !== undefined).
      map(c => (c.relations || []).map(r => ({ type: r.type, from: c.termid }))).
      flat().
      filter(function (item, idx, self) {
        // Deduplicate
        return idx === self.findIndex(i => i.from === item.from);
      });

    return incomingRelations;
  }

  public async readAll(query?: Query) {
    const ids = await this.listIDs(query);
    var objects = (await super.readAll({ onlyIDs: ids }));

    // Async migration
    //objects = (await Promise.all(
    //  Object.values(objects).map(async (c) => await this.migrate(c))
    //)).reduce((objs, obj) => ({ ...objs, [obj.termid]: obj }), {});

    objects = Object.values(objects).
    map(migrateConcept).
    reduce((objs, obj) => ({ ...objs, [obj.termid]: obj }), {});

    const textQuery = (query?.matchingText || '').trim();

    if (textQuery !== '') {
      objects = Object.values(objects).
      filter(conceptMatchesQuery(textQuery)).
      reduce((objs: object, obj: MultiLanguageConcept<any>) => ({ ...objs, [obj.termid]: obj }), {});
    }

    if (query?.localization) {
      const lang = query.localization.lang;
      const status = query.localization.status;

      if (status === 'missing') {
        objects = Object.values(objects).
        filter((c) => c[lang] === undefined).
        reduce((objs: object, obj: MultiLanguageConcept<any>) => ({ ...objs, [obj.termid]: obj }), {});
      }
    }

    return objects;
  }

  setUpIPC(modelName: string) {
    super.setUpIPC(modelName);
    const prefix = `model-${modelName}`;

    listen<{ objID: ConceptRef }, { relations: IncomingConceptRelation[] }>
    (`${prefix}-find-incoming-relations`, async ({ objID }) => {
      return { relations: await this.findIncomingRelations(objID) };
    });

    listen<{ objID: ConceptRef, data: Concept<any, any>, lang: keyof SupportedLanguages, parentRevision: string }, { newRevisionID: string }>
    (`${prefix}-create-revision`, async ({ objID, lang, parentRevision, data }) => {
      const newRevisionID = await this.saveRevision(objID, lang, parentRevision, data);
      return { newRevisionID };
    });
  }
}

function conceptMatchesQuery(_q: string): (c: MultiLanguageConcept<any>) => boolean {
  const q = _q.toLowerCase();
  return (c) => {
    // TODO: Search across all localized entries

    if (!c.eng) {
      log.error("Glossarist: Concept is missing authoritative language entry", c);
      return false;
    }

    const matchesDesignation: boolean = c.eng.terms.
      filter(t => t.designation.toLowerCase().indexOf(q) >= 0).
      length > 0;

    return matchesDesignation ||
      (c.eng.definition || '').toLowerCase().indexOf(q) >= 0 ||
      `${c.termid}`.indexOf(q) >= 0;
  }
}

export default ConceptManager;