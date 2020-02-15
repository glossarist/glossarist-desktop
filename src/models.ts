type RichText = string

type PlainText = string

type StandardRef = string

type StandardClause = string

type URL = string

type PerLanguage<Type> = {
  [langId: string]: Type,
}

type ConceptStatus = 'retired' | 'valid'

type Review = {
  decision: 'accepted' | 'rejected'
  timestamp: Date
  notes: PlainText
  event: PlainText
}

type Change<Type> = {
  timestamp: Date
  payload: Partial<Type>
  review?: Review
}

export type Concept = {
  id: number
  // Concept ID / ``termid``

  definition: PerLanguage<RichText>
  status: ConceptStatus
  changes: Change<Concept>[]
}

type AuthoritativeSource = {
  ref: StandardRef
  clause: StandardClause
  link: URL
}

export type Designation<C extends Concept> = {
  concept: C
  language: keyof C["definition"]
  expression: PlainText
  preferred: boolean
  authoritative_source: AuthoritativeSource
}
