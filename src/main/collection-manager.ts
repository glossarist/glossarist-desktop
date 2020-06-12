import { default as Manager } from 'coulomb/db/isogit-yaml/main/manager';

import { ConceptCollection, ConceptRef } from '../models/concepts';
import { listen } from 'coulomb/ipc/main';


class CollectionManager
extends Manager<ConceptCollection, string, { onlyIDs?: string[] }> {
  setUpIPC(modelName: string) {
    super.setUpIPC(modelName);
    const prefix = `model-${modelName}`;

    listen<{ objID: string, ids: ConceptRef[] }, { success: true }>
    (`${prefix}-add-items`, async ({ objID, ids }) => {
      const collection = await this.read(objID);
      const newIDs = new Set([ ...collection.items, ...ids ]);
      await this.update(
        objID,
        { ...collection, items: [ ...newIDs ] },
        `Add items to ${collection.label}`);
      return { success: true };
    });

    listen<{ objID: string, ids: ConceptRef[] }, { success: true }>
    (`${prefix}-remove-items`, async ({ objID, ids }) => {
      const collection = await this.read(objID);
      var newIDs = new Set(collection.items);
      for (const id of ids) {
        newIDs.delete(id);
      }
      await this.update(
        objID,
        { ...collection, items: [ ...newIDs ] },
        `Remove items from ${collection.label}`);
      return { success: true };
    });
  }
}

export default CollectionManager;
