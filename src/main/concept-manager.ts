import * as log from 'electron-log';
import { default as Manager } from 'coulomb/db/isogit-yaml/main/manager';

import { MultiLanguageConcept, ConceptCollection } from '../models/concepts';
import { ObjectSource } from '../app';
import { app } from '.';


class ConceptManager extends Manager<MultiLanguageConcept<any>, number, { onlyIDs?: number[], inSource?: ObjectSource }> {
  protected getDBRef(objID: number) {
    return super.getDBRef(`concept-${objID}`);
  }

  protected getObjID(dbRef: string) {
    const filename = super.getObjID(dbRef) as unknown as string;
    return parseInt(filename.replace('concept-', ''), 10);
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
        log.error("Glossarist: Invalid concept source", src)
        throw new Error("Invalid source in query");
      }
    } else {
      return ids;
    }
  }

  public async readAll(query?: { inSource: ObjectSource, matchingText?: string }) {
    const ids = await this.listIDs(query);
    var objects = (await super.readAll({ onlyIDs: ids }));
    const textQuery = (query?.matchingText || '').trim();

    if (textQuery !== '') {
      objects = Object.values(objects).
      filter(conceptMatchesQuery(textQuery)).
      reduce((objs: object, obj: MultiLanguageConcept<any>) => ({ ...objs, [obj.termid]: obj }), {});
    }

    return objects;
  }
}

function conceptMatchesQuery(_q: string): (c: MultiLanguageConcept<any>) => boolean {
  const q = _q.toLowerCase();
  return (c) => {
    return (c.eng.term || '').toLowerCase().indexOf(q) >= 0 ||
      (c.eng.definition || '').toLowerCase().indexOf(q) >= 0 ||
      `${c.termid}`.indexOf(q) >= 0;
  }
}

export default ConceptManager;