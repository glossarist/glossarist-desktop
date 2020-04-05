import * as log from 'electron-log';
import { default as Manager } from 'coulomb/db/isogit-yaml/main/manager';

import { MultiLanguageConcept, ConceptCollection, ConceptRef, IncomingConceptRelation } from '../models/concepts';
import { ObjectSource } from '../app';
import { app } from '.';
import { listen } from 'coulomb/ipc/main';
import { migrateConcept } from './legacy';


class ConceptManager
extends Manager<MultiLanguageConcept<any>, number, { onlyIDs?: number[], inSource?: ObjectSource }> {
  protected getDBRef(objID: number) {
    return super.getDBRef(`concept-${objID}`);
  }

  protected getObjID(dbRef: string) {
    const filename = super.getObjID(dbRef) as unknown as string;
    return parseInt(filename.replace('concept-', ''), 10);
  }

  public async read(objID: number) {
    const obj = (await super.read(objID)) as MultiLanguageConcept<any>;
    // Possibly legacy data.

    return migrateConcept(obj);
  }

  public async listIDs(query?: { inSource: ObjectSource }) {
    const collectionManager = (await app).managers.collections as Manager<ConceptCollection, string>;
    const ids = await super.listIDs();
    const src = query?.inSource;

    if (src) {
      if (src.type === 'catalog-preset' && src.presetName === 'all') {
        return ids;
      } else if (src.type === 'collection') {
        const collection = await collectionManager.read(src.collectionID);
        const collectionItemIDs = collection.items;
        const idsInCollection = ids.filter(id => collectionItemIDs.includes(id));
        return idsInCollection;
      } else {
        log.error("Glossarist: Invalid concept source", src);
        throw new Error("Invalid source in query");
      }
    } else {
      return ids;
    }
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

  public async readAll(query?: { inSource: ObjectSource, matchingText?: string }) {
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

    return objects;
  }

  setUpIPC(modelName: string) {
    super.setUpIPC(modelName);
    const prefix = `model-${modelName}`;

    listen<{ objID: ConceptRef }, { relations: IncomingConceptRelation[] }>
    (`${prefix}-find-incoming-relations`, async ({ objID }) => {
      return { relations: await this.findIncomingRelations(objID) };
    });
  }
}

function conceptMatchesQuery(_q: string): (c: MultiLanguageConcept<any>) => boolean {
  const q = _q.toLowerCase();
  return (c) => {
    // TODO: Search across all localized entries

    const matchesDesignation: boolean = c.eng.terms.
      filter(t => t.designation.toLowerCase().indexOf(q) >= 0).
      length > 0;

    return matchesDesignation ||
      (c.eng.definition || '').toLowerCase().indexOf(q) >= 0 ||
      `${c.termid}`.indexOf(q) >= 0;
  }
}

export default ConceptManager;