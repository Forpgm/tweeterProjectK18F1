//tweets.controllers.ts

import { Request, Response } from 'express'
import { ParamsDictionary } from 'express-serve-static-core'
import { update } from 'lodash'
import { TweetType } from '~/constants/enums'
import { TWEETS_MESSAGES } from '~/constants/messages'
import { TweetParam, TweetQuery, TweetRequestBody } from '~/models/requests/Tweet.requests'
import { TokenPayload } from '~/models/requests/User.request'
import databaseService from '~/services/database.services'
import tweetsServices from '~/services/tweets.services'
export const createTweetController = async (req: Request<ParamsDictionary, any, TweetRequestBody>, res: Response) => {
  //muon dang bai thi can co: user_id: biet ai la nguoi dang, body: noi dung bai dang
  const body = req.body as TweetRequestBody
  const { user_id } = req.decoded_authorization as TokenPayload
  //goi ham luu vao db
  const result = await tweetsServices.createTweet(user_id, body)
  return res.json({
    message: TWEETS_MESSAGES.CREATE_TWEET_SUCCESSFULLY,
    result
  })
}
export const getTweetDetailController = async (
  req: Request<ParamsDictionary, any, TweetRequestBody>,
  res: Response
) => {
  const TweetAfterIncreaseView = await databaseService.tweets.findOne({ _id: req.tweet!._id })
  const tweet = {
    ...req.tweet,
    guest_views: TweetAfterIncreaseView!.guest_views,
    user_views: TweetAfterIncreaseView!.user_views,
    updated_at: TweetAfterIncreaseView!.updated_at
  }

  return res.json({
    message: TWEETS_MESSAGES.GET_TWEET_SUCCESSFULLY,
    result: tweet
  })
}
export const getTweetChildrenController = async (req: Request<TweetParam, any, any, TweetQuery>, res: Response) => {
  const tweet_type = Number(req.query.tweet_type as string) as TweetType
  const limit = Number(req.query.limit as string)
  const page = Number(req.query.page as string)
  const { user_id } = req.decoded_authorization as TokenPayload
  const { tweet_id } = req.params
  const { total, tweets } = await tweetsServices.getTweetChildren(tweet_id, limit, page, tweet_type, user_id)
  return res.json({
    message: TWEETS_MESSAGES.GET_TWEET_CHILDREN_SUCCESSFULLY,
    result: {
      total,
      tweets
    }
  })
}
