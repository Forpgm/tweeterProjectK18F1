import { TweetRequestBody } from '~/models/requests/Tweet.requests'
import databaseService from './database.services'
import Tweet from '~/models/schemas/Tweet.schema'
import { ModifyResult, ObjectId, WithId } from 'mongodb'
import Hashtag from '~/models/schemas/Hashtag.schema'
import { TweetType } from '~/constants/enums'
import usersService from './users.services'
import { T } from '@faker-js/faker/dist/airline-BLb3y-7w'

class TweetsServices {
  async checkAndCreateHashtags(hashtags: string[]) {
    const hashtagDocuments = await Promise.all(
      hashtags.map(async (hashtag) => {
        const found = await databaseService.hashtags.findOne({ value: hashtag })
        if (found) {
          return found._id
        } else {
          const newHashtag = await databaseService.hashtags.insertOne(new Hashtag({ name: hashtag }))
          return newHashtag.insertedId
        }
      })
    )
    return hashtagDocuments
  }

  async createTweet(user_id: string, body: TweetRequestBody) {
    const hashtags = await this.checkAndCreateHashtags(body.hashtags)

    const result = await databaseService.tweets.insertOne(
      new Tweet({
        audience: body.audience,
        content: body.content,
        hashtags,
        mentions: body.mentions,
        medias: body.medias,
        parent_id: body.parent_id,
        type: body.type,
        user_id: new ObjectId(user_id)
      })
    )
    const tweet = await databaseService.tweets.findOne({ _id: result.insertedId })
    return tweet
  }
  async increaseView(tweet_id: string, user_id?: string) {
    const inc = user_id ? { user_views: 1 } : { guest_views: 1 }
    const result = await databaseService.tweets.findOneAndUpdate(
      { _id: new ObjectId(tweet_id) },
      {
        $inc: inc,
        $currentDate: { updated_at: true }
      },

      {
        returnDocument: 'after',
        projection: {
          user_views: 1,
          guest_views: 1,
          updated_at: 1
        }
      }
    )
    return result
  }
  async getTweetChildren(tweet_id: string, limit: number, page: number, tweet_type: TweetType, user_id?: string) {
    const tweets = await databaseService.tweets
      .aggregate<Tweet>([
        {
          $match: {
            parent_id: new ObjectId(tweet_id),
            type: tweet_type
          }
        },
        {
          $lookup: {
            from: 'hashtags',
            localField: 'hashtags',
            foreignField: '_id',
            as: 'hashtags'
          }
        },
        {
          $lookup: {
            from: 'users',
            localField: 'mentions',
            foreignField: '_id',
            as: 'mentions'
          }
        },
        {
          $addFields: {
            mentions: {
              $map: {
                input: '$mentions',
                as: 'mention',
                in: {
                  _id: '$$mention._id',
                  name: '$$mention.name',
                  username: '$$mention.username',
                  email: '$$mention.email'
                }
              }
            }
          }
        },
        {
          $lookup: {
            from: 'bookmarks',
            localField: '_id',
            foreignField: 'tweet_id',
            as: 'bookmarks'
          }
        },
        {
          $lookup: {
            from: 'likes',
            localField: '_id',
            foreignField: 'tweet_id',
            as: 'likes'
          }
        },
        {
          $lookup: {
            from: 'tweets',
            localField: '_id',
            foreignField: 'parent_id',
            as: 'tweet_children'
          }
        },
        {
          $addFields: {
            bookmarks: {
              $size: '$bookmarks'
            },
            likes: {
              $size: '$likes'
            },
            retweet_count: {
              $size: {
                $filter: {
                  input: '$tweet_children',
                  as: 'item',
                  cond: {
                    $eq: ['$$item.type', TweetType.Retweet]
                  }
                }
              }
            },
            comment_count: {
              $size: {
                $filter: {
                  input: '$tweet_children',
                  as: 'item',
                  cond: {
                    $eq: ['$$item.type', TweetType.Comment]
                  }
                }
              }
            },
            quote_count: {
              $size: {
                $filter: {
                  input: '$tweet_children',
                  as: 'item',
                  cond: {
                    $eq: ['$$item.type', TweetType.QuoteTweet]
                  }
                }
              }
            }
          }
        },
        {
          $project: {
            tweet_children: 0
          }
        },
        {
          $skip: limit * (page - 1) // Công thức phân trang
        },
        {
          $limit: limit
        }
      ])
      .toArray()
    const ids = tweets.map((tweet) => tweet._id as ObjectId)
    const date = new Date()
    const inc = user_id ? { user_views: 1 } : { guest_views: 1 }
    const [, total] = await Promise.all([
      databaseService.tweets.updateMany(
        {
          _id: {
            $in: ids
          }
        },
        {
          $inc: inc,
          $set: { updated_at: date }
        }
      ),
      await databaseService.tweets.countDocuments({
        parent_id: new ObjectId(tweet_id),
        type: tweet_type
      }),
      tweets.forEach((tweet) => {
        tweet.updated_at = date
        if (user_id) {
          tweet.user_views += 1
        } else {
          tweet.guest_views += 1
        }
      })
    ])
    return {
      total,
      tweets
    }
  }
  async getNewFeeds(user_id: string, limit: number, page: number) {
    const followers = await usersService.getFollowers(user_id)
    const newfeeds = await databaseService.tweets
      .aggregate([
        {
          $match: {
            user_id: {
              $in: followers
            }
          }
        },
        {
          $lookup: {
            from: 'users',
            localField: 'user_id',
            foreignField: '_id',
            as: 'user'
          }
        },
        { $unwind: { path: '$user' } },
        {
          $match: {
            $or: [
              { audience: 0 },
              {
                $and: [
                  { audience: 1 },
                  {
                    'user.twitter_circle': {
                      $in: [new ObjectId(user_id)]
                    }
                  }
                ]
              }
            ]
          }
        },
        {
          $skip: limit * (page - 1) // Công thức phân trang
        },
        {
          $limit: limit
        },
        {
          $lookup: {
            from: 'hashtags',
            localField: 'hashtags',
            foreignField: '_id',
            as: 'hashtags'
          }
        },
        {
          $lookup: {
            from: 'users',
            localField: 'mentions',
            foreignField: '_id',
            as: 'mentions'
          }
        },
        {
          $addFields: {
            mentions: {
              $map: {
                input: '$mentions',
                as: 'mention',
                in: {
                  _id: '$$mention._id',
                  name: '$$mention.name',
                  username: '$$mention.username',
                  email: '$$mention.email'
                }
              }
            }
          }
        },
        {
          $lookup: {
            from: 'bookmarks',
            localField: '_id',
            foreignField: 'tweet_id',
            as: 'bookmarks'
          }
        },
        {
          $lookup: {
            from: 'likes',
            localField: '_id',
            foreignField: 'tweet_id',
            as: 'likes'
          }
        },
        {
          $lookup: {
            from: 'tweets',
            localField: '_id',
            foreignField: 'parent_id',
            as: 'tweet_children'
          }
        },
        {
          $addFields: {
            bookmarks: { $size: '$bookmarks' },
            likes: { $size: '$likes' },
            retweet_count: {
              $size: {
                $filter: {
                  input: '$tweet_children',
                  as: 'item',
                  cond: { $eq: ['$$item.type', TweetType.Retweet] }
                }
              }
            },
            comment_count: {
              $size: {
                $filter: {
                  input: '$tweet_children',
                  as: 'item',
                  cond: { $eq: ['$$item.type', TweetType.Comment] }
                }
              }
            },
            quote_count: {
              $size: {
                $filter: {
                  input: '$tweet_children',
                  as: 'item',
                  cond: { $eq: ['$$item.type', TweetType.QuoteTweet] }
                }
              }
            }
          }
        },
        {
          $project: {
            tweet_children: 0,
            user: {
              password: 0,
              email_verify_token: 0,
              forgot_password_token: 0,
              twitter_circle: 0,
              date_of_birth: 0
            }
          }
        }
      ])
      .toArray()
    const tweetIds = newfeeds.map((tweet) => tweet._id as ObjectId)
    const date = new Date()
    const [, total] = await Promise.all([
      databaseService.tweets.updateMany(
        {
          _id: {
            $in: tweetIds
          }
        },
        {
          $inc: { user_views: 1 },
          $set: { updated_at: date }
        }
      ),
      await databaseService.tweets
        .aggregate([
          {
            $match: {
              user_id: {
                $in: followers
              }
            }
          },
          {
            $lookup: {
              from: 'users',
              localField: 'user_id',
              foreignField: '_id',
              as: 'user'
            }
          },
          { $unwind: { path: '$user' } },
          {
            $match: {
              $or: [
                { audience: 0 },
                {
                  $and: [
                    { audience: 1 },
                    {
                      'user.twitter_circle': {
                        $in: [new ObjectId(user_id)]
                      }
                    }
                  ]
                }
              ]
            }
          },
          {
            $count: 'total'
          }
        ])
        .toArray()
    ])
    newfeeds.forEach((tweet) => {
      tweet.updated_at = date
      tweet.user_views += 1
    })
    return {
      total: total[0].total,
      tweets: newfeeds
    }
  }
}
const tweetsServices = new TweetsServices()
export default tweetsServices
