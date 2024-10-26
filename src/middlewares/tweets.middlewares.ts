import { checkSchema } from 'express-validator'
import { isEmpty } from 'lodash'
import { ObjectId } from 'mongodb'
import { MediaType, TweetAudience, TweetType } from '~/constants/enums'
import { TWEETS_MESSAGES } from '~/constants/messages'
import { numberEnumToArray } from '~/utils/common'
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
        isArray: true,
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
