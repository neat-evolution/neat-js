import type { LinkKey } from '@neat-evolution/core'

import {
  requestSetCPPNStateRedirect,
  type EmptyPayload,
} from '../../actions.js'
import type { ReproducerHandlerContext } from '../ThreadContext.js'

export const setCPPNStateRedirect = (
  key: LinkKey,
  oldKey: LinkKey,
  context: ReproducerHandlerContext
): void => {
  // Use Handler's request method instead of manual promise tracking
  // Fire-and-forget pattern - we don't await the response
  void context.request<EmptyPayload>(
    requestSetCPPNStateRedirect({
      key,
      oldKey,
    })
  )
}
