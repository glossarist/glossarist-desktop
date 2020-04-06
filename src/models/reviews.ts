//import { StandardRef } from './standards';


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


//export interface CompletedReview extends Review {
//  completion: {
//    timestamp: Date
//    event: StandardPublicationEvent | NormalISOProcessingEvent
//  }
//}
//
//type StandardPublicationEvent = {
//  name: 'Publication of standard'
//  ref: StandardRef
//}
//
//type NormalISOProcessingEvent = {
//  name: 'Normal ISO processing'
//}
//
//export type ReviewRef = number