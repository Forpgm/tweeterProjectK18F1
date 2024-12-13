import { Request, Response, NextFunction } from 'express'
import { checkSchema } from 'express-validator'
import { isEmpty } from 'lodash'
import { ObjectId } from 'mongodb'
import { MediaType, TweetAudience, TweetType, UserVerifyStatus } from '~/constants/enums'
import HTTP_STATUS from '~/constants/httpStatus'
import { TWEETS_MESSAGES, USERS_MESSAGES } from '~/constants/messages'
import { ErrorWithStatus } from '~/models/Errors'
import { TokenPayload } from '~/models/requests/User.request'
import Tweet from '~/models/schemas/Tweet.schema'
import databaseService from '~/services/database.services'
import { numberEnumToArray } from '~/utils/common'
import { wrapAsync } from '~/utils/handlers'
import { validate } from '~/utils/validation'

const tweetTypes = numberEnumToArray(TweetType) //[0,1,2,3]
const tweetAudiences = numberEnumToArray(TweetAudience) //[0,1]
const mediaTypes = numberEnumToArray(MediaType) //[0,1]

export const createTweetValidator = validate(
  checkSchema(
    {
      type: {
        isIn: {
          options: [tweetTypes], // [0,1,2,3]
          errorMessage: TWEETS_MESSAGES.INVALID_TYPE
        }
      },
      audience: {
        isIn: {
          options: [tweetAudiences],
          errorMessage: TWEETS_MESSAGES.INVALID_AUDIENCE
        }
      },
      parent_id: {
        custom: {
          options: (value, { req }) => {
            //value la gia tri cua parent_id
            const type = req.body.type as TweetType
            if (type != TweetType.Tweet && !ObjectId.isValid(value)) {
              throw new Error(TWEETS_MESSAGES.PARENT_ID_MUST_BE_A_VALID_TWEET_ID)
            }
            //neu type la tweet thi parent_id phai la null
            if (type == TweetType.Tweet && value != null) {
              throw new Error(TWEETS_MESSAGES.PARENT_ID_MUST_BE_NULL)
            }
            return true
          }
        }
      },
      content: {
        isString: true,
        custom: {
          options: (value, { req }) => {
            const type = req.body.type as TweetType
            const mentions = req.body.mentions as string[]
            const hashtags = req.body.hashtags as string[]
            //khi type la retweet thi content == '', mentions == [], hashtags == []
            if (type != TweetType.Retweet && isEmpty(hashtags) && isEmpty(mentions) && value.trim() == '') {
              throw new Error(TWEETS_MESSAGES.CONTENT_MUST_BE_A_NON_EMPTY_STRING)
            }
            //neu type la retweet thi content == ''
            if (type == TweetType.Retweet && value.trim() !== '') {
              throw new Error(TWEETS_MESSAGES.CONTENT_MUST_BE_EMPTY_STRING)
            }
            return true
          }
        }
      },
      hashtags: {
        isArray: {
          errorMessage: TWEETS_MESSAGES.HASHTAGS_MUST_BE_AN_ARRAY
        },
        custom: {
          //value la hashtags la 1 mang string[]
          options: (value, { req }) => {
            //neu co thang item nao khong phai string thi throw error
            if (value.some((item: any) => typeof item != 'string')) {
              throw new Error(TWEETS_MESSAGES.HASHTAGS_MUST_BE_AN_ARRAY_OF_STRING)
            }
            return true
          }
        }
      },
      mentions: {
        isArray: true,
        custom: {
          //value la hashtags la 1 mang string[]
          options: (value, { req }) => {
            //neu co thang item nao khong phai string thi throw error
            if (value.some((item: any) => !ObjectId.isValid(item))) {
              throw new Error(TWEETS_MESSAGES.MENTIONS_MUST_BE_AN_ARRAY_OF_user_id)
            }
            return true
          }
        }
      },
      medias: {
        isArray: true,
        custom: {
          options: (value, { req }) => {
            if (
              value.some((item: any) => {
                return typeof item.url !== 'string' || !mediaTypes.includes(item.type)
              })
            ) {
              throw new Error(TWEETS_MESSAGES.MEDIAS_MUST_BE_AN_ARRAY_OF_MEDIA_OBJECT)
            }
            return true
          }
        }
      }
    },
    ['body']
  )
)
export const tweetIdValidator = validate(
  checkSchema(
    {
      tweet_id: {
        isMongoId: {
          errorMessage: TWEETS_MESSAGES.INVALID_TWEET_ID
        },
        custom: {
          options: async (value, { req }) => {
            const [tweet] = await databaseService.tweets
              .aggregate<Tweet>([
                {
                  $match: {
                    _id: new ObjectId(value)
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
                    bookmarks: { $size: '$bookmarks' },
                    likes: { $size: '$likes' },
                    retweet_count: {
                      $size: {
                        $filter: {
                          input: '$tweet_children',
                          as: 'item',
                          cond: { $eq: ['$$item.type', 1] }
                        }
                      }
                    },
                    comment_count: {
                      $size: {
                        $filter: {
                          input: '$tweet_children',
                          as: 'item',
                          cond: { $eq: ['$$item.type', 2] }
                        }
                      }
                    },
                    quote_count: {
                      $size: {
                        $filter: {
                          input: '$tweet_children',
                          as: 'item',
                          cond: { $eq: ['$$item.type', 3] }
                        }
                      }
                    },
                    views: {
                      $add: ['$user_views', '$guest_views']
                    }
                  }
                },
                { $project: { tweet_children: 0 } }
              ])
              .toArray()
            if (!tweet) {
              throw new ErrorWithStatus({
                status: HTTP_STATUS.NOT_FOUND,
                message: TWEETS_MESSAGES.TWEET_NOT_FOUND
              })
            }
            ;(req as Request).tweet = tweet
            return true
          }
        }
      }
    },
    ['params', 'body']
  )
)

