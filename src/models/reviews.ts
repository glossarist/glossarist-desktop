export interface Review {
  timeRequested: Date

  id: string
  // Based on objectType, objectID and revisionID

  objectType: string
  objectID: string
  revisionID: string

  notes?: string
  metadata?: object

  approved?: boolean
  reviewerName?: string
  timeCompleted?: Date
}
