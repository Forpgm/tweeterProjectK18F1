import { SearchQuery } from '~/models/requests/Search.requests'
import databaseService from './database.services'

class SearchService {
  async search({ limit, content, page }: { limit: number; content: string; page: number }) {
    const data = databaseService.tweets
      .find({ $text: { $search: content } })
      .skip(limit * (page - 1))
      .toArray()
    return data
  }
}

const searchService = new SearchService()
export default searchService