// muốn dùng async await trong handler express thì nhớ try catch
// nếu không thì phải có hàm wrapAsync như bên dưới
export const tweetAudienceValidator = wrapAsync(async (req: Request, res: Response, next: NextFunction) => {
  const tweet = req.tweet as Tweet
  if (tweet.audience === TweetAudience.TwitterCircle) {
    // Kiểm tra người xem tweet này đã đăng nhập hay chưa
    if (!req.decoded_authorization) {
      throw new ErrorWithStatus({
        status: HTTP_STATUS.UNAUTHORIZED,
        message: USERS_MESSAGES.ACCESS_TOKEN_IS_REQUIRED
      })
    }
    // Lấy thông tin tác giả của tweet
    const author = await databaseService.users.findOne({
      _id: new ObjectId(tweet.user_id)
    })
    // Kiểm tra tài khoản tác giả có ổn (bị khóa hay bị xóa chưa) không
    if (!author || author.verify === UserVerifyStatus.Banned) {
      throw new ErrorWithStatus({
        status: HTTP_STATUS.NOT_FOUND,
        message: USERS_MESSAGES.USER_NOT_FOUND
      })
    }
    // Kiểm tra người xem tweet này có trong Twitter Circle của tác giả hay không
    const { user_id } = req.decoded_authorization
    const isInTwitterCircle = author.twitter_circle.some((user_circle_id) => user_circle_id.equals(user_id))
    // Nếu bạn không phải là tác giả và không nằm trong twitter circle thì quăng lỗi
    if (!author._id.equals(user_id) && !isInTwitterCircle) {
      throw new ErrorWithStatus({
        status: HTTP_STATUS.FORBIDDEN,
        message: TWEETS_MESSAGES.TWEET_IS_NOT_PUBLIC
      })
    }
  }
  next()
})
export const getTweetChildrenValidator = validate(
  checkSchema(
    {
      tweet_type: {
        isIn: {
          options: [tweetTypes],
          errorMessage: TWEETS_MESSAGES.INVALID_TYPE
        }
      }
    },
    ['query']
  )
)
export const paginationValidator = validate(
  checkSchema(
    {
      limit: {
        isNumeric: true,
        custom: {
          options: (value) => {
            if (Number(value) < 1 || Number(value) > 100) {
              throw new Error(TWEETS_MESSAGES.INVALID_LIMIT)
            }
            return true
          }
        }
      },
      page: {
        isNumeric: true
      }
    },
    ['query']
  )
)
