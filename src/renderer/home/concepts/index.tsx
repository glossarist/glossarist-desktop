import { EntryEdit } from './entry-edit';
import { EntryDetails } from './entry-details';
import { LazyConceptItem } from './item';
import { ConceptList } from './list';

export { EntryDetails, EntryEdit, LazyConceptItem, ConceptList };

export function refToString(ref: number): string {
  const asString = `${ref}`;
  if (asString.length === 7) {
    return `${asString.slice(0, 3)}-${asString.slice(3, 5)}-${asString.slice(5, 7)}`;
  }
  return asString;
}