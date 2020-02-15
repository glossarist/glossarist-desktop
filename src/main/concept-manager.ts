//import * as log from 'electron-log';
import { default as Manager } from 'coulomb/db/isogit-yaml/main/manager';

import { MultiLanguageConcept, ConceptCollection } from '../models/concepts';
import { app } from '.';


type ObjectSource =
  { type: 'collection', collectionID: string } |
  { type: 'all' };


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

    if (query.inSource.type === 'all') {
      return ids;
    } else if (query.inSource.type === 'collection') {
      const collection = await collectionManager.read(query.inSource.collectionID);
      const collectionItemIDs = collection.items;
      const idsInCollection = ids.filter(id => collectionItemIDs.includes(id));
      return idsInCollection;
    } else {
      throw new Error("Invalid source in query");
    }
  }
}

export default ConceptManager;