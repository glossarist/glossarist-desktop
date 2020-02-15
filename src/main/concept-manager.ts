import * as log from 'electron-log';
import { default as Manager } from 'coulomb/db/isogit-yaml/main/manager';

import { MultiLanguageConcept, ConceptCollection } from '../models/concepts';
import { ObjectSource } from '../app';
import { app } from '.';


class ConceptManager extends Manager<MultiLanguageConcept<any>, number, { inSource: ObjectSource }> {
  protected getDBRef(objID: number) {
    return super.getDBRef(`concept-${objID}`);
  }

  protected getObjID(dbRef: string) {
    const filename = super.getObjID(dbRef) as unknown as string;
    return parseInt(filename.replace('concept-', ''), 10);
  }

  public async listIDs(query: { inSource: ObjectSource }) {
    const collectionManager = (await app).managers.collections as Manager<ConceptCollection, string>;
    const ids = await super.listIDs(query);

    const src = query.inSource;

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
  }
}

export default ConceptManager;