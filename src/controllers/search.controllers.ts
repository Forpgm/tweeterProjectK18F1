import { ParamsDictionary } from 'express-serve-static-core'
import { Request, Response } from 'express'
import { SearchQuery } from '~/models/requests/Search.requests'
import searchService from '~/services/search.services'
import { SEARCH_MESSAGES } from '~/constants/messages'
export const searchController = async (req: Request<ParamsDictionary, any, any, SearchQuery>, res: Response) => {
  const limit = Number(req.query.limit)
  const page = Number(req.query.page)
  const result = await searchService.search({ limit, content: req.query.content, page })
  res.json({
    message: SEARCH_MESSAGES.SEARCH_SUCCESSFULLY,
    result
  })
}
