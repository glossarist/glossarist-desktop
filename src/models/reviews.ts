import { StandardRef } from './standards';


export interface Review {
  id: ReviewRef

  initiation: {
    timestamp: Date
  }
}

export interface CompletedReview extends Review {
  completion: {
    timestamp: Date
    event: StandardPublicationEvent | NormalISOProcessingEvent
  }
}

type StandardPublicationEvent = {
  name: 'Publication of standard'
  ref: StandardRef
}

type NormalISOProcessingEvent = {
  name: 'Normal ISO processing'
}

export type ReviewRef = number