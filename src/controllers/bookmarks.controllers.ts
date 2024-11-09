import { NextFunction, Request, Response } from 'express'
import { ParamsDictionary } from 'express-serve-static-core'

import { BOOKMARKS_MESSAGES, USERS_MESSAGES } from '~/constants/messages'
import { BookmarkTweetReqBody } from '~/models/requests/Bookmark.requests'
import { TokenPayload } from '~/models/requests/User.request'
import bookmarksService from '~/services/bookmarks.services'
export const createBookmarkController = async (
  req: Request<ParamsDictionary, any, BookmarkTweetReqBody>,
  res: Response,
  next: NextFunction
) => {
  const { user_id } = req.decoded_authorization as TokenPayload
  const result = await bookmarksService.bookmarkTweet(user_id, req.body.tweet_id)
  res.json({ message: BOOKMARKS_MESSAGES.CREATED_BOOKMARK_SUCCESSFULLY, result })
}
export const unbookmarkController = async (req: Request, res: Response, next: NextFunction) => {
  const { user_id } = req.decoded_authorization as TokenPayload
  const { id } = req.params
  const result = await bookmarksService.unbookmarkTweet(user_id, id)
  res.json({ message: BOOKMARKS_MESSAGES.UNBOOKMARK_TWEET_SUCCESSFULLY, result })
}
