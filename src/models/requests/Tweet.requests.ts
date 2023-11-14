import { TweetAudience, TweetType } from '~/constants/enums'
import { Media } from '../Other'

//dinh nghia nguoi dung truyen len cai gi de tao tweet
export interface TweetRequestBody {
  type: TweetType
  audience: TweetAudience
  content: string
  parent_id: null | string
  hashtags: string[] //khong dung objectID, vi nguoi dung chi truyen duoc string
  mentions: string[]
  medias: Media[]
}
