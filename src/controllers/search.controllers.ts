import { ParamsDictionary } from 'express-serve-static-core'
import { Request, Response } from 'express'
import { SearchQuery } from '~/models/requests/Search.requests'
import searchService from '~/services/search.services'
import { SEARCH_MESSAGES } from '~/constants/messages'
import { TokenPayload } from '~/models/requests/User.request'
export const searchController = async (req: Request<ParamsDictionary, any, any, SearchQuery>, res: Response) => {
  const limit = Number(req.query.limit)
  const page = Number(req.query.page)
  const result = await searchService.search({
    limit,
    content: req.query.content,
    page,
    user_id: (req.decoded_authorization as TokenPayload)?.user_id
  })
  res.json({
    message: SEARCH_MESSAGES.SEARCH_SUCCESSFULLY,
    result
  })
}
