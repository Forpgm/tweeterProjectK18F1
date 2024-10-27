//tweets.controllers.ts

import { Request, Response } from 'express'
import { ParamsDictionary } from 'express-serve-static-core'
import { TWEETS_MESSAGES } from '~/constants/messages'
import { TweetRequestBody } from '~/models/requests/Tweet.requests'
import { TokenPayload } from '~/models/requests/User.request'
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
  return res.json({
    message: TWEETS_MESSAGES.GET_TWEET_SUCCESSFULLY,
    result: 'oke'
  })
}
