import type { LinkKey } from '@neat-evolution/core'

import {
  type EmptyPayload,
  requestSetCPPNStateRedirect,
} from '../../actions.js'
import type { ReproducerHandlerContext } from '../ThreadContext.js'

export const setCPPNStateRedirect = (
  key: LinkKey,
  oldKey: LinkKey,
  context: ReproducerHandlerContext
): void => {
  // Use Handler's call method instead of manual promise tracking
  // Fire-and-forget pattern - we don't await the response
  void context.call<EmptyPayload>(
    requestSetCPPNStateRedirect({
      key,
      oldKey,
    })
  )
}
