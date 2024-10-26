import Bookmark from '~/models/schemas/Bookmarks.schema'
import databaseService from './database.services'
import { ObjectId, WithId } from 'mongodb'
import { after } from 'lodash'

class BookmarksService {
  async bookmarkTweet(user_id: string, tweet_id: string) {
    const bookmark = await databaseService.bookmarks.findOneAndUpdate(
      { user_id: new ObjectId(user_id), tweet_id: new ObjectId(tweet_id) },
      { $setOnInsert: new Bookmark({ user_id: new ObjectId(user_id), tweet_id: new ObjectId(tweet_id) }) },
      { upsert: true, returnDocument: 'after' }
    )
    return bookmark
  }
}
const bookmarksService = new BookmarksService()
export default bookmarksService
