import { LikeTweetReqBody } from '~/models/requests/Like.requests'
import { TokenPayload } from '~/models/requests/User.request'
import { Request, Response } from 'express'
import { ParamsDictionary } from 'express-serve-static-core'
import likeService from '~/services/likes.services'
import { TWEETS_MESSAGES } from '~/constants/messages'

export const likeTweetController = async (req: Request<ParamsDictionary, any, LikeTweetReqBody>, res: Response) => {
  const { user_id } = req.decoded_authorization as TokenPayload
  const { tweet_id } = req.params
  const result = await likeService.likeTweet(user_id, tweet_id)
  return res.json({
    message: TWEETS_MESSAGES.LIKE_TWEET_SUCCESSFULLY,
    result
  })
}
export const unlikeTweetController = async (req: Request<ParamsDictionary, any, LikeTweetReqBody>, res: Response) => {
  const { user_id } = req.decoded_authorization as TokenPayload
  const { tweet_id } = req.params
  const result = await likeService.unlikeTweet(user_id, tweet_id)
  return res.json({
    message: TWEETS_MESSAGES.UNLIKE_TWEET_SUCCESSFULLY,
    result
  })
}
