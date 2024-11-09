//tweets.controllers.ts

import { Request, Response } from 'express'
import { ParamsDictionary } from 'express-serve-static-core'
import { TWEETS_MESSAGES } from '~/constants/messages'
import { TweetRequestBody } from '~/models/requests/Tweet.requests'
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
  const result = await tweetsServices.increaseView(req.params.tweet_id, req.decoded_authorization?.user_id)
  const TweetAfterIncreaseView = await databaseService.tweets.findOne({ _id: req.tweet!._id })
  const tweet = {
    ...req.tweet,
    guest_views: TweetAfterIncreaseView!.guest_views,
    user_views: TweetAfterIncreaseView!.user_views
  }

  return res.json({
    message: TWEETS_MESSAGES.GET_TWEET_SUCCESSFULLY,
    result: tweet
  })
}
