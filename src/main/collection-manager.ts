import { default as Manager } from '@riboseinc/coulomb/db/isogit-yaml/main/manager';
import { listen } from '@riboseinc/coulomb/ipc/main';

import { app } from '.';
import { ConceptCollection, ConceptRef, MultiLanguageConcept } from '../models/concepts';


class CollectionManager
extends Manager<ConceptCollection, string, { onlyIDs?: string[] }> {
  setUpIPC(modelName: string) {
    super.setUpIPC(modelName);
    const prefix = `model-${modelName}`;

    listen<{ objID: string, ids: ConceptRef[] }, { success: true }>
    (`${prefix}-add-items`, async ({ objID, ids }) => {
      const _app = await app;
      const conceptManager = _app.managers.concepts as Manager<MultiLanguageConcept<any>, string>;

      const collection = await this.read(objID);
      const newIDs = new Set([ ...collection.items, ...ids ]);
      await this.update(
        objID,
        { ...collection, items: [ ...newIDs ] },
        `Add items to ${collection.label}`);

      await conceptManager.reportUpdatedData(ids.map(i => `${i}`));
      return { success: true };
    });

    listen<{ objID: string, ids: ConceptRef[] }, { success: true }>
    (`${prefix}-remove-items`, async ({ objID, ids }) => {
      const _app = await app;
      const conceptManager = _app.managers.concepts as Manager<MultiLanguageConcept<any>, string>;

      const collection = await this.read(objID);
      var newIDs = new Set(collection.items);
      for (const id of ids) {
        newIDs.delete(id);
      }
      await this.update(
        objID,
        { ...collection, items: [ ...newIDs ] },
        `Remove items from ${collection.label}`);

      await conceptManager.reportUpdatedData(ids.map(i => `${i}`));
      return { success: true };
    });
  }
}

export default CollectionManager;
