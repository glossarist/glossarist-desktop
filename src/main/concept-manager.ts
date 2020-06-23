import * as log from 'electron-log';
import { default as Manager } from 'coulomb/db/isogit-yaml/main/manager';

import {
  MultiLanguageConcept, ConceptCollection, ConceptRef, IncomingConceptRelation,
  Concept, SupportedLanguages,
} from '../models/concepts';

import { Revision, WithRevisions, getNewRevisionID } from 'models/revisions'

import { ObjectSource, defaultLanguage } from '../app';
import { app } from '.';
import { listen } from 'coulomb/ipc/main';
import { migrateConcept } from './legacy';


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

  async init() {
    await super.init();

    // Async migration
    //objects = (await Promise.all(
    //  Object.values(objects).map(async (c) => await this.migrate(c))
    //)).reduce((objs, obj) => ({ ...objs, [obj.termid]: obj }), {});

    log.debug("ConceptManager: Migration start");

    const objs = await this.readAll();

    log.debug("ConceptManager: Read source data");

    const migratedObjects = Object.values(objs).
    map(migrateConcept);

    const migratedObjectIDs: number[] = migratedObjects.
    filter(([_, didMigrate]) => {
      return didMigrate;
    }).
    map(([object, _]) => {
      return object.termid;
    });

    for (const [obj, didMigrate] of migratedObjects) {
      if (didMigrate) {
        await this.rawUpdate(obj.termid, obj);
      }
    }

    log.debug("ConceptManager: Migration: IDs affected by migration", migratedObjectIDs);

    if (migratedObjectIDs.length > 0) {
      await this.db.commitAll("Bulk migration", false);
    }
  }

  protected getObjID(dbRef: string) {
    const filename = super.getObjID(dbRef) as unknown as string;
    return parseInt(filename.replace('concept-', ''), 10);
  }

  public async saveRevision(objID: number, lang: keyof SupportedLanguages, parentRev: string | null, data: Concept<any, any>, changeRequestID: string | undefined) {
    const authorInfo = await this.db.getCurrentCommitterInformation();
    const concept = await this.read(objID);

    const langEntry: WithRevisions<Concept<any, any>> | undefined = concept[lang];

    if (parentRev !== null && !langEntry) {
      log.error("Glossarist: Failed to save revision, unable to locate concept language entry", objID, lang);
      throw new Error("Failed to save revision: Unable to read localized concept entry");
    }

    if (parentRev === null && langEntry) {
      log.error("Glossarist: Failed to save revision, language entry already exists but no parent revision was given", objID, lang);
      throw new Error("Failed to save revision: Language entry already exists but no parent revision was given");
    }

    if (parentRev !== null && !langEntry?._revisions?.tree[parentRev]) {
      log.error("Glossarist: Unable to locate parent revision", objID, lang, parentRev);
      throw new Error("Failed to save revision: Unable to locate parent revision");
      //delete langEntry._revisions;
      //langEntry._revisions = {
      //  tree: {
      //    [parentRev]: {
      //      object: { ...langEntry } as Concept<any, any>,
      //      parents: [],
      //      timeCreated: new Date(),
      //    },
      //  },
      //  current: parentRev,
      //};
    }

    const newRevisionID: string = getNewRevisionID();

    var newRevision: Revision<Concept<any, any>> = {
      object: data,
      timeCreated: new Date(),
      parents: parentRev ? [parentRev] : [],
      author: authorInfo,
    };

    if (changeRequestID) {
      newRevision.changeRequestID = changeRequestID;
    }

    const newRevisionTree = {
      ...(langEntry?._revisions.tree || {}),
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

    await this.update(objID, newConcept, true);

    return newRevisionID;
  }

  public async listIDs(query?: Omit<Query, 'matchingText' | 'onlyIDs'>) {
    const ids = await super.listIDs();

    if (query === undefined) {
      return ids;
    }

    const src = query?.inSource || { type: 'catalog-preset', presetName: 'all' };

    let collectionManager: Manager<ConceptCollection, string> | null;

    try {
      const _app = await app;
      collectionManager = _app.managers.collections as Manager<ConceptCollection, string>;
    } catch (e) {
      collectionManager = null;
    }

    if (src) {
      if (src.type === 'catalog-preset') {
      } else if (src.type === 'collection' && collectionManager !== null) {
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

    if (query === undefined) {
      return objects;
    }

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

      } else if (status === 'possiblyOutdated') {
        // Return only concepts for which latest revision in authoritative language
        // comes before latest revision in selected translated language.
        objects = Object.values(objects).
        filter((c) => {
          const authoritative = c[defaultLanguage];
          if (!authoritative) {
            return false;
          }
          const localized = c[lang];
          if (!localized) {
            return false;
          }
          const latestAuthRevisionTime = authoritative._revisions.tree[authoritative._revisions.current]?.timeCreated;
          const latestLocalizedRevisionTime = localized._revisions.tree[localized._revisions.current]?.timeCreated;
          if (!latestAuthRevisionTime || !latestLocalizedRevisionTime) {
            return false;
          }
          return latestAuthRevisionTime > latestLocalizedRevisionTime;
        }).
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

    listen<{ objID: ConceptRef, data: Concept<any, any>, lang: keyof SupportedLanguages, parentRevision: string | null, changeRequestID?: string }, { newRevisionID: string }>
    (`${prefix}-create-revision`, async ({ objID, lang, parentRevision, data, changeRequestID }) => {
      const newRevisionID = await this.saveRevision(objID, lang, parentRevision, data, changeRequestID);
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